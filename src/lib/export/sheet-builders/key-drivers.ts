import type ExcelJS from 'exceljs'
import type { SheetBuilder } from './types'
import type { ExportableState } from '@/lib/export/export-xlsx'
import {
  writeScalarsForSheet,
  writeArraysForSheet,
} from '@/lib/export/export-xlsx'
import { FA_CATALOG } from '@/data/catalogs/fixed-asset-catalog'
import { computeProjectionYears } from '@/lib/calculations/year-helpers'
import { resolveLabel } from './label-writer'

const SHEET_NAME = 'KEY DRIVERS'

/** First row for the Additional Capex section on KEY DRIVERS template. */
const CAPEX_ROW_START = 33
/** Last row of the original 4-row template block (land/building/equip/lainnya). */
const CAPEX_TEMPLATE_LAST_ROW = 36
/** Columns reserved for projection years (up to 7 supported; system uses 3). */
const CAPEX_YEAR_COLUMNS: readonly string[] = ['D', 'E', 'F', 'G', 'H', 'I', 'J']

/**
 * Session 040 — Dynamic Additional Capex per FA account injection.
 *
 * Session 036 migrated from fixed 4-row additionalCapex (land/building/
 * equipment/others) → dynamic `additionalCapexByAccount` keyed by FA
 * excelRow. The cell-mapping entries for the old rows were removed but
 * no dynamic injector was built, so user input silently vanished at
 * export time. This helper closes that gap.
 *
 * Layout: each user FA account becomes a row starting at row 33, in the
 * order present in `fixedAsset.accounts`. Label at col B; projection-year
 * values at cols D onward (one column per projection year).
 *
 * Pre-write clear: the prototipe template has residual labels at B33-B36
 * (Tanah/Bangunan/Peralatan/Lainnya). We clear B+D..J for the range
 * max(CAPEX_TEMPLATE_LAST_ROW, CAPEX_ROW_START + accounts.length - 1)
 * so unused template rows don't bleed through when the user has fewer
 * than 4 accounts.
 *
 * Gating: requires home (for projYears), fixedAsset (for account list),
 * and keyDrivers (for data). If any is absent, the injection is a no-op
 * and the template residue stays — consistent with isPopulated semantics.
 */
function injectAdditionalCapexByAccount(
  workbook: ExcelJS.Workbook,
  state: ExportableState,
): void {
  if (!state.home || !state.fixedAsset || !state.keyDrivers) return
  const ws = workbook.getWorksheet(SHEET_NAME)
  if (!ws) return

  const { accounts, language: faLang } = state.fixedAsset
  const { additionalCapexByAccount } = state.keyDrivers
  const projYears = computeProjectionYears(state.home.tahunTransaksi)

  // When the user hasn't populated FA accounts yet, do not touch the
  // template residue at rows 33-36. This keeps Phase C parity for the
  // pt-raja-voltama fixture (whose FA accounts array is empty) and
  // prevents a surprising "export lost my Excel template" for users
  // mid-way through populating the app. Once the user adds at least
  // one FA account, the injector takes over and clears residue beyond
  // the user's account count.
  if (accounts.length === 0) return

  // Clear all cells we might write AND any prototipe-template residue rows
  // beyond the user's account count.
  const lastClearRow = Math.max(
    CAPEX_TEMPLATE_LAST_ROW,
    CAPEX_ROW_START + accounts.length - 1,
  )
  for (let row = CAPEX_ROW_START; row <= lastClearRow; row++) {
    ws.getCell(`B${row}`).value = null
    for (const col of CAPEX_YEAR_COLUMNS) {
      ws.getCell(`${col}${row}`).value = null
    }
  }

  // Write per-account row: label + projection-year values.
  accounts.forEach((acct, slotIndex) => {
    const row = CAPEX_ROW_START + slotIndex
    ws.getCell(`B${row}`).value = resolveLabel(acct, FA_CATALOG, faLang)
    const series = additionalCapexByAccount[acct.excelRow] ?? {}
    projYears.forEach((year, yearIdx) => {
      const col = CAPEX_YEAR_COLUMNS[yearIdx]
      if (col === undefined) return
      const val = series[year]
      if (val !== undefined && val !== null && Number.isFinite(val)) {
        ws.getCell(`${col}${row}`).value = val
      }
    })
  })
}

/**
 * KeyDriversBuilder — state-driven KEY DRIVERS sheet owner.
 *
 * build() writes:
 *   1. All scalars with excelSheet === 'KEY DRIVERS'
 *      (9 entries covering financial + operational drivers)
 *   2. All array mappings with excelSheet === 'KEY DRIVERS'
 *      (12 entries: sales increments, projected ratios E-J, working
 *       capital days D-J, additional capex D-J)
 *
 * The synthetic `_cogsRatioProjected` / `_sellingExpenseRatioProjected`
 * / `_gaExpenseRatioProjected` array fields are handled by
 * writeArraysForSheet → writeArrayMapping, which expands the underlying
 * scalar ratio into a fixed-length array for columns E-J.
 *
 * Upstream: `['keyDrivers']`. Orchestrator clears the sheet when
 * state.keyDrivers is null.
 */
export const KeyDriversBuilder: SheetBuilder = {
  sheetName: SHEET_NAME,
  upstream: ['keyDrivers'],
  build(workbook, state) {
    writeScalarsForSheet(workbook, state, SHEET_NAME)
    writeArraysForSheet(workbook, state, SHEET_NAME)
    injectAdditionalCapexByAccount(workbook, state)
  },
}

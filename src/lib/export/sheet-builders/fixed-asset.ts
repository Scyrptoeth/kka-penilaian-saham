import type ExcelJS from 'exceljs'
import type { SheetBuilder } from './types'
import type { ExportableState } from '@/lib/export/export-xlsx'
import {
  injectExtendedFaAccounts,
  extendFaSectionSubtotals,
} from '@/lib/export/export-xlsx'
import { ALL_GRID_MAPPINGS } from '@/lib/export/cell-mapping'
import { isOriginalFaRow, FA_LEGACY_OFFSET } from '@/data/catalogs/fixed-asset-catalog'
import type { FaAccountEntry } from '@/data/catalogs/fixed-asset-catalog'
import { writeFaLabels, resolveLabel } from './label-writer'
import { FA_CATALOG } from '@/data/catalogs/fixed-asset-catalog'

const SHEET_NAME = 'FIXED ASSET'

function writeFaLeafValues(ws: ExcelJS.Worksheet, state: ExportableState): void {
  const grid = ALL_GRID_MAPPINGS.find((g) => g.excelSheet === SHEET_NAME)
  if (!grid) return
  const slice = state.fixedAsset
  if (!slice) return

  for (const row of grid.leafRows) {
    const yearValues = slice.rows[row]
    if (!yearValues) continue
    for (const [yearStr, col] of Object.entries(grid.yearColumns)) {
      const val = yearValues[Number(yearStr)]
      if (val !== undefined && val !== null) {
        ws.getCell(`${col}${row}`).value = val
      }
    }
  }
}

/**
 * FA baseline labels repeat across 4 bands in the template:
 *   Row X        — Acquisition Beginning
 *   Row X + 9    — Acquisition Additions
 *   Row X + 28   — Depreciation Beginning
 *   Row X + 37   — Depreciation Additions
 *
 * When the user renames an account (e.g. 'Land' → 'Tanah HQ Jakarta'),
 * all 4 band labels must update — otherwise the export shows half
 * custom / half prototipe labels. This helper writes the resolved label
 * to all 4 band positions per account for baseline rows (excelRow 8-13).
 *
 * Extended accounts (excelRow ≥ 100) have their labels written across
 * all 7 bands by `injectExtendedFaAccounts` (Session 028 η-approach).
 */
function writeFaBaselineLabelsAllBands(
  ws: ExcelJS.Worksheet,
  accounts: readonly FaAccountEntry[],
  language: 'en' | 'id',
): void {
  const offsets = [0, ...Object.values(FA_LEGACY_OFFSET)] as const
  for (const acc of accounts) {
    if (!isOriginalFaRow(acc.excelRow)) continue
    const label = resolveLabel(acc, FA_CATALOG, language)
    for (const offset of offsets) {
      ws.getCell(`B${acc.excelRow + offset}`).value = label
    }
  }
}

/**
 * FixedAssetBuilder — state-driven replacement for the legacy FA branch.
 *
 * build() composes:
 *   1. writeFaLeafValues             — value cells across 4 baseline bands
 *   2. injectExtendedFaAccounts      — 7-band mirror for extended accounts
 *   3. extendFaSectionSubtotals      — `+SUM(extendedRange)` on 7 subtotals
 *   4. writeFaLabels                 — labels at base excelRow in col B
 *   5. writeFaBaselineLabelsAllBands — mirror baseline labels to bands 2/3/4
 *
 * Band 2/3/4 label mirroring is FA-specific; baseline rows 8-13 appear
 * four times across the sheet and must all reflect user rename.
 * (Extended accounts at excelRow ≥ 100 already get all-band label writes
 * via `injectExtendedFaAccounts`.)
 */
export const FixedAssetBuilder: SheetBuilder = {
  sheetName: SHEET_NAME,
  upstream: ['fixedAsset'],
  build(workbook, state) {
    const ws = workbook.getWorksheet(SHEET_NAME)
    if (!ws) return
    const fa = state.fixedAsset
    if (!fa) return

    writeFaLeafValues(ws, state)
    injectExtendedFaAccounts(workbook, state)
    extendFaSectionSubtotals(workbook, state)
    writeFaLabels(ws, fa.accounts, fa.language) // row X col B
    writeFaBaselineLabelsAllBands(ws, fa.accounts, fa.language) // bands 2/3/4
  },
}

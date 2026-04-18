import type { SheetBuilder } from './types'
import { computeFullProjectionPipeline } from '@/lib/calculations/projection-pipeline'
import { FA_OFFSET, FA_SUBTOTAL, isOriginalFaRow } from '@/data/catalogs/fixed-asset-catalog'

const SHEET_NAME = 'PROY FIXED ASSETS'

/**
 * Session 036 — Offset key → Proy FA template row mapping for original
 * FA accounts (excelRow 8-13). Extended (100+) + custom (1000+) accounts
 * have no template slot; defer to extended injection in future session.
 *
 * For original account R in [8..13]:
 *   R + 0    (Acq Beg)  → R            (e.g. 8 → 8)
 *   R + 2000 (Acq Add)  → R + 9        (e.g. 2008 → 17)
 *   R + 3000 (Acq End)  → R + 18       (e.g. 3008 → 26)
 *   R + 4000 (Dep Beg)  → R + 28       (e.g. 4008 → 36)
 *   R + 5000 (Dep Add)  → R + 37       (e.g. 5008 → 45)
 *   R + 6000 (Dep End)  → R + 46       (e.g. 6008 → 54)
 *   R + 7000 (Net Val)  → R + 55       (e.g. 7008 → 63)
 */
const FA_OFFSET_TO_TEMPLATE_DELTA: Record<number, number> = {
  [FA_OFFSET.ACQ_BEGINNING]: 0,
  [FA_OFFSET.ACQ_ADDITIONS]: 9,
  [FA_OFFSET.ACQ_ENDING]: 18,
  [FA_OFFSET.DEP_BEGINNING]: 28,
  [FA_OFFSET.DEP_ADDITIONS]: 37,
  [FA_OFFSET.DEP_ENDING]: 46,
  [FA_OFFSET.NET_VALUE]: 55,
}

const FA_SUBTOTAL_ROWS = new Set<number>(Object.values(FA_SUBTOTAL))

/**
 * Translate a computeProyFixedAssetsLive output row key to the
 * Proy FA template row. Returns null if no mapping (extended account,
 * custom account, or unknown key).
 */
function translateFaKey(key: number): number | null {
  // Subtotal rows write directly at their numeric key
  if (FA_SUBTOTAL_ROWS.has(key)) return key
  // Original accounts: find matching offset
  for (const [offsetStr, delta] of Object.entries(FA_OFFSET_TO_TEMPLATE_DELTA)) {
    const offset = Number(offsetStr)
    const base = key - offset
    if (isOriginalFaRow(base)) {
      return base + delta
    }
  }
  return null
}

/**
 * ProyFaBuilder — state-driven PROY FIXED ASSETS sheet owner.
 *
 * Session 036: translates per-account offset-keyed output from
 * computeProyFixedAssetsLive to the PT Raja Voltama prototipe template
 * rows (for original FA accounts 8-13). Extended + custom accounts are
 * silently skipped (defer to extended injection in future session).
 *
 * Layout:
 *   Column C = lastHistYear
 *   Columns D, E, F = projYears[0..2]
 *   Subtotals (14/23/32/42/51/60/69) written directly at their numeric keys.
 */
export const ProyFaBuilder: SheetBuilder = {
  sheetName: SHEET_NAME,
  upstream: ['home', 'balanceSheet', 'incomeStatement', 'fixedAsset', 'keyDrivers'],
  build(workbook, state) {
    const ws = workbook.getWorksheet(SHEET_NAME)
    if (
      !ws ||
      !state.home ||
      !state.balanceSheet ||
      !state.incomeStatement ||
      !state.fixedAsset ||
      !state.keyDrivers
    ) {
      return
    }

    const pipeline = computeFullProjectionPipeline({
      home: state.home,
      balanceSheet: state.balanceSheet,
      incomeStatement: state.incomeStatement,
      fixedAsset: state.fixedAsset,
      keyDrivers: state.keyDrivers,
      changesInWorkingCapital: state.changesInWorkingCapital,
    })

    const { proyFaRows, lastHistYear, projYears } = pipeline

    const cols: Array<[string, number]> = [
      ['C', lastHistYear],
      ['D', projYears[0] ?? 0],
      ['E', projYears[1] ?? 0],
      ['F', projYears[2] ?? 0],
    ]

    for (const [col, year] of cols) {
      if (!year) continue
      // Iterate every computed key; translate to template row where possible.
      for (const keyStr of Object.keys(proyFaRows)) {
        const key = Number(keyStr)
        const templateRow = translateFaKey(key)
        if (templateRow === null) continue
        const val = proyFaRows[key]?.[year]
        if (val !== undefined && Number.isFinite(val)) {
          ws.getCell(`${col}${templateRow}`).value = val
        }
      }
    }
  },
}

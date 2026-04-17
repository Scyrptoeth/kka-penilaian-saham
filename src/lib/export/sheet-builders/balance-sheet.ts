import type ExcelJS from 'exceljs'
import type { SheetBuilder } from './types'
import type { ExportableState } from '@/lib/export/export-xlsx'
import {
  injectBsCrossRefValues,
  injectExtendedBsAccounts,
  extendBsSectionSubtotals,
} from '@/lib/export/export-xlsx'
import { ALL_GRID_MAPPINGS } from '@/lib/export/cell-mapping'
import { writeBsLabels } from './label-writer'

const SHEET_NAME = 'BALANCE SHEET'

/**
 * Write leaf-row year values for a single sheet using its grid mapping.
 * Mirrors the inner loop of `injectGridCells` but scoped to one sheet —
 * enables a builder to populate its own sheet without iterating all grids.
 */
function writeBsLeafValues(
  ws: ExcelJS.Worksheet,
  state: ExportableState,
): void {
  const grid = ALL_GRID_MAPPINGS.find((g) => g.excelSheet === SHEET_NAME)
  if (!grid) return
  const slice = state.balanceSheet
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
 * BalanceSheetBuilder — state-driven replacement for the legacy BS branch
 * of `exportToXlsx`. Called by the SHEET_BUILDERS orchestrator when
 * `balanceSheet` slice is populated; otherwise the orchestrator clears the
 * sheet via `clearSheetCompletely`.
 *
 * build() composes:
 *   1. writeBsLeafValues   — year values for leaf rows (C8/D8/.../F49)
 *   2. injectBsCrossRefValues — FA-sourced rows 20/21 (Fixed Asset Net pieces)
 *   3. injectExtendedBsAccounts + extendBsSectionSubtotals — synthetic
 *      rows 100+ for catalog-extended or user-custom accounts
 *   4. writeBsLabels        — language-aware col B labels from the account
 *      list, overwriting any residual prototipe labels from the template
 *
 * Order matters for labels: extended injector writes its own labelEn at
 * col B for rows ≥ 100 FIRST, then writeBsLabels runs over the whole
 * accounts array including extended ones — applying customLabel +
 * labelId preferences consistently. Net effect: extended account labels
 * honor customLabel / state.language, same as baseline rows.
 */
export const BalanceSheetBuilder: SheetBuilder = {
  sheetName: SHEET_NAME,
  upstream: ['balanceSheet'],
  build(workbook, state) {
    const ws = workbook.getWorksheet(SHEET_NAME)
    if (!ws) return
    const bs = state.balanceSheet
    if (!bs) return

    writeBsLeafValues(ws, state)
    injectBsCrossRefValues(workbook, state)
    injectExtendedBsAccounts(workbook, state)
    extendBsSectionSubtotals(workbook, state)
    writeBsLabels(ws, bs.accounts, bs.language)
  },
}

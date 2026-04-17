import type ExcelJS from 'exceljs'
import type { SheetBuilder } from './types'
import type { ExportableState } from '@/lib/export/export-xlsx'
import {
  injectExtendedIsAccounts,
  replaceIsSectionSentinels,
} from '@/lib/export/export-xlsx'
import { ALL_GRID_MAPPINGS } from '@/lib/export/cell-mapping'
import { writeIsLabels } from './label-writer'

const SHEET_NAME = 'INCOME STATEMENT'

function writeIsLeafValues(ws: ExcelJS.Worksheet, state: ExportableState): void {
  const grid = ALL_GRID_MAPPINGS.find((g) => g.excelSheet === SHEET_NAME)
  if (!grid) return
  const slice = state.incomeStatement
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
 * IncomeStatementBuilder — state-driven replacement for the legacy IS
 * branch of `exportToXlsx`.
 *
 * build() composes:
 *   1. writeIsLeafValues     — year values for mapped rows (sentinel +
 *                              extended); sentinel pre-computed values
 *                              come via `grid.leafRows` map
 *   2. injectExtendedIsAccounts — synthetic rows 100+, 200+, 300+, 400+,
 *                                 500+ per catalog section
 *   3. replaceIsSectionSentinels — overwrite sentinel cells D6/D7/D15/D30
 *                                  with live =SUM(extendedRange) formulas
 *   4. writeIsLabels           — language-aware col B labels
 *
 * Net-interest section (rows 500-519) keeps its hardcoded D26/D27
 * sentinels per LESSON-077 — mixed-sign section can't use SUM range.
 */
export const IncomeStatementBuilder: SheetBuilder = {
  sheetName: SHEET_NAME,
  upstream: ['incomeStatement'],
  build(workbook, state) {
    const ws = workbook.getWorksheet(SHEET_NAME)
    if (!ws) return
    const is = state.incomeStatement
    if (!is) return

    writeIsLeafValues(ws, state)
    injectExtendedIsAccounts(workbook, state)
    replaceIsSectionSentinels(workbook, state)
    writeIsLabels(ws, is.accounts, is.language)
  },
}

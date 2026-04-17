import type { SheetBuilder } from './types'
import { writeGridForSheet } from '@/lib/export/export-xlsx'

const SHEET_NAME = 'ACC PAYABLES'

/**
 * AccPayablesBuilder — state-driven ACC PAYABLES sheet owner.
 *
 * build() writes the 6 leaf rows (Addition, Repayment, Interest × ST/LT
 * blocks) across 3 historical-year columns via `writeGridForSheet`.
 * Beginning (rows 9, 18) + Ending (rows 12, 21) are template formulas
 * that self-compute from the leaves — NOT in `leafRows`, NOT written
 * here, NOT overwritten.
 *
 * Upstream: `['accPayables']`. Session 032 adds the slice to
 * ExportableState; previously AccPayables data never reached export.
 * When state.accPayables is null the orchestrator clears the sheet.
 */
export const AccPayablesBuilder: SheetBuilder = {
  sheetName: SHEET_NAME,
  upstream: ['accPayables'],
  build(workbook, state) {
    writeGridForSheet(workbook, state, SHEET_NAME)
  },
}

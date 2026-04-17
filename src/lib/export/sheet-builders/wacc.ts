import type { SheetBuilder } from './types'
import {
  writeScalarsFromSlice,
  writeDynamicRowsForSheet,
} from '@/lib/export/export-xlsx'

const SHEET_NAME = 'WACC'

/**
 * WaccBuilder — state-driven WACC sheet owner.
 *
 * build() composes:
 *   1. writeScalarsFromSlice('wacc') — writes EVERY scalar mapping
 *      whose storeSlice === 'wacc', regardless of destination sheet.
 *      Covers WACC!B4/B5/B6/E22 AND the cross-sheet entry
 *      INCOME STATEMENT!B33 that WACC Hamada equation formulas
 *      depend on.
 *   2. writeDynamicRowsForSheet — comparableCompanies (row 11+) +
 *      bankRates (row 27+) on the WACC sheet.
 *
 * Session 031 regression fix: before this builder, once IS migrated
 * to IncomeStatementBuilder, destination-filtered scalar writes dropped
 * INCOME STATEMENT-destination entries, which included wacc.taxRate →
 * IS!B33 (source is 'wacc', destination sheet is 'INCOME STATEMENT').
 * IncomeStatementBuilder can't own this write — its upstream is only
 * ['incomeStatement'], not ['wacc']. WaccBuilder resolves the gap via
 * `writeScalarsFromSlice('wacc')` — source-slice owns all writes
 * regardless of destination sheet (LESSON-091).
 *
 * Fix: source-slice owns all writes. WaccBuilder iterates by
 * storeSlice instead of excelSheet for scalars — this naturally
 * covers cross-sheet writes.
 *
 * Registry order: MUST run AFTER IncomeStatementBuilder so the IS!B33
 * write survives. IncomeStatementBuilder.writeIsLabels may write a
 * label to B33 (if user has an IS account at excelRow=33). WaccBuilder
 * running later overwrites that label with the tax rate number,
 * matching the template's legacy expectation.
 *
 * Upstream: `['wacc']`. When state.wacc is null the orchestrator
 * clears the WACC sheet. IS!B33 is NOT explicitly cleared here
 * because that would stomp on IncomeStatementBuilder's label write.
 * Orchestrator-level clear of WACC sheet is sufficient for the
 * "no prototipe leakage" guarantee on the WACC sheet itself.
 */
export const WaccBuilder: SheetBuilder = {
  sheetName: SHEET_NAME,
  upstream: ['wacc'],
  build(workbook, state) {
    writeScalarsFromSlice(workbook, state, 'wacc')
    writeDynamicRowsForSheet(workbook, state, SHEET_NAME)
  },
}

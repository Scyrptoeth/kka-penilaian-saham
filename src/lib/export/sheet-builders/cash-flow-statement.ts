import type { SheetBuilder } from './types'
import { computeCashFlowLiveRows } from '@/data/live/compute-cash-flow-live'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { CASH_FLOW_STATEMENT_MANIFEST } from '@/data/manifests/cash-flow-statement'
import { writeComputedRowsToSheet } from './computed-writer'

const SHEET_NAME = 'CASH FLOW STATEMENT'

/**
 * CashFlowStatementBuilder — state-driven CFS sheet owner.
 *
 * build() composes:
 *   1. computeHistoricalYears(home.tahunTransaksi, 3) — CFS 3-year span
 *   2. computeHistoricalYears(home.tahunTransaksi, 4) — BS 4-year span
 *      (CFS year-1 delta needs BS prior-year value)
 *   3. computeCashFlowLiveRows(bs, is, fa?, ap?, cfsYears, bsYears) —
 *      pre-signed leaf rows: 5 EBITDA, 6 Tax, 8 ΔCA, 9 ΔCL, 13 Non-Op,
 *      17 CapEx, 22 Equity, 23 New Loan, 24 Int Pay, 25 Int Inc,
 *      26 Princ Repay, 32 Cash Begin, 33 Cash End, 35 Bank, 36 Cash
 *   4. deriveComputedRows — subtotals 10/11/19/28/30 via computedFrom
 *   5. writeComputedRowsToSheet — writes all rows at C/D/E
 *
 * Upstream: ['home', 'balanceSheet', 'incomeStatement']. FA + AP are
 * optional — compute-live returns zero CapEx / zero financing when null.
 */
export const CashFlowStatementBuilder: SheetBuilder = {
  sheetName: SHEET_NAME,
  upstream: ['home', 'balanceSheet', 'incomeStatement'],
  build(workbook, state) {
    const ws = workbook.getWorksheet(SHEET_NAME)
    if (!ws || !state.home || !state.balanceSheet || !state.incomeStatement) return

    const cfsYears = computeHistoricalYears(
      state.home.tahunTransaksi,
      CASH_FLOW_STATEMENT_MANIFEST.historicalYearCount ?? 3,
    )
    const bsYears = computeHistoricalYears(state.home.tahunTransaksi, 4)

    const leaves = computeCashFlowLiveRows(
      state.balanceSheet.rows,
      state.incomeStatement.rows,
      state.fixedAsset?.rows ?? null,
      state.accPayables?.rows ?? null,
      cfsYears,
      bsYears,
    )
    const comp = deriveComputedRows(
      CASH_FLOW_STATEMENT_MANIFEST.rows,
      leaves,
      cfsYears,
    )
    const allRows = { ...leaves, ...comp }

    writeComputedRowsToSheet(ws, CASH_FLOW_STATEMENT_MANIFEST, allRows, cfsYears)
  },
}

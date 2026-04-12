/**
 * Compute Financial Ratio live-mode rows from Balance Sheet and Income
 * Statement user input. Direct formulas per the Session 011 plan
 * (Approach B) — no adapter chain, no calc-engine indirection, just
 * the same expressions the workbook uses expressed against
 * user-positive store values.
 *
 * Fourteen ratios are fully computable from BS + IS alone:
 *   PROFITABILITY (6): rows 6–11
 *   LIQUIDITY (3):    rows 14–16
 *   LEVERAGE (5):     rows 19–23
 *
 * Four cash-flow ratios require Cash Flow Statement / FCF data, which
 * depends on Fixed Asset + Acc Payables input that lands in Session 012.
 * Until then those rows are pinned to 0 and the page wrapper renders a
 * footer note explaining why. Zero is consistent with the seed-mode
 * IFERROR behavior that returns 0 on missing denominators, so the user
 * sees a legitimate placeholder rather than a crash or a dash.
 *
 * BS + IS subtotal/total rows are resolved by running
 * `deriveComputedRows` over their respective manifests once, then read
 * through a shared leaf-or-computed lookup helper.
 */

import type { YearKeyedSeries } from '@/types/financial'
import { BALANCE_SHEET_MANIFEST } from '@/data/manifests/balance-sheet'
import { INCOME_STATEMENT_MANIFEST } from '@/data/manifests/income-statement'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'

function safeDiv(numerator: number, denominator: number): number {
  if (denominator === 0) return 0
  return numerator / denominator
}

export function computeFinancialRatioLiveRows(
  bsLeafRows: Record<number, YearKeyedSeries>,
  isLeafRows: Record<number, YearKeyedSeries>,
  years: readonly number[],
): Record<number, YearKeyedSeries> {
  const bsComputed = deriveComputedRows(
    BALANCE_SHEET_MANIFEST.rows,
    bsLeafRows,
    years,
  )
  const isComputed = deriveComputedRows(
    INCOME_STATEMENT_MANIFEST.rows,
    isLeafRows,
    years,
  )

  const readBs = (row: number, year: number): number =>
    bsLeafRows[row]?.[year] ?? bsComputed[row]?.[year] ?? 0
  const readIs = (row: number, year: number): number =>
    isLeafRows[row]?.[year] ?? isComputed[row]?.[year] ?? 0

  const out: Record<number, YearKeyedSeries> = {}
  const write = (row: number, compute: (year: number) => number) => {
    const series: YearKeyedSeries = {}
    for (const year of years) series[year] = compute(year)
    out[row] = series
  }

  // PROFITABILITY — line / Revenue (IS row 6) or Net Profit / denominator
  write(6, (y) => safeDiv(readIs(8, y), readIs(6, y))) // Gross Profit Margin
  write(7, (y) => safeDiv(readIs(18, y), readIs(6, y))) // EBITDA Margin
  write(8, (y) => safeDiv(readIs(22, y), readIs(6, y))) // EBIT Margin
  write(9, (y) => safeDiv(readIs(35, y), readIs(6, y))) // Net Profit Margin
  write(10, (y) => safeDiv(readIs(35, y), readBs(27, y))) // ROA
  write(11, (y) => safeDiv(readIs(35, y), readBs(49, y))) // ROE

  // LIQUIDITY — against Total Current Liabilities (BS row 35)
  write(14, (y) => safeDiv(readBs(16, y), readBs(35, y))) // Current Ratio
  // Quick = (Cash + Bank + Receivables) / Current Liab — BS rows 8, 9, 10
  write(15, (y) =>
    safeDiv(readBs(8, y) + readBs(9, y) + readBs(10, y), readBs(35, y)),
  )
  // Cash = (Cash + Bank) / Current Liab — BS rows 8, 9
  write(16, (y) => safeDiv(readBs(8, y) + readBs(9, y), readBs(35, y)))

  // LEVERAGE
  write(19, (y) =>
    safeDiv(readBs(35, y) + readBs(40, y), readBs(27, y)),
  ) // Debt to Assets
  write(20, (y) =>
    safeDiv(readBs(35, y) + readBs(40, y), readBs(49, y)),
  ) // Debt to Equity
  write(21, (y) =>
    safeDiv(readBs(38, y), readBs(38, y) + readBs(49, y)),
  ) // Capitalization
  write(22, (y) => Math.abs(safeDiv(readIs(22, y), readIs(27, y)))) // Interest Coverage
  write(23, (y) => safeDiv(readBs(49, y), readBs(27, y))) // Equity to Assets

  // CASH FLOW — pinned to 0 until Session 012 ships FA + Acc Payables.
  write(26, () => 0)
  write(27, () => 0)
  write(28, () => 0)
  write(30, () => 0)

  return out
}

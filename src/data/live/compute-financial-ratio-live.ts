/**
 * Compute Financial Ratio live-mode rows from upstream data.
 *
 * Eighteen ratios across four sections:
 *   PROFITABILITY (6): rows 6–11   — from BS + IS
 *   LIQUIDITY (3):    rows 14–16   — from BS
 *   LEVERAGE (5):     rows 19–23   — from BS + IS
 *   CASH FLOW (4):    rows 26–30   — from CFS + BS + FCF
 *
 * CFS data is optional: when null, CF ratios default to 0. When
 * provided, rows 26 (CFO/Sales), 28 (Short Term Debt Coverage), and
 * 30 (Capex Coverage) are computed. Row 27 (FCF/CFO) additionally
 * requires FCF data — pinned to 0 when fcfRows is null.
 *
 * BS + IS subtotal/total rows are resolved by running
 * `deriveComputedRows` over their respective manifests once.
 */

import type { YearKeyedSeries } from '@/types/financial'
import { BALANCE_SHEET_MANIFEST } from '@/data/manifests/balance-sheet'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'

function safeDiv(numerator: number, denominator: number): number {
  if (denominator === 0 || numerator === 0) return 0
  return numerator / denominator
}

export function computeFinancialRatioLiveRows(
  bsLeafRows: Record<number, YearKeyedSeries>,
  isLeafRows: Record<number, YearKeyedSeries>,
  years: readonly number[],
  cfsRows?: Record<number, YearKeyedSeries> | null,
  fcfRows?: Record<number, YearKeyedSeries> | null,
): Record<number, YearKeyedSeries> {
  const bsComputed = deriveComputedRows(
    BALANCE_SHEET_MANIFEST.rows,
    bsLeafRows,
    years,
  )
  // IS store now contains pre-computed sentinel values — read directly.
  const readBs = (row: number, year: number): number =>
    bsLeafRows[row]?.[year] ?? bsComputed[row]?.[year] ?? 0
  const readIs = (row: number, year: number): number =>
    isLeafRows[row]?.[year] ?? 0

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

  // CASH FLOW INDICATORS — need CFS (+ FCF for row 27)
  const readCfs = (row: number, year: number): number =>
    cfsRows?.[row]?.[year] ?? 0

  // Row 26: Operating CF/Sales = CFS row 11 / IS Revenue (row 6)
  write(26, (y) => safeDiv(readCfs(11, y), readIs(6, y)))
  // Row 27: FCF/Operating CF = FCF row 20 / CFS row 11
  // Needs FCF data (Task 4) — pinned to 0 when unavailable
  write(27, (y) => safeDiv(fcfRows?.[20]?.[y] ?? 0, readCfs(11, y)))
  // Row 28: Short Term Debt Coverage = CFS row 11 / BS row 31 (Bank Loan ST)
  write(28, (y) => safeDiv(readCfs(11, y), readBs(31, y)))
  // Row 30: Capex Coverage = |CFS row 11 / CFS row 17|
  write(30, (y) => Math.abs(safeDiv(readCfs(11, y), readCfs(17, y))))

  return out
}

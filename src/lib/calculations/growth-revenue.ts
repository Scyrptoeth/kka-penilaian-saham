/**
 * Growth Revenue — YoY growth for Sales and Net Income.
 *
 * Mirrors the company section of the `GROWTH REVENUE` worksheet of
 * kka-penilaian-saham.xlsx. Given N years of raw data (typically 4), produces
 * N−1 year-over-year growth rates.
 *
 *   growth[i] = IF(prev == 0, 0, (current − prev) / prev)
 *
 * This matches Excel's IF guard and is equivalent to the `yoyChangeSafe`
 * helper (both treat zero-previous as 0 rather than throwing).
 */

import { yoyChangeSafe } from './helpers'

export interface GrowthRevenueInput {
  sales: readonly number[]
  netIncome: readonly number[]
}

export interface GrowthRevenueResult {
  salesGrowth: number[]
  netIncomeGrowth: number[]
}

function yoySeries(series: readonly number[]): number[] {
  const n = series.length
  if (n < 2) return []
  const out: number[] = new Array(n - 1)
  for (let i = 1; i < n; i++) {
    out[i - 1] = yoyChangeSafe(series[i], series[i - 1])
  }
  return out
}

export function computeGrowthRevenue(
  input: GrowthRevenueInput,
): GrowthRevenueResult {
  if (input.sales.length !== input.netIncome.length) {
    throw new RangeError(
      `growth-revenue: sales and netIncome must be the same length ` +
        `(got ${input.sales.length} vs ${input.netIncome.length})`,
    )
  }
  if (input.sales.length < 2) {
    throw new RangeError(
      'growth-revenue: need at least 2 years of data to compute growth',
    )
  }

  return {
    salesGrowth: yoySeries(input.sales),
    netIncomeGrowth: yoySeries(input.netIncome),
  }
}

/**
 * Growth Revenue — YoY growth for Sales and Net Income.
 *
 * Mirrors the company section of the `GROWTH REVENUE` worksheet of
 * kka-penilaian-saham.xlsx. Given N years of raw data (typically 4),
 * produces a YearKeyedSeries of N−1 growth rates keyed by the *current*
 * year of each YoY pair.
 *
 *   Input: { 2018: 1000, 2019: 1500, 2020: 1800, 2021: 2200 }
 *   Output: { 2019: 0.50, 2020: 0.20, 2021: 0.2222... }
 *
 *   growth[current] = IF(prev == 0, 0, (current − prev) / prev)
 *
 * This matches Excel's IF guard and is equivalent to the `yoyChangeSafe`
 * helper.
 */

import type { YearKeyedSeries } from '@/types/financial'
import { assertSameYears, yearsOf, yoyChangeSafe } from './helpers'

export interface GrowthRevenueInput {
  sales: YearKeyedSeries
  netIncome: YearKeyedSeries
}

export interface GrowthRevenueResult {
  salesGrowth: YearKeyedSeries
  netIncomeGrowth: YearKeyedSeries
}

function yoySeries(series: YearKeyedSeries): YearKeyedSeries {
  const years = yearsOf(series)
  const out: YearKeyedSeries = {}
  for (let i = 1; i < years.length; i++) {
    const current = years[i]
    const prev = years[i - 1]
    out[current] = yoyChangeSafe(series[current], series[prev])
  }
  return out
}

export function computeGrowthRevenue(
  input: GrowthRevenueInput,
): GrowthRevenueResult {
  const anchor = input.sales
  const years = yearsOf(anchor)
  if (years.length < 2) {
    throw new RangeError(
      'growth-revenue: need at least 2 years of data to compute growth',
    )
  }
  assertSameYears('growth-revenue.netIncome', anchor, input.netIncome)

  return {
    salesGrowth: yoySeries(input.sales),
    netIncomeGrowth: yoySeries(input.netIncome),
  }
}

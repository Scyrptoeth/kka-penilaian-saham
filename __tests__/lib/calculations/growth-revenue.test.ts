/**
 * Growth Revenue tests — validated against `GROWTH REVENUE` fixture.
 *
 * Company section:
 *   Row 7  Uraian      B=2018 C=2019 D=2020 E=2021
 *   Row 8  Penjualan   (sales)
 *   Row 9  Laba Bersih (net income)
 *   Growth columns H/I/J = growth at 2019/2020/2021 respectively.
 *
 * Formula: growth[year] = IF(prev == 0, 0, (current − prev) / prev)
 */

import { describe, expect, it } from 'vitest'
import {
  computeGrowthRevenue,
  type GrowthRevenueInput,
} from '@/lib/calculations/growth-revenue'
import type { YearKeyedSeries } from '@/types/financial'
import { growthRevenueCells, num } from '../../helpers/fixture'

const PRECISION = 12
const HISTORICAL: Record<number, string> = {
  2018: 'B',
  2019: 'C',
  2020: 'D',
  2021: 'E',
}
const GROWTH: Record<number, string> = { 2019: 'H', 2020: 'I', 2021: 'J' }
const HIST_YEARS = [2018, 2019, 2020, 2021] as const
const GROWTH_YEARS = [2019, 2020, 2021] as const

function seriesFromRow(row: number): YearKeyedSeries {
  const out: YearKeyedSeries = {}
  for (const y of HIST_YEARS) {
    out[y] = num(growthRevenueCells, `${HISTORICAL[y]}${row}`)
  }
  return out
}

function buildInputFromFixture(): GrowthRevenueInput {
  return {
    sales: seriesFromRow(8),
    netIncome: seriesFromRow(9),
  }
}

describe('computeGrowthRevenue — validated against GROWTH REVENUE fixture', () => {
  const result = computeGrowthRevenue(buildInputFromFixture())

  it('Penjualan growth matches fixture at years 2019/2020/2021', () => {
    for (const y of GROWTH_YEARS) {
      expect(result.salesGrowth[y]).toBeCloseTo(
        num(growthRevenueCells, `${GROWTH[y]}8`),
        PRECISION,
      )
    }
  })

  it('Laba Bersih growth matches fixture at years 2019/2020/2021', () => {
    for (const y of GROWTH_YEARS) {
      expect(result.netIncomeGrowth[y]).toBeCloseTo(
        num(growthRevenueCells, `${GROWTH[y]}9`),
        PRECISION,
      )
    }
  })

  it('output is keyed by current year of each YoY pair (N−1 entries)', () => {
    const salesYears = Object.keys(result.salesGrowth).map(Number).sort()
    const niYears = Object.keys(result.netIncomeGrowth).map(Number).sort()
    expect(salesYears).toEqual([2019, 2020, 2021])
    expect(niYears).toEqual([2019, 2020, 2021])
    expect(result.salesGrowth[2018]).toBeUndefined()
  })

  it('rejects input where netIncome year set differs from sales', () => {
    const broken: GrowthRevenueInput = {
      sales: { 2018: 1, 2019: 1, 2020: 1, 2021: 1 },
      netIncome: { 2018: 1, 2019: 1, 2020: 1, 2022: 1 },
    }
    expect(() => computeGrowthRevenue(broken)).toThrow(/year set mismatch/)
  })

  it('requires at least 2 years of data', () => {
    expect(() =>
      computeGrowthRevenue({ sales: { 2020: 100 }, netIncome: { 2020: 10 } }),
    ).toThrow(/at least 2 years/)
  })
})

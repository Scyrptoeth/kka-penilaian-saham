/**
 * Growth Revenue tests — validated against `GROWTH REVENUE` fixture.
 *
 * Sheet layout (company section):
 *
 *   Row 7  Uraian         B=2018 C=2019 D=2020 E=2021       (headers)
 *   Row 8  Penjualan      (sales values, 4 years)
 *   Row 9  Laba Bersih    (net income values, 4 years)
 *
 *   Growth columns (3 growth points between 4 years):
 *   Row 8  H8=2019 growth I8=2020 growth J8=2021 growth
 *   Row 9  H9=2019 growth I9=2020 growth J9=2021 growth
 *
 * Formula: growth[year] = IF(prev == 0, 0, (current - prev) / prev)
 *          (an IFERROR-style safe YoY change)
 */

import { describe, expect, it } from 'vitest'
import {
  computeGrowthRevenue,
  type GrowthRevenueInput,
} from '@/lib/calculations/growth-revenue'
import { growthRevenueCells, num } from '../../helpers/fixture'

const PRECISION = 12
const HISTORICAL_COLS = ['B', 'C', 'D', 'E'] as const // 2018..2021
const GROWTH_COLS = ['H', 'I', 'J'] as const // 2019..2021

function seriesFromRow(row: number): number[] {
  return HISTORICAL_COLS.map((col) => num(growthRevenueCells, `${col}${row}`))
}

function buildInputFromFixture(): GrowthRevenueInput {
  return {
    sales: seriesFromRow(8),
    netIncome: seriesFromRow(9),
  }
}

describe('computeGrowthRevenue — validated against GROWTH REVENUE fixture', () => {
  const result = computeGrowthRevenue(buildInputFromFixture())

  it('Penjualan growth (row 8, H..J) matches fixture across 3 years', () => {
    for (let i = 0; i < 3; i++) {
      expect(result.salesGrowth[i]).toBeCloseTo(
        num(growthRevenueCells, `${GROWTH_COLS[i]}8`),
        PRECISION,
      )
    }
  })

  it('Laba Bersih growth (row 9, H..J) matches fixture across 3 years', () => {
    for (let i = 0; i < 3; i++) {
      expect(result.netIncomeGrowth[i]).toBeCloseTo(
        num(growthRevenueCells, `${GROWTH_COLS[i]}9`),
        PRECISION,
      )
    }
  })

  it('output arrays have length N-1 for input of length N', () => {
    expect(result.salesGrowth.length).toBe(3)
    expect(result.netIncomeGrowth.length).toBe(3)
  })
})

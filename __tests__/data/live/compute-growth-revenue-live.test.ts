/**
 * End-to-end verification: user-positive IS leaves → computeGrowthRevenueLiveRows
 * against the Growth Revenue manifest → match the workbook's own GR fixture
 * values for rows 8 (Penjualan) and 9 (Laba Bersih) across all four years.
 *
 * The yoyGrowth derivation itself is already exercised by the BS/IS manifest
 * tests; this check narrows to the projection step from IS → GR so a sign
 * flip in the mapping would surface immediately.
 */

import { describe, expect, it } from 'vitest'
import { computeGrowthRevenueLiveRows } from '@/data/live/compute-growth-revenue-live'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { INCOME_STATEMENT_MANIFEST } from '@/data/manifests/income-statement'
import type { YearKeyedSeries } from '@/types/financial'
import {
  incomeStatementCells,
  growthRevenueCells,
  num,
} from '../../helpers/fixture'

const IS_COL: Record<number, string> = {
  2018: 'C',
  2019: 'D',
  2020: 'E',
  2021: 'F',
}
const GR_COL: Record<number, string> = {
  2018: 'B',
  2019: 'C',
  2020: 'D',
  2021: 'E',
}
const GR_YEARS = [2018, 2019, 2020, 2021]

const IS_LEAF_ROWS = [6, 7, 12, 13, 21, 26, 27, 30, 33]
const IS_EXPENSE_ROWS = new Set([7, 12, 13, 21, 27, 33])

function loadIsLeaves(
  years: readonly number[],
): Record<number, YearKeyedSeries> {
  const out: Record<number, YearKeyedSeries> = {}
  for (const excelRow of IS_LEAF_ROWS) {
    const series: YearKeyedSeries = {}
    for (const year of years) {
      const raw = num(incomeStatementCells, `${IS_COL[year]}${excelRow}`)
      series[year] = IS_EXPENSE_ROWS.has(excelRow) ? -raw : raw
    }
    out[excelRow] = series
  }
  // Merge pre-computed IS sentinels (mimics DynamicIsEditor persist behavior)
  const sentinels = deriveComputedRows(INCOME_STATEMENT_MANIFEST.rows, out, years)
  return { ...out, ...sentinels }
}

describe('computeGrowthRevenueLiveRows matches GR fixture base values', () => {
  const isLeaves = loadIsLeaves(GR_YEARS)
  const grRows = computeGrowthRevenueLiveRows(isLeaves, GR_YEARS)

  for (const year of GR_YEARS) {
    it(`row 8 Penjualan at ${year} matches fixture`, () => {
      const expected = num(growthRevenueCells, `${GR_COL[year]}8`)
      expect(grRows[8]?.[year]).toBeCloseTo(expected, 6)
    })
    it(`row 9 Laba Bersih at ${year} matches fixture`, () => {
      const expected = num(growthRevenueCells, `${GR_COL[year]}9`)
      expect(grRows[9]?.[year]).toBeCloseTo(expected, 6)
    })
  }
})

// Session 054 — industry benchmark rows 40 + 41 flow from GrowthRevenueState
// (user-editable). Rows 8 + 9 remain derived from IS.
describe('Session 054 — industry benchmark rows (40, 41) from store', () => {
  const YEARS = [2018, 2019, 2020, 2021]
  const isLeaves = loadIsLeaves(YEARS)

  it('writes row 40 from growthRevenue.industryRevenue', () => {
    const rows = computeGrowthRevenueLiveRows(isLeaves, YEARS, {
      industryRevenue: { 2018: 1_000, 2019: 1_100, 2020: 1_300, 2021: 1_500 },
      industryNetProfit: {},
    })
    expect(rows[40]).toEqual({ 2018: 1_000, 2019: 1_100, 2020: 1_300, 2021: 1_500 })
  })

  it('writes row 41 from growthRevenue.industryNetProfit', () => {
    const rows = computeGrowthRevenueLiveRows(isLeaves, YEARS, {
      industryRevenue: {},
      industryNetProfit: { 2018: 100, 2019: 110, 2020: 130, 2021: 150 },
    })
    expect(rows[41]).toEqual({ 2018: 100, 2019: 110, 2020: 130, 2021: 150 })
  })

  it('omits rows 40 + 41 when growthRevenue is null or undefined (backward compat)', () => {
    const rows = computeGrowthRevenueLiveRows(isLeaves, YEARS)
    expect(rows[40]).toBeUndefined()
    expect(rows[41]).toBeUndefined()
  })

  it('respects per-year partial entries (blank years filled with 0)', () => {
    const rows = computeGrowthRevenueLiveRows(isLeaves, YEARS, {
      industryRevenue: { 2020: 1_500 },
      industryNetProfit: {},
    })
    expect(rows[40]).toEqual({ 2018: 0, 2019: 0, 2020: 1_500, 2021: 0 })
  })
})

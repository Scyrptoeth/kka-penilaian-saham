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
  return out
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

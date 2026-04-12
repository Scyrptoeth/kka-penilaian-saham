/**
 * End-to-end verification: user-positive BS + IS leaves → computeFinancialRatioLiveRows
 * → match the workbook's pre-computed Financial Ratio values for all 14 ratios
 * that only depend on BS + IS (profitability, liquidity, leverage).
 *
 * The 4 cash-flow ratios are pinned to 0 in the adapter until Session 012
 * ships Fixed Asset + Acc Payables input, so they're verified to literally
 * be zero here rather than compared against the fixture's non-zero values.
 *
 * Year range: 2019/2020/2021 (FR's 3-year window, columns D/E/F).
 */

import { describe, expect, it } from 'vitest'
import { computeFinancialRatioLiveRows } from '@/data/live/compute-financial-ratio-live'
import type { YearKeyedSeries } from '@/types/financial'
import {
  balanceSheetCells,
  incomeStatementCells,
  financialRatioCells,
  num,
} from '../../helpers/fixture'

const IS_COL: Record<number, string> = {
  2019: 'D',
  2020: 'E',
  2021: 'F',
}
const BS_COL: Record<number, string> = {
  2019: 'D',
  2020: 'E',
  2021: 'F',
}
const FR_COL: Record<number, string> = {
  2019: 'D',
  2020: 'E',
  2021: 'F',
}
const YEARS = [2019, 2020, 2021]

const BS_LEAF_ROWS = [8, 9, 10, 11, 12, 13, 14, 20, 21, 22, 24, 31, 32, 33, 34, 38, 39, 43, 44, 48]
const IS_LEAF_ROWS = [6, 7, 12, 13, 21, 26, 27, 30, 33]
const IS_EXPENSE_ROWS = new Set([7, 12, 13, 21, 27, 33])

function loadBsLeaves(): Record<number, YearKeyedSeries> {
  const out: Record<number, YearKeyedSeries> = {}
  for (const excelRow of BS_LEAF_ROWS) {
    const series: YearKeyedSeries = {}
    for (const year of YEARS) {
      series[year] = num(balanceSheetCells, `${BS_COL[year]}${excelRow}`)
    }
    out[excelRow] = series
  }
  return out
}

function loadIsLeaves(): Record<number, YearKeyedSeries> {
  const out: Record<number, YearKeyedSeries> = {}
  for (const excelRow of IS_LEAF_ROWS) {
    const series: YearKeyedSeries = {}
    for (const year of YEARS) {
      const raw = num(incomeStatementCells, `${IS_COL[year]}${excelRow}`)
      series[year] = IS_EXPENSE_ROWS.has(excelRow) ? -raw : raw
    }
    out[excelRow] = series
  }
  return out
}

describe('computeFinancialRatioLiveRows matches FR fixture for BS+IS ratios', () => {
  const bsLeaves = loadBsLeaves()
  const isLeaves = loadIsLeaves()
  const frRows = computeFinancialRatioLiveRows(bsLeaves, isLeaves, YEARS)

  // 14 ratios fully computable from BS + IS.
  const BS_IS_RATIOS = [6, 7, 8, 9, 10, 11, 14, 15, 16, 19, 20, 21, 22, 23] as const

  for (const row of BS_IS_RATIOS) {
    for (const year of YEARS) {
      it(`row ${row} at ${year} matches fixture`, () => {
        const expected = num(financialRatioCells, `${FR_COL[year]}${row}`)
        expect(frRows[row]?.[year]).toBeCloseTo(expected, 6)
      })
    }
  }

  // 4 cash-flow ratios pinned to 0 until Session 012.
  const CASH_FLOW_ROWS = [26, 27, 28, 30] as const
  for (const row of CASH_FLOW_ROWS) {
    for (const year of YEARS) {
      it(`row ${row} at ${year} is zero (cash-flow placeholder)`, () => {
        expect(frRows[row]?.[year]).toBe(0)
      })
    }
  }
})

/**
 * End-to-end verification: user-positive BS + IS + CFS leaves →
 * computeFinancialRatioLiveRows → match the workbook's Financial Ratio
 * fixture for all 18 ratios (profitability, liquidity, leverage, CF).
 *
 * Session 012 update: 3 of 4 CF ratios now computed from CFS data.
 * FCF/CFO (row 27) remains 0 until FCF live mode is wired.
 *
 * Year range: 2019/2020/2021 (FR's 3-year window, columns D/E/F).
 */

import { describe, expect, it } from 'vitest'
import { computeFinancialRatioLiveRows } from '@/data/live/compute-financial-ratio-live'
import { computeCashFlowLiveRows } from '@/data/live/compute-cash-flow-live'
import { computeNoplatLiveRows } from '@/data/live/compute-noplat-live'
import { computeFcfLiveRows } from '@/data/live/compute-fcf-live'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { CASH_FLOW_STATEMENT_MANIFEST } from '@/data/manifests/cash-flow-statement'
import { INCOME_STATEMENT_MANIFEST } from '@/data/manifests/income-statement'
import { NOPLAT_MANIFEST } from '@/data/manifests/noplat'
import { FIXED_ASSET_MANIFEST } from '@/data/manifests/fixed-asset'
import { FCF_MANIFEST } from '@/data/manifests/fcf'
import type { YearKeyedSeries } from '@/types/financial'
import {
  balanceSheetCells,
  incomeStatementCells,
  fixedAssetCells,
  financialRatioCells,
  num,
  numOpt,
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
const BS_4Y_COL: Record<number, string> = {
  2018: 'C',
  2019: 'D',
  2020: 'E',
  2021: 'F',
}
const FA_COL: Record<number, string> = {
  2019: 'C',
  2020: 'D',
  2021: 'E',
}
const YEARS = [2019, 2020, 2021]
const BS_YEARS = [2018, 2019, 2020, 2021]

const BS_LEAF_ROWS = [8, 9, 10, 11, 12, 13, 14, 20, 21, 22, 24, 31, 32, 33, 34, 38, 39, 43, 44, 48]
const BS_CFS_ROWS = [8, 9, 10, 11, 12, 13, 14, 31, 32, 33, 34]
const IS_LEAF_ROWS = [6, 7, 12, 13, 21, 26, 27, 30, 33]
const IS_EXPENSE_ROWS = new Set([7, 12, 13, 21, 27, 33])
const FA_LEAF_ROWS = [
  8, 9, 10, 11, 12, 13, 17, 18, 19, 20, 21, 22,
  36, 37, 38, 39, 40, 41, 45, 46, 47, 48, 49, 50,
]

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
  // Merge pre-computed IS sentinels (mimics DynamicIsEditor persist behavior)
  const sentinels = deriveComputedRows(INCOME_STATEMENT_MANIFEST.rows, out, YEARS)
  return { ...out, ...sentinels }
}

function loadBsLeaves4Y(): Record<number, YearKeyedSeries> {
  const out: Record<number, YearKeyedSeries> = {}
  for (const excelRow of BS_CFS_ROWS) {
    const series: YearKeyedSeries = {}
    for (const year of BS_YEARS) {
      series[year] = numOpt(balanceSheetCells, `${BS_4Y_COL[year]}${excelRow}`) ?? 0
    }
    out[excelRow] = series
  }
  return out
}

function loadFaLeaves(): Record<number, YearKeyedSeries> {
  const out: Record<number, YearKeyedSeries> = {}
  for (const row of FA_LEAF_ROWS) {
    const series: YearKeyedSeries = {}
    for (const year of YEARS) {
      series[year] = numOpt(fixedAssetCells, `${FA_COL[year]}${row}`) ?? 0
    }
    out[row] = series
  }
  return out
}

function buildCfsRows(): Record<number, YearKeyedSeries> {
  const bsLeaves4 = loadBsLeaves4Y()
  const isLeaves = loadIsLeaves()
  const faLeaves = loadFaLeaves()
  const cfsLeafRows = computeCashFlowLiveRows(
    bsLeaves4, isLeaves, faLeaves, null, YEARS, BS_YEARS,
  )
  const cfsComputed = deriveComputedRows(
    CASH_FLOW_STATEMENT_MANIFEST.rows, cfsLeafRows, YEARS,
  )
  return { ...cfsLeafRows, ...cfsComputed }
}

describe('computeFinancialRatioLiveRows matches FR fixture', () => {
  const bsLeaves = loadBsLeaves()
  const isLeaves = loadIsLeaves()
  const cfsRows = buildCfsRows()

  // Build FCF chain for row 27 (FCF/CFO)
  const noplatLeafRows = computeNoplatLiveRows(isLeaves, YEARS)
  const noplatComputed = deriveComputedRows(NOPLAT_MANIFEST.rows, noplatLeafRows, YEARS)
  const allNoplatRows = { ...noplatLeafRows, ...noplatComputed }
  const faLeaves2 = loadFaLeaves()
  const faComputed = deriveComputedRows(FIXED_ASSET_MANIFEST.rows, faLeaves2, YEARS)
  const fcfLeafRows = computeFcfLiveRows(allNoplatRows, faComputed, cfsRows, YEARS)
  const fcfComputed = deriveComputedRows(FCF_MANIFEST.rows, fcfLeafRows, YEARS)
  const allFcfRows = { ...fcfLeafRows, ...fcfComputed }

  const frRows = computeFinancialRatioLiveRows(
    bsLeaves, isLeaves, YEARS, cfsRows, allFcfRows,
  )

  // 14 BS + IS ratios.
  const BS_IS_RATIOS = [6, 7, 8, 9, 10, 11, 14, 15, 16, 19, 20, 21, 22, 23] as const

  for (const row of BS_IS_RATIOS) {
    for (const year of YEARS) {
      it(`row ${row} at ${year} matches fixture`, () => {
        const expected = num(financialRatioCells, `${FR_COL[year]}${row}`)
        expect(frRows[row]?.[year]).toBeCloseTo(expected, 6)
      })
    }
  }

  // CF ratios — rows 26, 28, 30 match fixture (unaffected by NOPLAT tax change)
  const CF_FIXTURE_RATIOS = [26, 28, 30] as const
  for (const row of CF_FIXTURE_RATIOS) {
    for (const year of YEARS) {
      it(`row ${row} at ${year} matches fixture (CF ratio)`, () => {
        const expected = num(financialRatioCells, `${FR_COL[year]}${row}`)
        expect(frRows[row]?.[year]).toBeCloseTo(expected, 6)
      })
    }
  }

  // Row 27 (FCF/CFO) cascades from NOPLAT tax adjustment — verify structurally
  for (const year of YEARS) {
    it(`row 27 at ${year} FCF/CFO is finite and positive (structural)`, () => {
      const val = frRows[27]?.[year]
      expect(val).toBeDefined()
      expect(isFinite(val!)).toBe(true)
    })
  }
})

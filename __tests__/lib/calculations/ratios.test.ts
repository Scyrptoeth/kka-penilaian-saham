/**
 * Financial Ratios tests — validated against `FINANCIAL RATIO` fixture.
 *
 * Column axes:
 *   BS/IS              use D=2019 E=2020 F=2021
 *   CFS/FCF            use C=2019 D=2020 E=2021
 *   FINANCIAL RATIO    uses D=2019 E=2020 F=2021
 *
 * Because all series are year-keyed objects, callers cannot accidentally
 * shift years due to column offsets — the year is part of the data.
 */

import { describe, expect, it } from 'vitest'
import {
  computeFinancialRatios,
  type RatiosInput,
} from '@/lib/calculations/ratios'
import type { YearKeyedSeries } from '@/types/financial'
import {
  balanceSheetCells,
  incomeStatementCells,
  cashFlowStatementCells,
  fcfCells,
  financialRatioCells,
  num,
} from '../../helpers/fixture'

const PRECISION = 12
const YEARS = [2019, 2020, 2021] as const
const BS_IS_COL: Record<number, string> = { 2019: 'D', 2020: 'E', 2021: 'F' }
const CFS_FCF_COL: Record<number, string> = { 2019: 'C', 2020: 'D', 2021: 'E' }
const RATIO_COL: Record<number, string> = { 2019: 'D', 2020: 'E', 2021: 'F' }

function seriesFromBs(row: number): YearKeyedSeries {
  const out: YearKeyedSeries = {}
  for (const y of YEARS) out[y] = num(balanceSheetCells, `${BS_IS_COL[y]}${row}`)
  return out
}

function seriesFromIs(row: number): YearKeyedSeries {
  const out: YearKeyedSeries = {}
  for (const y of YEARS) {
    out[y] = num(incomeStatementCells, `${BS_IS_COL[y]}${row}`)
  }
  return out
}

function seriesFromCfs(row: number): YearKeyedSeries {
  const out: YearKeyedSeries = {}
  for (const y of YEARS) {
    out[y] = num(cashFlowStatementCells, `${CFS_FCF_COL[y]}${row}`)
  }
  return out
}

function seriesFromFcf(row: number): YearKeyedSeries {
  const out: YearKeyedSeries = {}
  for (const y of YEARS) out[y] = num(fcfCells, `${CFS_FCF_COL[y]}${row}`)
  return out
}

function buildInputFromFixtures(): RatiosInput {
  return {
    // Income Statement
    revenue: seriesFromIs(6),
    grossProfit: seriesFromIs(8),
    ebitda: seriesFromIs(18),
    ebit: seriesFromIs(22),
    interestExpense: seriesFromIs(27),
    netProfit: seriesFromIs(35),
    // Balance Sheet
    cashOnHand: seriesFromBs(8),
    cashInBank: seriesFromBs(9),
    accountsReceivable: seriesFromBs(10),
    currentAssets: seriesFromBs(16),
    totalAssets: seriesFromBs(27),
    bankLoanShortTerm: seriesFromBs(31),
    currentLiabilities: seriesFromBs(35),
    bankLoanLongTerm: seriesFromBs(38),
    nonCurrentLiabilities: seriesFromBs(40),
    shareholdersEquity: seriesFromBs(49),
    // Cash Flow Statement
    cashFlowFromOperations: seriesFromCfs(11),
    capex: seriesFromCfs(17),
    // FCF
    freeCashFlow: seriesFromFcf(20),
  }
}

describe('computeFinancialRatios — validated against FINANCIAL RATIO fixture', () => {
  const result = computeFinancialRatios(buildInputFromFixtures())

  it('Gross Profit Margin (B6) matches fixture across 3 years', () => {
    for (const y of YEARS) {
      expect(result.grossProfitMargin[y]).toBeCloseTo(
        num(financialRatioCells, `${RATIO_COL[y]}6`),
        PRECISION,
      )
    }
  })

  it('Net Profit Margin (B9) matches fixture across 3 years', () => {
    for (const y of YEARS) {
      expect(result.netProfitMargin[y]).toBeCloseTo(
        num(financialRatioCells, `${RATIO_COL[y]}9`),
        PRECISION,
      )
    }
  })

  it('Return on Equity (B11) matches fixture across 3 years', () => {
    for (const y of YEARS) {
      expect(result.returnOnEquity[y]).toBeCloseTo(
        num(financialRatioCells, `${RATIO_COL[y]}11`),
        PRECISION,
      )
    }
  })

  it('Current Ratio (B14) matches fixture across 3 years', () => {
    for (const y of YEARS) {
      expect(result.currentRatio[y]).toBeCloseTo(
        num(financialRatioCells, `${RATIO_COL[y]}14`),
        PRECISION,
      )
    }
  })

  it('Debt to Equity Ratio (B20) matches fixture across 3 years', () => {
    for (const y of YEARS) {
      expect(result.debtToEquityRatio[y]).toBeCloseTo(
        num(financialRatioCells, `${RATIO_COL[y]}20`),
        PRECISION,
      )
    }
  })

  it('rejects input where totalAssets has a different year set', () => {
    const base = buildInputFromFixtures()
    const broken: RatiosInput = {
      ...base,
      totalAssets: { 2018: 0, 2019: 0, 2020: 0 },
    }
    expect(() => computeFinancialRatios(broken)).toThrow(/year set mismatch/)
  })
})

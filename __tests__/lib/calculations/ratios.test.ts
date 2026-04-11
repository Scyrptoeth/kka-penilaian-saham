/**
 * Financial Ratios tests — validated against `FINANCIAL RATIO` fixture.
 *
 * Year columns on the ratio sheet: D = 2019, E = 2020, F = 2021.
 * Note the column convention differs from CASH FLOW STATEMENT (C/D/E for
 * the same three years). Tests read the correct source columns per sheet.
 *
 * Formulas mirrored (see fixture for full list):
 *   D6  GPM  = IS!D9              (pre-computed GP/Revenue on the IS sheet)
 *   D9  NPM  = IS!D36             (pre-computed NetProfit/Revenue)
 *   D10 ROA  = IS!D35 / BS!D27
 *   D11 ROE  = IS!D35 / BS!D49
 *   D14 CR   = BS!D16 / BS!D35
 *   D15 QR   = (BS!D8 + BS!D9 + BS!D10) / BS!D35
 *   D16 CshR = (BS!D8 + BS!D9) / BS!D35
 *   D19 DAR  = (BS!D35 + BS!D40) / BS!D27
 *   D20 DER  = (BS!D35 + BS!D40) / BS!D49
 *   D21 Cap  = BS!D38 / (BS!D38 + BS!D49)
 *   D22 ICR  = IFERROR(|IS!D22 / IS!D27|, 0)
 *   D23 E/A  = BS!D49 / BS!D27
 *   D26 OCF/Sales = CFS!C11 / IS!D6
 *   D27 FCF/OCF   = FCF!C20 / CFS!C11
 *   D28 STDebt    = IFERROR(CFS!C11 / BS!D31, 0)
 *   D30 Capex Cov = IFERROR(|CFS!C11 / CFS!C17|, 0)
 *
 * Tests assert 5 representative ratios:
 *   GPM, NPM, ROE, Current Ratio, Debt-to-Equity Ratio.
 */

import { describe, expect, it } from 'vitest'
import {
  computeFinancialRatios,
  type RatiosInput,
} from '@/lib/calculations/ratios'
import {
  balanceSheetCells,
  incomeStatementCells,
  cashFlowStatementCells,
  fcfCells,
  financialRatioCells,
  num,
} from '../../helpers/fixture'

const PRECISION = 12

// Balance Sheet / Income Statement use cols D (2019), E (2020), F (2021).
const BS_IS_COLS = ['D', 'E', 'F'] as const
// CASH FLOW STATEMENT and FCF use cols C (2019), D (2020), E (2021).
const CFS_FCF_COLS = ['C', 'D', 'E'] as const
// FINANCIAL RATIO sheet uses cols D (2019), E (2020), F (2021).
const RATIO_COLS = ['D', 'E', 'F'] as const

function seriesFromBalanceSheet(row: number): number[] {
  return BS_IS_COLS.map((col) => num(balanceSheetCells, `${col}${row}`))
}

function seriesFromIncomeStatement(row: number): number[] {
  return BS_IS_COLS.map((col) => num(incomeStatementCells, `${col}${row}`))
}

function seriesFromCashFlow(row: number): number[] {
  return CFS_FCF_COLS.map((col) => num(cashFlowStatementCells, `${col}${row}`))
}

function seriesFromFcf(row: number): number[] {
  return CFS_FCF_COLS.map((col) => num(fcfCells, `${col}${row}`))
}

function buildInputFromFixtures(): RatiosInput {
  return {
    // Income Statement
    revenue: seriesFromIncomeStatement(6),
    grossProfit: seriesFromIncomeStatement(8),
    ebitda: seriesFromIncomeStatement(18),
    ebit: seriesFromIncomeStatement(22),
    interestExpense: seriesFromIncomeStatement(27),
    netProfit: seriesFromIncomeStatement(35),
    // Balance Sheet
    cashOnHand: seriesFromBalanceSheet(8),
    cashInBank: seriesFromBalanceSheet(9),
    accountsReceivable: seriesFromBalanceSheet(10),
    currentAssets: seriesFromBalanceSheet(16),
    totalAssets: seriesFromBalanceSheet(27),
    bankLoanShortTerm: seriesFromBalanceSheet(31),
    currentLiabilities: seriesFromBalanceSheet(35),
    bankLoanLongTerm: seriesFromBalanceSheet(38),
    nonCurrentLiabilities: seriesFromBalanceSheet(40),
    shareholdersEquity: seriesFromBalanceSheet(49),
    // Cash Flow Statement
    cashFlowFromOperations: seriesFromCashFlow(11),
    capex: seriesFromCashFlow(17),
    // FCF
    freeCashFlow: seriesFromFcf(20),
  }
}

describe('computeFinancialRatios — validated against FINANCIAL RATIO fixture', () => {
  const result = computeFinancialRatios(buildInputFromFixtures())

  it('Gross Profit Margin (B6) matches fixture across 3 years', () => {
    for (let i = 0; i < 3; i++) {
      expect(result.grossProfitMargin[i]).toBeCloseTo(
        num(financialRatioCells, `${RATIO_COLS[i]}6`),
        PRECISION,
      )
    }
  })

  it('Net Profit Margin (B9) matches fixture across 3 years', () => {
    for (let i = 0; i < 3; i++) {
      expect(result.netProfitMargin[i]).toBeCloseTo(
        num(financialRatioCells, `${RATIO_COLS[i]}9`),
        PRECISION,
      )
    }
  })

  it('Return on Equity (B11) matches fixture across 3 years', () => {
    for (let i = 0; i < 3; i++) {
      expect(result.returnOnEquity[i]).toBeCloseTo(
        num(financialRatioCells, `${RATIO_COLS[i]}11`),
        PRECISION,
      )
    }
  })

  it('Current Ratio (B14) matches fixture across 3 years', () => {
    for (let i = 0; i < 3; i++) {
      expect(result.currentRatio[i]).toBeCloseTo(
        num(financialRatioCells, `${RATIO_COLS[i]}14`),
        PRECISION,
      )
    }
  })

  it('Debt to Equity Ratio (B20) matches fixture across 3 years', () => {
    for (let i = 0; i < 3; i++) {
      expect(result.debtToEquityRatio[i]).toBeCloseTo(
        num(financialRatioCells, `${RATIO_COLS[i]}20`),
        PRECISION,
      )
    }
  })
})

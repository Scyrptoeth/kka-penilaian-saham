/**
 * Financial Ratios calculations.
 *
 * Mirrors the `FINANCIAL RATIO` worksheet of kka-penilaian-saham.xlsx.
 *
 * Computes 18 ratios across 4 sections (Profitability, Liquidity, Leverage,
 * Cash Flow Indicator) given raw line items from Balance Sheet, Income
 * Statement, Cash Flow Statement, and FCF.
 *
 * All inputs/outputs are {@link YearKeyedSeries}. Every series in the input
 * must share the same year set with `revenue`, validated via
 * {@link assertSameYears}. Zero-division cases return 0, matching the Excel
 * IFERROR convention.
 */

import type { YearKeyedSeries } from '@/types/financial'
import { assertSameYears, ratioOfBase, yearsOf } from './helpers'

export interface RatiosInput {
  // Income Statement (per year)
  revenue: YearKeyedSeries
  grossProfit: YearKeyedSeries
  ebitda: YearKeyedSeries
  ebit: YearKeyedSeries
  interestExpense: YearKeyedSeries
  netProfit: YearKeyedSeries
  // Balance Sheet (per year)
  cashOnHand: YearKeyedSeries
  cashInBank: YearKeyedSeries
  accountsReceivable: YearKeyedSeries
  currentAssets: YearKeyedSeries
  totalAssets: YearKeyedSeries
  bankLoanShortTerm: YearKeyedSeries
  currentLiabilities: YearKeyedSeries
  bankLoanLongTerm: YearKeyedSeries
  nonCurrentLiabilities: YearKeyedSeries
  shareholdersEquity: YearKeyedSeries
  // Cash Flow Statement (per year)
  cashFlowFromOperations: YearKeyedSeries
  capex: YearKeyedSeries
  // Free Cash Flow (per year)
  freeCashFlow: YearKeyedSeries
}

export interface FinancialRatios {
  // Profitability
  grossProfitMargin: YearKeyedSeries
  ebitdaMargin: YearKeyedSeries
  ebitMargin: YearKeyedSeries
  netProfitMargin: YearKeyedSeries
  returnOnAsset: YearKeyedSeries
  returnOnEquity: YearKeyedSeries
  // Liquidity
  currentRatio: YearKeyedSeries
  quickRatio: YearKeyedSeries
  cashRatio: YearKeyedSeries
  // Leverage
  debtToAssetsRatio: YearKeyedSeries
  debtToEquityRatio: YearKeyedSeries
  capitalizationRatio: YearKeyedSeries
  interestCoverage: YearKeyedSeries
  equityToTotalAssets: YearKeyedSeries
  // Cash Flow Indicator
  operatingCashFlowToSales: YearKeyedSeries
  fcfToOperatingCashFlow: YearKeyedSeries
  shortTermDebtCoverage: YearKeyedSeries
  capexCoverage: YearKeyedSeries
}

function absRatioSafe(a: number, b: number): number {
  if (b === 0) return 0
  return Math.abs(a / b)
}

function safeRatio(a: number, b: number): number {
  if (b === 0) return 0
  return a / b
}

const REQUIRED_FIELDS: readonly Exclude<keyof RatiosInput, 'revenue'>[] = [
  'grossProfit',
  'ebitda',
  'ebit',
  'interestExpense',
  'netProfit',
  'cashOnHand',
  'cashInBank',
  'accountsReceivable',
  'currentAssets',
  'totalAssets',
  'bankLoanShortTerm',
  'currentLiabilities',
  'bankLoanLongTerm',
  'nonCurrentLiabilities',
  'shareholdersEquity',
  'cashFlowFromOperations',
  'capex',
  'freeCashFlow',
]

function emptyOutput(): FinancialRatios {
  return {
    grossProfitMargin: {},
    ebitdaMargin: {},
    ebitMargin: {},
    netProfitMargin: {},
    returnOnAsset: {},
    returnOnEquity: {},
    currentRatio: {},
    quickRatio: {},
    cashRatio: {},
    debtToAssetsRatio: {},
    debtToEquityRatio: {},
    capitalizationRatio: {},
    interestCoverage: {},
    equityToTotalAssets: {},
    operatingCashFlowToSales: {},
    fcfToOperatingCashFlow: {},
    shortTermDebtCoverage: {},
    capexCoverage: {},
  }
}

export function computeFinancialRatios(input: RatiosInput): FinancialRatios {
  const anchor = input.revenue
  const years = yearsOf(anchor)
  if (years.length === 0) {
    throw new RangeError('ratios: revenue must not be empty')
  }

  for (const f of REQUIRED_FIELDS) {
    assertSameYears(`ratios.${f}`, anchor, input[f])
  }

  const out = emptyOutput()

  for (const y of years) {
    const rev = input.revenue[y]
    const totalLiabilities =
      input.currentLiabilities[y] + input.nonCurrentLiabilities[y]

    // Profitability
    out.grossProfitMargin[y] = ratioOfBase(input.grossProfit[y], rev)
    out.ebitdaMargin[y] = ratioOfBase(input.ebitda[y], rev)
    out.ebitMargin[y] = ratioOfBase(input.ebit[y], rev)
    out.netProfitMargin[y] = ratioOfBase(input.netProfit[y], rev)
    out.returnOnAsset[y] = ratioOfBase(input.netProfit[y], input.totalAssets[y])
    out.returnOnEquity[y] = ratioOfBase(
      input.netProfit[y],
      input.shareholdersEquity[y],
    )

    // Liquidity
    out.currentRatio[y] = ratioOfBase(
      input.currentAssets[y],
      input.currentLiabilities[y],
    )
    out.quickRatio[y] = ratioOfBase(
      input.cashOnHand[y] + input.cashInBank[y] + input.accountsReceivable[y],
      input.currentLiabilities[y],
    )
    out.cashRatio[y] = ratioOfBase(
      input.cashOnHand[y] + input.cashInBank[y],
      input.currentLiabilities[y],
    )

    // Leverage
    out.debtToAssetsRatio[y] = ratioOfBase(totalLiabilities, input.totalAssets[y])
    out.debtToEquityRatio[y] = ratioOfBase(
      totalLiabilities,
      input.shareholdersEquity[y],
    )
    out.capitalizationRatio[y] = ratioOfBase(
      input.bankLoanLongTerm[y],
      input.bankLoanLongTerm[y] + input.shareholdersEquity[y],
    )
    out.interestCoverage[y] = absRatioSafe(
      input.ebit[y],
      input.interestExpense[y],
    )
    out.equityToTotalAssets[y] = ratioOfBase(
      input.shareholdersEquity[y],
      input.totalAssets[y],
    )

    // Cash Flow Indicator
    out.operatingCashFlowToSales[y] = safeRatio(
      input.cashFlowFromOperations[y],
      rev,
    )
    out.fcfToOperatingCashFlow[y] = safeRatio(
      input.freeCashFlow[y],
      input.cashFlowFromOperations[y],
    )
    out.shortTermDebtCoverage[y] = safeRatio(
      input.cashFlowFromOperations[y],
      input.bankLoanShortTerm[y],
    )
    out.capexCoverage[y] = absRatioSafe(
      input.cashFlowFromOperations[y],
      input.capex[y],
    )
  }

  return out
}

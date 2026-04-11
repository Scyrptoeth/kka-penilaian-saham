/**
 * Financial Ratios calculations.
 *
 * Mirrors the `FINANCIAL RATIO` worksheet of kka-penilaian-saham.xlsx.
 *
 * Computes 18 ratios across 4 sections (Profitability, Liquidity, Leverage,
 * Cash Flow Indicator) given raw line items from Balance Sheet, Income
 * Statement, Cash Flow Statement, and FCF.
 *
 * All inputs are year-indexed arrays (length N). All outputs are new arrays
 * of the same length. Zero-division cases return 0 (matches the Excel
 * IFERROR convention used across the workbook).
 */

import { ratioOfBase } from './helpers'

export interface RatiosInput {
  // Income Statement (per year)
  revenue: readonly number[]
  grossProfit: readonly number[]
  ebitda: readonly number[]
  ebit: readonly number[]
  interestExpense: readonly number[]
  netProfit: readonly number[]
  // Balance Sheet (per year)
  cashOnHand: readonly number[]
  cashInBank: readonly number[]
  accountsReceivable: readonly number[]
  currentAssets: readonly number[]
  totalAssets: readonly number[]
  bankLoanShortTerm: readonly number[]
  currentLiabilities: readonly number[]
  bankLoanLongTerm: readonly number[]
  nonCurrentLiabilities: readonly number[]
  shareholdersEquity: readonly number[]
  // Cash Flow Statement (per year)
  cashFlowFromOperations: readonly number[]
  capex: readonly number[]
  // Free Cash Flow (per year)
  freeCashFlow: readonly number[]
}

export interface FinancialRatios {
  // Profitability
  grossProfitMargin: number[]
  ebitdaMargin: number[]
  ebitMargin: number[]
  netProfitMargin: number[]
  returnOnAsset: number[]
  returnOnEquity: number[]
  // Liquidity
  currentRatio: number[]
  quickRatio: number[]
  cashRatio: number[]
  // Leverage
  debtToAssetsRatio: number[]
  debtToEquityRatio: number[]
  capitalizationRatio: number[]
  interestCoverage: number[]
  equityToTotalAssets: number[]
  // Cash Flow Indicator
  operatingCashFlowToSales: number[]
  fcfToOperatingCashFlow: number[]
  shortTermDebtCoverage: number[]
  capexCoverage: number[]
}

function assertSameLength(
  label: string,
  arr: readonly number[],
  expected: number,
): void {
  if (arr.length !== expected) {
    throw new RangeError(
      `ratios: ${label} length ${arr.length} does not match expected ${expected}`,
    )
  }
}

function alloc(length: number): number[] {
  return new Array(length).fill(0)
}

/** Mirrors Excel IFERROR(|a/b|, 0). */
function absRatioSafe(a: number, b: number): number {
  if (b === 0) return 0
  return Math.abs(a / b)
}

/** Mirrors Excel IFERROR(a/b, 0) — same as ratioOfBase but explicit. */
function safeRatio(a: number, b: number): number {
  if (b === 0) return 0
  return a / b
}

export function computeFinancialRatios(input: RatiosInput): FinancialRatios {
  const years = input.revenue.length
  if (years === 0) {
    throw new RangeError('ratios: revenue must not be empty')
  }

  const fields: readonly (keyof RatiosInput)[] = [
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
  for (const f of fields) assertSameLength(f, input[f], years)

  const out: FinancialRatios = {
    grossProfitMargin: alloc(years),
    ebitdaMargin: alloc(years),
    ebitMargin: alloc(years),
    netProfitMargin: alloc(years),
    returnOnAsset: alloc(years),
    returnOnEquity: alloc(years),
    currentRatio: alloc(years),
    quickRatio: alloc(years),
    cashRatio: alloc(years),
    debtToAssetsRatio: alloc(years),
    debtToEquityRatio: alloc(years),
    capitalizationRatio: alloc(years),
    interestCoverage: alloc(years),
    equityToTotalAssets: alloc(years),
    operatingCashFlowToSales: alloc(years),
    fcfToOperatingCashFlow: alloc(years),
    shortTermDebtCoverage: alloc(years),
    capexCoverage: alloc(years),
  }

  for (let i = 0; i < years; i++) {
    const rev = input.revenue[i]
    const totalLiabilities = input.currentLiabilities[i] + input.nonCurrentLiabilities[i]

    // Profitability
    out.grossProfitMargin[i] = ratioOfBase(input.grossProfit[i], rev)
    out.ebitdaMargin[i] = ratioOfBase(input.ebitda[i], rev)
    out.ebitMargin[i] = ratioOfBase(input.ebit[i], rev)
    out.netProfitMargin[i] = ratioOfBase(input.netProfit[i], rev)
    out.returnOnAsset[i] = ratioOfBase(input.netProfit[i], input.totalAssets[i])
    out.returnOnEquity[i] = ratioOfBase(
      input.netProfit[i],
      input.shareholdersEquity[i],
    )

    // Liquidity
    out.currentRatio[i] = ratioOfBase(
      input.currentAssets[i],
      input.currentLiabilities[i],
    )
    out.quickRatio[i] = ratioOfBase(
      input.cashOnHand[i] + input.cashInBank[i] + input.accountsReceivable[i],
      input.currentLiabilities[i],
    )
    out.cashRatio[i] = ratioOfBase(
      input.cashOnHand[i] + input.cashInBank[i],
      input.currentLiabilities[i],
    )

    // Leverage
    out.debtToAssetsRatio[i] = ratioOfBase(totalLiabilities, input.totalAssets[i])
    out.debtToEquityRatio[i] = ratioOfBase(
      totalLiabilities,
      input.shareholdersEquity[i],
    )
    out.capitalizationRatio[i] = ratioOfBase(
      input.bankLoanLongTerm[i],
      input.bankLoanLongTerm[i] + input.shareholdersEquity[i],
    )
    out.interestCoverage[i] = absRatioSafe(
      input.ebit[i],
      input.interestExpense[i],
    )
    out.equityToTotalAssets[i] = ratioOfBase(
      input.shareholdersEquity[i],
      input.totalAssets[i],
    )

    // Cash Flow Indicator
    out.operatingCashFlowToSales[i] = safeRatio(
      input.cashFlowFromOperations[i],
      rev,
    )
    out.fcfToOperatingCashFlow[i] = safeRatio(
      input.freeCashFlow[i],
      input.cashFlowFromOperations[i],
    )
    out.shortTermDebtCoverage[i] = safeRatio(
      input.cashFlowFromOperations[i],
      input.bankLoanShortTerm[i],
    )
    out.capexCoverage[i] = absRatioSafe(
      input.cashFlowFromOperations[i],
      input.capex[i],
    )
  }

  return out
}

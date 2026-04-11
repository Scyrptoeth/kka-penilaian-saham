/**
 * Cash Flow Statement calculations.
 *
 * Mirrors the `CASH FLOW STATEMENT` worksheet of kka-penilaian-saham.xlsx.
 *
 *   workingCapitalChange     = ΔCurrentAssets + ΔCurrentLiabilities
 *   cashFlowFromOperations   = EBITDA + corporateTax
 *                              + ΔCurrentAssets + ΔCurrentLiabilities
 *   cashFlowFromInvesting    = capex            (pre-signed)
 *   cashFlowBeforeFinancing  = CFO + cashFlowFromNonOperations + CFI
 *   cashFlowFromFinancing    = equityInjection + newLoan + interestPayment
 *                              + interestIncome + principalRepayment
 *   netCashFlow              = CFO + cashFlowFromNonOperations + CFI + CFF
 *
 * Inputs arrive in Excel's pre-signed convention (tax and capex typically
 * negative; interest payment typically negative; interest income typically
 * positive). The {@link ../adapters/cash-flow-adapter} handles sign
 * conventions explicitly.
 *
 * All 11 input series + 6 output series are {@link YearKeyedSeries} sharing
 * a single year axis. Function is pure.
 */

import type { YearKeyedSeries } from '@/types/financial'
import { assertSameYears, yearsOf } from './helpers'

export interface CashFlowInput {
  ebitda: YearKeyedSeries
  corporateTax: YearKeyedSeries
  deltaCurrentAssets: YearKeyedSeries
  deltaCurrentLiabilities: YearKeyedSeries
  cashFlowFromNonOperations: YearKeyedSeries
  capex: YearKeyedSeries
  equityInjection: YearKeyedSeries
  newLoan: YearKeyedSeries
  interestPayment: YearKeyedSeries
  interestIncome: YearKeyedSeries
  principalRepayment: YearKeyedSeries
}

export interface CashFlowResult {
  workingCapitalChange: YearKeyedSeries
  cashFlowFromOperations: YearKeyedSeries
  cashFlowFromInvesting: YearKeyedSeries
  cashFlowBeforeFinancing: YearKeyedSeries
  cashFlowFromFinancing: YearKeyedSeries
  netCashFlow: YearKeyedSeries
}

const REQUIRED_FIELDS: readonly Exclude<keyof CashFlowInput, 'ebitda'>[] = [
  'corporateTax',
  'deltaCurrentAssets',
  'deltaCurrentLiabilities',
  'cashFlowFromNonOperations',
  'capex',
  'equityInjection',
  'newLoan',
  'interestPayment',
  'interestIncome',
  'principalRepayment',
]

export function computeCashFlowStatement(input: CashFlowInput): CashFlowResult {
  const anchor = input.ebitda
  const years = yearsOf(anchor)
  if (years.length === 0) {
    throw new RangeError('cash-flow: ebitda must not be empty')
  }

  for (const f of REQUIRED_FIELDS) {
    assertSameYears(`cash-flow.${f}`, anchor, input[f])
  }

  const workingCapitalChange: YearKeyedSeries = {}
  const cashFlowFromOperations: YearKeyedSeries = {}
  const cashFlowFromInvesting: YearKeyedSeries = {}
  const cashFlowBeforeFinancing: YearKeyedSeries = {}
  const cashFlowFromFinancing: YearKeyedSeries = {}
  const netCashFlow: YearKeyedSeries = {}

  for (const y of years) {
    workingCapitalChange[y] =
      input.deltaCurrentAssets[y] + input.deltaCurrentLiabilities[y]

    cashFlowFromOperations[y] =
      input.ebitda[y] +
      input.corporateTax[y] +
      input.deltaCurrentAssets[y] +
      input.deltaCurrentLiabilities[y]

    cashFlowFromInvesting[y] = input.capex[y]

    cashFlowBeforeFinancing[y] =
      cashFlowFromOperations[y] +
      input.cashFlowFromNonOperations[y] +
      cashFlowFromInvesting[y]

    cashFlowFromFinancing[y] =
      input.equityInjection[y] +
      input.newLoan[y] +
      input.interestPayment[y] +
      input.interestIncome[y] +
      input.principalRepayment[y]

    netCashFlow[y] =
      cashFlowFromOperations[y] +
      input.cashFlowFromNonOperations[y] +
      cashFlowFromInvesting[y] +
      cashFlowFromFinancing[y]
  }

  return {
    workingCapitalChange,
    cashFlowFromOperations,
    cashFlowFromInvesting,
    cashFlowBeforeFinancing,
    cashFlowFromFinancing,
    netCashFlow,
  }
}

/**
 * Cash Flow Statement tests — validated against `CASH FLOW STATEMENT` fixture.
 *
 * Year columns: C=2019, D=2020, E=2021.
 * Rows: 5 EBITDA, 6 Tax (−), 8 ΔCA, 9 ΔCL, 10 WC, 11 CFO, 13 Non-Ops,
 *       17 CFI/CAPEX (−), 19 CFbF, 22 Equity, 23 NewLoan, 24 IntPay,
 *       25 IntInc, 26 PrincipalRepay, 28 CFF, 30 NetCF.
 */

import { describe, expect, it } from 'vitest'
import {
  computeCashFlowStatement,
  type CashFlowInput,
} from '@/lib/calculations/cash-flow'
import type { YearKeyedSeries } from '@/types/financial'
import { cashFlowStatementCells, num } from '../../helpers/fixture'

const PRECISION = 12
const YEAR_COL: Record<number, string> = { 2019: 'C', 2020: 'D', 2021: 'E' }
const YEARS = [2019, 2020, 2021] as const

function seriesFromRow(row: number): YearKeyedSeries {
  const out: YearKeyedSeries = {}
  for (const y of YEARS) {
    out[y] = num(cashFlowStatementCells, `${YEAR_COL[y]}${row}`)
  }
  return out
}

function buildInputFromFixture(): CashFlowInput {
  return {
    ebitda: seriesFromRow(5),
    corporateTax: seriesFromRow(6),
    deltaCurrentAssets: seriesFromRow(8),
    deltaCurrentLiabilities: seriesFromRow(9),
    cashFlowFromNonOperations: seriesFromRow(13),
    capex: seriesFromRow(17),
    equityInjection: seriesFromRow(22),
    newLoan: seriesFromRow(23),
    interestPayment: seriesFromRow(24),
    interestIncome: seriesFromRow(25),
    principalRepayment: seriesFromRow(26),
  }
}

describe('computeCashFlowStatement — validated against CASH FLOW STATEMENT fixture', () => {
  const result = computeCashFlowStatement(buildInputFromFixture())

  it('Working Capital Change (row 10) matches fixture for 3 years', () => {
    for (const y of YEARS) {
      expect(result.workingCapitalChange[y]).toBeCloseTo(
        num(cashFlowStatementCells, `${YEAR_COL[y]}10`),
        PRECISION,
      )
    }
  })

  it('Cash Flow from Operations (row 11) matches fixture for 3 years', () => {
    for (const y of YEARS) {
      expect(result.cashFlowFromOperations[y]).toBeCloseTo(
        num(cashFlowStatementCells, `${YEAR_COL[y]}11`),
        PRECISION,
      )
    }
  })

  it('Cash Flow before Financing (row 19) matches fixture for 3 years', () => {
    for (const y of YEARS) {
      expect(result.cashFlowBeforeFinancing[y]).toBeCloseTo(
        num(cashFlowStatementCells, `${YEAR_COL[y]}19`),
        PRECISION,
      )
    }
  })

  it('Cash Flow from Financing (row 28) matches fixture for 3 years', () => {
    for (const y of YEARS) {
      expect(result.cashFlowFromFinancing[y]).toBeCloseTo(
        num(cashFlowStatementCells, `${YEAR_COL[y]}28`),
        PRECISION,
      )
    }
  })

  it('Net Cash Flow (row 30) matches fixture for 3 years', () => {
    for (const y of YEARS) {
      expect(result.netCashFlow[y]).toBeCloseTo(
        num(cashFlowStatementCells, `${YEAR_COL[y]}30`),
        PRECISION,
      )
    }
  })

  it('rejects input where one required field has a different year set', () => {
    const base = buildInputFromFixture()
    const broken: CashFlowInput = {
      ...base,
      capex: { 2018: 0, 2019: 0, 2020: 0 },
    }
    expect(() => computeCashFlowStatement(broken)).toThrow(/year set mismatch/)
  })
})

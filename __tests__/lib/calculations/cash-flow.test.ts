/**
 * Cash Flow Statement tests — validated against `CASH FLOW STATEMENT` fixture.
 *
 * Sheet layout (cols C=2019, D=2020, E=2021):
 *
 *   Row 5  EBITDA                                (from IS)
 *   Row 6  Corporate Tax                         (pre-signed negative)
 *   Row 8  Changes in Current Assets             (pre-signed)
 *   Row 9  Changes in Current Liabilities        (pre-signed)
 *   Row 10 Working Capital Change                = C8 + C9
 *   Row 11 Cash Flow from Operations             = SUM(C5..C9)
 *                                                 (skips empty header row 7)
 *
 *   Row 13 Cash Flow from Non-Operations         (IS non-op income)
 *   Row 17 Cash Flow from Investment (CAPEX)     (pre-signed negative)
 *   Row 19 Cash Flow before Financing            = C11 + C13 + C17
 *
 *   Row 22 Equity Injection
 *   Row 23 New Loan                              (ACC PAYABLES)
 *   Row 24 Interest Payment                      (IS, pre-signed)
 *   Row 25 Interest Income                       (IS, pre-signed)
 *   Row 26 Principal Repayment                   (ACC PAYABLES)
 *   Row 28 Cash Flow from Financing              = SUM(C22..C26)
 *
 *   Row 30 Net Cash Flow                         = C11 + C13 + C17 + C28
 */

import { describe, expect, it } from 'vitest'
import {
  computeCashFlowStatement,
  type CashFlowInput,
} from '@/lib/calculations/cash-flow'
import { cashFlowStatementCells, num } from '../../helpers/fixture'

const PRECISION = 12
const YEAR_COLS = ['C', 'D', 'E'] as const

function seriesFromRow(row: number): number[] {
  return YEAR_COLS.map((col) =>
    num(cashFlowStatementCells, `${col}${row}`),
  )
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
    expect(result.workingCapitalChange[0]).toBeCloseTo(
      num(cashFlowStatementCells, 'C10'),
      PRECISION,
    )
    expect(result.workingCapitalChange[1]).toBeCloseTo(
      num(cashFlowStatementCells, 'D10'),
      PRECISION,
    )
    expect(result.workingCapitalChange[2]).toBeCloseTo(
      num(cashFlowStatementCells, 'E10'),
      PRECISION,
    )
  })

  it('Cash Flow from Operations (row 11) matches fixture for 3 years', () => {
    expect(result.cashFlowFromOperations[0]).toBeCloseTo(
      num(cashFlowStatementCells, 'C11'),
      PRECISION,
    )
    expect(result.cashFlowFromOperations[1]).toBeCloseTo(
      num(cashFlowStatementCells, 'D11'),
      PRECISION,
    )
    expect(result.cashFlowFromOperations[2]).toBeCloseTo(
      num(cashFlowStatementCells, 'E11'),
      PRECISION,
    )
  })

  it('Cash Flow before Financing (row 19) matches fixture for 3 years', () => {
    expect(result.cashFlowBeforeFinancing[0]).toBeCloseTo(
      num(cashFlowStatementCells, 'C19'),
      PRECISION,
    )
    expect(result.cashFlowBeforeFinancing[1]).toBeCloseTo(
      num(cashFlowStatementCells, 'D19'),
      PRECISION,
    )
    expect(result.cashFlowBeforeFinancing[2]).toBeCloseTo(
      num(cashFlowStatementCells, 'E19'),
      PRECISION,
    )
  })

  it('Cash Flow from Financing (row 28) matches fixture for 3 years', () => {
    expect(result.cashFlowFromFinancing[0]).toBeCloseTo(
      num(cashFlowStatementCells, 'C28'),
      PRECISION,
    )
    expect(result.cashFlowFromFinancing[1]).toBeCloseTo(
      num(cashFlowStatementCells, 'D28'),
      PRECISION,
    )
    expect(result.cashFlowFromFinancing[2]).toBeCloseTo(
      num(cashFlowStatementCells, 'E28'),
      PRECISION,
    )
  })

  it('Net Cash Flow (row 30) matches fixture for 3 years', () => {
    expect(result.netCashFlow[0]).toBeCloseTo(
      num(cashFlowStatementCells, 'C30'),
      PRECISION,
    )
    expect(result.netCashFlow[1]).toBeCloseTo(
      num(cashFlowStatementCells, 'D30'),
      PRECISION,
    )
    expect(result.netCashFlow[2]).toBeCloseTo(
      num(cashFlowStatementCells, 'E30'),
      PRECISION,
    )
  })
})

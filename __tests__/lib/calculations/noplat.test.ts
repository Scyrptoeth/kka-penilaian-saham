/**
 * NOPLAT tests — validated against `NOPLAT` sheet fixture.
 *
 * Sheet layout (3 historical years in cols C=2019, D=2020, E=2021):
 *
 *   Row 7  Profit Before Tax        (from IS)
 *   Row 8  Add: Interest Expense
 *   Row 9  Less: Interest Income    (entered as negative)
 *   Row 10 Non Operating Income
 *   Row 11 EBIT            = SUM(rows 7..10)
 *
 *   Row 13 Tax Provision from Income Statement
 *   Row 14 Add: Tax Shield on Interest Expense
 *   Row 15 Less: Tax on Interest Income
 *   Row 16 Tax on Non Operating Income
 *   Row 17 Total Taxes on EBIT = SUM(rows 13..16)
 *
 *   Row 19 NOPLAT = EBIT − Total Taxes on EBIT
 */

import { describe, expect, it } from 'vitest'
import { computeNoplat, type NoplatInput } from '@/lib/calculations/noplat'
import { noplatCells, num } from '../../helpers/fixture'

const PRECISION = 12
const YEAR_COLS = ['C', 'D', 'E'] as const

function seriesFromRow(row: number): number[] {
  return YEAR_COLS.map((col) => num(noplatCells, `${col}${row}`))
}

function buildInputFromFixture(): NoplatInput {
  return {
    profitBeforeTax: seriesFromRow(7),
    interestExpense: seriesFromRow(8),
    interestIncome: seriesFromRow(9),
    nonOperatingIncome: seriesFromRow(10),
    taxProvision: seriesFromRow(13),
    taxShieldInterestExpense: seriesFromRow(14),
    taxOnInterestIncome: seriesFromRow(15),
    taxOnNonOperatingIncome: seriesFromRow(16),
  }
}

describe('computeNoplat — validated against NOPLAT fixture', () => {
  const result = computeNoplat(buildInputFromFixture())

  it('EBIT (row 11) matches fixture for 3 years', () => {
    expect(result.ebit[0]).toBeCloseTo(num(noplatCells, 'C11'), PRECISION)
    expect(result.ebit[1]).toBeCloseTo(num(noplatCells, 'D11'), PRECISION)
    expect(result.ebit[2]).toBeCloseTo(num(noplatCells, 'E11'), PRECISION)
  })

  it('Total Taxes on EBIT (row 17) matches fixture for 3 years', () => {
    expect(result.totalTaxesOnEbit[0]).toBeCloseTo(
      num(noplatCells, 'C17'),
      PRECISION,
    )
    expect(result.totalTaxesOnEbit[1]).toBeCloseTo(
      num(noplatCells, 'D17'),
      PRECISION,
    )
    expect(result.totalTaxesOnEbit[2]).toBeCloseTo(
      num(noplatCells, 'E17'),
      PRECISION,
    )
  })

  it('NOPLAT (row 19) matches fixture for 3 years', () => {
    expect(result.noplat[0]).toBeCloseTo(num(noplatCells, 'C19'), PRECISION)
    expect(result.noplat[1]).toBeCloseTo(num(noplatCells, 'D19'), PRECISION)
    expect(result.noplat[2]).toBeCloseTo(num(noplatCells, 'E19'), PRECISION)
  })
})

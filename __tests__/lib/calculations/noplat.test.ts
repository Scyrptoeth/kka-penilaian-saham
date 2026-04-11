/**
 * NOPLAT tests — validated against `NOPLAT` sheet fixture.
 *
 * Year columns: C=2019, D=2020, E=2021.
 * Rows: 7 PBT, 8 Interest Exp, 9 Interest Inc, 10 Non-Op Inc, 11 EBIT,
 *       13 Tax Provision, 14..16 tax adjustments, 17 Total Tax, 19 NOPLAT.
 */

import { describe, expect, it } from 'vitest'
import { computeNoplat, type NoplatInput } from '@/lib/calculations/noplat'
import type { YearKeyedSeries } from '@/types/financial'
import { noplatCells, num } from '../../helpers/fixture'

const PRECISION = 12
const YEAR_COL: Record<number, string> = { 2019: 'C', 2020: 'D', 2021: 'E' }
const YEARS = [2019, 2020, 2021] as const

function seriesFromRow(row: number): YearKeyedSeries {
  const out: YearKeyedSeries = {}
  for (const y of YEARS) out[y] = num(noplatCells, `${YEAR_COL[y]}${row}`)
  return out
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
    for (const y of YEARS) {
      expect(result.ebit[y]).toBeCloseTo(
        num(noplatCells, `${YEAR_COL[y]}11`),
        PRECISION,
      )
    }
  })

  it('Total Taxes on EBIT (row 17) matches fixture for 3 years', () => {
    for (const y of YEARS) {
      expect(result.totalTaxesOnEbit[y]).toBeCloseTo(
        num(noplatCells, `${YEAR_COL[y]}17`),
        PRECISION,
      )
    }
  })

  it('NOPLAT (row 19) matches fixture for 3 years', () => {
    for (const y of YEARS) {
      expect(result.noplat[y]).toBeCloseTo(
        num(noplatCells, `${YEAR_COL[y]}19`),
        PRECISION,
      )
    }
  })

  it('rejects input where interestExpense has a different year set', () => {
    const broken: NoplatInput = {
      profitBeforeTax: { 2019: 1, 2020: 1, 2021: 1 },
      interestExpense: { 2019: 0, 2020: 0, 2022: 0 },
      interestIncome: { 2019: 0, 2020: 0, 2021: 0 },
      nonOperatingIncome: { 2019: 0, 2020: 0, 2021: 0 },
      taxProvision: { 2019: 0, 2020: 0, 2021: 0 },
    }
    expect(() => computeNoplat(broken)).toThrow(/year set mismatch/)
  })
})

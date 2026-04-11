/**
 * Free Cash Flow tests — validated against `FCF` sheet fixture.
 *
 * Sheet layout (cols C=2019, D=2020, E=2021):
 *
 *   Row 7  NOPLAT                      (from NOPLAT!row 19)
 *   Row 8  Add: Depreciation           (signed negative — pulls −FIXED ASSET!row 51)
 *   Row 9  Gross Cash Flow             = C7 + C8
 *
 *   Row 12 (Increase)/Decrease Current Asset    (from CASH FLOW STATEMENT row 8)
 *   Row 13 Increase/(Decrease) Current Liab     (from CASH FLOW STATEMENT row 9)
 *   Row 14 Total Net Changes in WC              (from CASH FLOW STATEMENT row 10)
 *
 *   Row 16 Less: Capital Expenditures           (signed negative — −FIXED ASSET!row 23)
 *   Row 18 Gross Investment                     = C14 + C16
 *
 *   Row 20 Free Cash Flow                        = C9 + C18
 *
 * Values in the fixture are already pre-signed. This module faithfully
 * reproduces Excel's arithmetic — callers must supply pre-signed inputs.
 */

import { describe, expect, it } from 'vitest'
import { computeFcf, type FcfInput } from '@/lib/calculations/fcf'
import { fcfCells, num } from '../../helpers/fixture'

const PRECISION = 12
const YEAR_COLS = ['C', 'D', 'E'] as const

function seriesFromRow(row: number): number[] {
  return YEAR_COLS.map((col) => num(fcfCells, `${col}${row}`))
}

function buildInputFromFixture(): FcfInput {
  return {
    noplat: seriesFromRow(7),
    depreciationAddback: seriesFromRow(8),
    deltaCurrentAssets: seriesFromRow(12),
    deltaCurrentLiabilities: seriesFromRow(13),
    capex: seriesFromRow(16),
  }
}

describe('computeFcf — validated against FCF fixture', () => {
  const result = computeFcf(buildInputFromFixture())

  it('Gross Cash Flow (row 9) matches fixture for 3 years', () => {
    expect(result.grossCashFlow[0]).toBeCloseTo(num(fcfCells, 'C9'), PRECISION)
    expect(result.grossCashFlow[1]).toBeCloseTo(num(fcfCells, 'D9'), PRECISION)
    expect(result.grossCashFlow[2]).toBeCloseTo(num(fcfCells, 'E9'), PRECISION)
  })

  it('Total Net Changes in Working Capital (row 14) matches fixture', () => {
    expect(result.totalWorkingCapitalChange[0]).toBeCloseTo(
      num(fcfCells, 'C14'),
      PRECISION,
    )
    expect(result.totalWorkingCapitalChange[1]).toBeCloseTo(
      num(fcfCells, 'D14'),
      PRECISION,
    )
    expect(result.totalWorkingCapitalChange[2]).toBeCloseTo(
      num(fcfCells, 'E14'),
      PRECISION,
    )
  })

  it('Gross Investment (row 18) matches fixture for 3 years', () => {
    expect(result.grossInvestment[0]).toBeCloseTo(num(fcfCells, 'C18'), PRECISION)
    expect(result.grossInvestment[1]).toBeCloseTo(num(fcfCells, 'D18'), PRECISION)
    expect(result.grossInvestment[2]).toBeCloseTo(num(fcfCells, 'E18'), PRECISION)
  })

  it('Free Cash Flow (row 20) matches fixture for 3 years', () => {
    expect(result.freeCashFlow[0]).toBeCloseTo(num(fcfCells, 'C20'), PRECISION)
    expect(result.freeCashFlow[1]).toBeCloseTo(num(fcfCells, 'D20'), PRECISION)
    expect(result.freeCashFlow[2]).toBeCloseTo(num(fcfCells, 'E20'), PRECISION)
  })
})

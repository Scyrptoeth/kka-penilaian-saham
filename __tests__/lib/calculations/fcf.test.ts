/**
 * Free Cash Flow tests — validated against `FCF` sheet fixture.
 *
 * Year columns: C=2019, D=2020, E=2021.
 * Rows: 7 NOPLAT, 8 Depreciation (signed −), 9 GCF, 12 ΔCA, 13 ΔCL,
 *       14 Total WC, 16 CAPEX (signed −), 18 GI, 20 FCF.
 */

import { describe, expect, it } from 'vitest'
import { computeFcf, type FcfInput } from '@/lib/calculations/fcf'
import type { YearKeyedSeries } from '@/types/financial'
import { fcfCells, num } from '../../helpers/fixture'

const PRECISION = 12
const YEAR_COL: Record<number, string> = { 2019: 'C', 2020: 'D', 2021: 'E' }
const YEARS = [2019, 2020, 2021] as const

function seriesFromRow(row: number): YearKeyedSeries {
  const out: YearKeyedSeries = {}
  for (const y of YEARS) out[y] = num(fcfCells, `${YEAR_COL[y]}${row}`)
  return out
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
    for (const y of YEARS) {
      expect(result.grossCashFlow[y]).toBeCloseTo(
        num(fcfCells, `${YEAR_COL[y]}9`),
        PRECISION,
      )
    }
  })

  it('Total Net Changes in Working Capital (row 14) matches fixture', () => {
    for (const y of YEARS) {
      expect(result.totalWorkingCapitalChange[y]).toBeCloseTo(
        num(fcfCells, `${YEAR_COL[y]}14`),
        PRECISION,
      )
    }
  })

  it('Gross Investment (row 18) matches fixture for 3 years', () => {
    for (const y of YEARS) {
      expect(result.grossInvestment[y]).toBeCloseTo(
        num(fcfCells, `${YEAR_COL[y]}18`),
        PRECISION,
      )
    }
  })

  it('Free Cash Flow (row 20) matches fixture for 3 years', () => {
    for (const y of YEARS) {
      expect(result.freeCashFlow[y]).toBeCloseTo(
        num(fcfCells, `${YEAR_COL[y]}20`),
        PRECISION,
      )
    }
  })

  it('rejects input where capex has a different year set', () => {
    const broken: FcfInput = {
      noplat: { 2019: 1, 2020: 1, 2021: 1 },
      depreciationAddback: { 2019: 0, 2020: 0, 2021: 0 },
      deltaCurrentAssets: { 2019: 0, 2020: 0, 2021: 0 },
      deltaCurrentLiabilities: { 2019: 0, 2020: 0, 2021: 0 },
      capex: { 2020: 0, 2021: 0, 2022: 0 },
    }
    expect(() => computeFcf(broken)).toThrow(/year set mismatch/)
  })
})

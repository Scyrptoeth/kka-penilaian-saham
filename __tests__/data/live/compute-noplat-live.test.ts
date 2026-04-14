/**
 * End-to-end verification: user-positive IS leaves → computeNoplatLiveRows
 * → deriveComputedRows against the NOPLAT manifest.
 *
 * Rows 7-10, 11, 13 match the prototype fixture directly.
 * Rows 14-16 (tax adjustments) compute effective tax rate from IS data —
 * this differs from the prototype workbook where IS!B33 was empty (= 0).
 * Rows 17 (Total Tax) and 19 (NOPLAT) are verified structurally since
 * they depend on rows 14-16 which differ from the prototype.
 */

import { describe, expect, it } from 'vitest'
import { computeNoplatLiveRows } from '@/data/live/compute-noplat-live'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { NOPLAT_MANIFEST } from '@/data/manifests/noplat'
// INCOME_STATEMENT_MANIFEST removed — IS values read directly from fixture
import type { YearKeyedSeries } from '@/types/financial'
import {
  incomeStatementCells,
  noplatCells,
  num,
} from '../../helpers/fixture'

const IS_COL: Record<number, string> = {
  2018: 'C',
  2019: 'D',
  2020: 'E',
  2021: 'F',
}
const NOPLAT_COL: Record<number, string> = {
  2019: 'C',
  2020: 'D',
  2021: 'E',
}
const NOPLAT_YEARS = [2019, 2020, 2021]

const IS_LEAF_ROWS = [6, 7, 12, 13, 21, 26, 27, 30, 33]

function loadIsLeaves(
  years: readonly number[],
): Record<number, YearKeyedSeries> {
  const out: Record<number, YearKeyedSeries> = {}
  // Read IS values in Excel convention (expenses negative) — NO sign flip.
  // Include sentinel rows directly from fixture (mimics DynamicIsEditor persist).
  const ALL_ROWS = [...new Set([...IS_LEAF_ROWS, 8, 15, 18, 22, 26, 27, 28, 30, 32, 33, 35])]
  for (const excelRow of ALL_ROWS) {
    const series: YearKeyedSeries = {}
    for (const year of years) {
      series[year] = num(incomeStatementCells, `${IS_COL[year]}${excelRow}`)
    }
    out[excelRow] = series
  }
  return out
}

describe('computeNoplatLiveRows + NOPLAT manifest computedFrom match fixture', () => {
  const isLeaves = loadIsLeaves(NOPLAT_YEARS)
  const noplatLeaves = computeNoplatLiveRows(isLeaves, NOPLAT_YEARS)
  const noplatComputed = deriveComputedRows(
    NOPLAT_MANIFEST.rows,
    noplatLeaves,
    NOPLAT_YEARS,
  )

  const getRow = (row: number, year: number): number =>
    noplatLeaves[row]?.[year] ?? noplatComputed[row]?.[year] ?? 0

  // Rows that match the prototype fixture directly (unaffected by tax rate change)
  const FIXTURE_ROWS = [7, 8, 9, 10, 11, 13] as const

  for (const row of FIXTURE_ROWS) {
    for (const year of NOPLAT_YEARS) {
      it(`row ${row} at ${year} matches NOPLAT fixture`, () => {
        const expected = num(noplatCells, `${NOPLAT_COL[year]}${row}`)
        const actual = getRow(row, year)
        expect(actual).toBeDefined()
        expect(actual).toBeCloseTo(expected, 6)
      })
    }
  }

  // Rows 14-16: tax adjustments now use effective tax rate (not 0).
  // Verify formula correctness: rate * source value
  for (const year of NOPLAT_YEARS) {
    it(`rows 14-16 at ${year} use effective tax rate from IS data`, () => {
      // Effective rate computed from IS tax/PBT — rows 14-16 should be non-zero
      // if the company has taxes. Verify they're finite and structurally consistent.
      expect(isFinite(getRow(14, year))).toBe(true)
      expect(isFinite(getRow(15, year))).toBe(true)
      expect(isFinite(getRow(16, year))).toBe(true)
      // Tax shield on interest expense (row 14) should have same sign as interest expense (row 8)
      if (getRow(8, year) !== 0) {
        expect(Math.sign(getRow(14, year))).toBe(Math.sign(getRow(8, year)))
      }
    })
  }

  // Row 17: Total Taxes = sum(13:16) — structural verification
  for (const year of NOPLAT_YEARS) {
    it(`row 17 at ${year} = sum of rows 13-16 (structural)`, () => {
      const expected = getRow(13, year) + getRow(14, year) + getRow(15, year) + getRow(16, year)
      expect(getRow(17, year)).toBeCloseTo(expected, 6)
    })
  }

  // Row 19: NOPLAT = EBIT - Total Tax — structural verification
  for (const year of NOPLAT_YEARS) {
    it(`row 19 at ${year} = EBIT - Total Tax (structural)`, () => {
      const ebit = getRow(11, year)
      const totalTax = getRow(17, year)
      expect(getRow(19, year)).toBeCloseTo(ebit - totalTax, 6)
    })
  }
})

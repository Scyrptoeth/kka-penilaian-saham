/**
 * Structural verification for the FA manifest's computedFrom wiring.
 *
 * The FA fixture has all-None values (workbook cells are formula-based
 * without cached computed values), so we use synthetic leaf data to
 * verify that deriveComputedRows correctly propagates through the
 * three-section roll-forward:
 *
 *   A. Acquisition Costs: Beginning + Additions → Ending (per category)
 *   B. Depreciation:      Beginning + Additions → Ending (per category)
 *   C. Net Value:         Ending Acq − Ending Dep (signed refs)
 *
 * This proves the computedFrom wiring matches the workbook formulas:
 *   row 14 = SUM(8:13),  row 23 = SUM(17:22),  row 32 = 14+23
 *   row 26..31 = 8+17 .. 13+22,  row 42 = SUM(36:41), row 51 = SUM(45:50)
 *   row 54..59 = 36+45 .. 41+50,  row 60 = 42+51
 *   row 63..68 = 26-54 .. 31-59 (signed),  row 69 = SUM(63:68)
 */

import { describe, expect, it } from 'vitest'
import { FIXED_ASSET_MANIFEST } from '@/data/manifests/fixed-asset'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import type { YearKeyedSeries } from '@/types/financial'

const YEARS = [2019, 2020, 2021]

// Leaf rows: Beginning Acq (8-13), Additions Acq (17-22),
// Beginning Dep (36-41), Additions Dep (45-50) — 24 total
const LEAF_ROWS = [
  8, 9, 10, 11, 12, 13,   // Beginning Acquisition
  17, 18, 19, 20, 21, 22, // Additions Acquisition
  36, 37, 38, 39, 40, 41, // Beginning Depreciation
  45, 46, 47, 48, 49, 50, // Additions Depreciation
]

/**
 * Generate deterministic synthetic leaf values. Each row/year gets
 * a unique value based on row * 1000 + year to make assertions
 * unambiguous and easy to trace.
 */
function syntheticLeafValues(): Record<number, YearKeyedSeries> {
  const out: Record<number, YearKeyedSeries> = {}
  for (const row of LEAF_ROWS) {
    const series: YearKeyedSeries = {}
    for (const year of YEARS) {
      // Use row * 1000 + (year - 2019) * 100 + 1 to make values unique
      series[year] = row * 1000 + (year - 2019) * 100 + 1
    }
    out[row] = series
  }
  return out
}

describe('FA manifest computedFrom wiring', () => {
  const leafValues = syntheticLeafValues()
  const computed = deriveComputedRows(
    FIXED_ASSET_MANIFEST.rows,
    leafValues,
    YEARS,
  )

  // Helper to get leaf or computed value
  const val = (row: number, year: number): number =>
    leafValues[row]?.[year] ?? computed[row]?.[year] ?? NaN

  describe('Acquisition section', () => {
    for (const year of YEARS) {
      it(`Total Beginning (row 14) at ${year} = SUM(8:13)`, () => {
        const expected = [8, 9, 10, 11, 12, 13].reduce(
          (sum, r) => sum + val(r, year),
          0,
        )
        expect(computed[14]?.[year]).toBe(expected)
      })

      it(`Total Additions (row 23) at ${year} = SUM(17:22)`, () => {
        const expected = [17, 18, 19, 20, 21, 22].reduce(
          (sum, r) => sum + val(r, year),
          0,
        )
        expect(computed[23]?.[year]).toBe(expected)
      })

      // Ending per category: row N+18 = row N + row N+9 (for N in 8..13)
      for (let i = 0; i < 6; i++) {
        const endRow = 26 + i
        const begRow = 8 + i
        const addRow = 17 + i
        it(`Ending category (row ${endRow}) at ${year} = row ${begRow} + row ${addRow}`, () => {
          expect(computed[endRow]?.[year]).toBe(val(begRow, year) + val(addRow, year))
        })
      }

      it(`Total Ending (row 32) at ${year} = row 14 + row 23`, () => {
        expect(computed[32]?.[year]).toBe(val(14, year) + val(23, year))
      })
    }
  })

  describe('Depreciation section', () => {
    for (const year of YEARS) {
      it(`Total Beginning (row 42) at ${year} = SUM(36:41)`, () => {
        const expected = [36, 37, 38, 39, 40, 41].reduce(
          (sum, r) => sum + val(r, year),
          0,
        )
        expect(computed[42]?.[year]).toBe(expected)
      })

      it(`Total Additions (row 51) at ${year} = SUM(45:50)`, () => {
        const expected = [45, 46, 47, 48, 49, 50].reduce(
          (sum, r) => sum + val(r, year),
          0,
        )
        expect(computed[51]?.[year]).toBe(expected)
      })

      for (let i = 0; i < 6; i++) {
        const endRow = 54 + i
        const begRow = 36 + i
        const addRow = 45 + i
        it(`Ending category (row ${endRow}) at ${year} = row ${begRow} + row ${addRow}`, () => {
          expect(computed[endRow]?.[year]).toBe(val(begRow, year) + val(addRow, year))
        })
      }

      it(`Total Ending (row 60) at ${year} = row 42 + row 51`, () => {
        expect(computed[60]?.[year]).toBe(val(42, year) + val(51, year))
      })
    }
  })

  describe('Net Value section (signed refs)', () => {
    for (const year of YEARS) {
      for (let i = 0; i < 6; i++) {
        const netRow = 63 + i
        const acqRow = 26 + i
        const depRow = 54 + i
        it(`Net Value (row ${netRow}) at ${year} = row ${acqRow} − row ${depRow}`, () => {
          expect(computed[netRow]?.[year]).toBe(val(acqRow, year) - val(depRow, year))
        })
      }

      it(`TOTAL NET FIXED ASSETS (row 69) at ${year} = SUM(63:68)`, () => {
        const expected = [63, 64, 65, 66, 67, 68].reduce(
          (sum, r) => sum + val(r, year),
          0,
        )
        expect(computed[69]?.[year]).toBe(expected)
      })
    }
  })

  describe('consistency checks', () => {
    for (const year of YEARS) {
      it(`Total Ending Acq (row 32) equals SUM of Ending categories at ${year}`, () => {
        const sumEnding = [26, 27, 28, 29, 30, 31].reduce(
          (sum, r) => sum + val(r, year),
          0,
        )
        expect(val(32, year)).toBeCloseTo(sumEnding, 10)
      })

      it(`Total Ending Dep (row 60) equals SUM of Ending dep categories at ${year}`, () => {
        const sumEnding = [54, 55, 56, 57, 58, 59].reduce(
          (sum, r) => sum + val(r, year),
          0,
        )
        expect(val(60, year)).toBeCloseTo(sumEnding, 10)
      })

      it(`Total Net (row 69) equals Total Ending Acq − Total Ending Dep at ${year}`, () => {
        expect(val(69, year)).toBeCloseTo(val(32, year) - val(60, year), 10)
      })
    }
  })
})

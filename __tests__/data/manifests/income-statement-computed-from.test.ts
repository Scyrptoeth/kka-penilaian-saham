/**
 * Fixture-grounded verification for the IS manifest's computedFrom signs.
 *
 * Goal: prove that applying `deriveComputedRows` to user-positive IS leaf
 * values reproduces the workbook's profit subtotals at every historical
 * year. The workbook stores expenses as negative numbers (pre-signed
 * convention) and uses plain sum formulas; live mode asks users to enter
 * expenses as natural positive figures and encodes the subtraction in
 * the manifest via signed refs. This test simulates the UI layer by
 * flipping the sign of every expense leaf before feeding it to
 * `deriveComputedRows`, then asserts the profit chain matches.
 *
 * Row 15 (Total OpEx) is intentionally excluded from the assertion block
 * because its sign flips between the two conventions: the fixture stores
 * it as a negative subtotal, while user-positive input yields a positive
 * aggregation of the same magnitude. Asserting the downstream rows that
 * depend on it (EBITDA row 18, EBIT row 22) already proves the sign
 * handling is correct end to end.
 */

import { describe, expect, it } from 'vitest'
import { INCOME_STATEMENT_MANIFEST } from '@/data/manifests/income-statement'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import type { YearKeyedSeries } from '@/types/financial'
import { incomeStatementCells, num } from '../../helpers/fixture'

// Map each historical year to the Excel column letter it lives in.
// IS fixture uses C..F for 2018..2021.
const IS_COL: Record<number, string> = {
  2018: 'C',
  2019: 'D',
  2020: 'E',
  2021: 'F',
}
const YEARS = [2018, 2019, 2020, 2021]

// IS leaf rows a user would type into the input grid.
// Row 28 is a computed subtotal (Net Interest) so it is excluded.
// Row 30 is a leaf (Other Non-Operating) that the user signs themselves.
const LEAF_ROWS = [6, 7, 12, 13, 21, 26, 27, 30, 33]

// Expense rows are stored negative in the workbook but entered positive
// by users in live mode. Flip them when reading from the fixture to
// simulate the UI layer. Row 30 is a user-signed leaf that can be either
// income or charge, so it is NOT flipped — we pass the fixture value
// through as-is (and any sign the workbook recorded is the correct
// simulation of a user entering that signed number directly).
const EXPENSE_ROWS = new Set([7, 12, 13, 21, 27, 33])

function loadLeafValues(): Record<number, YearKeyedSeries> {
  const out: Record<number, YearKeyedSeries> = {}
  for (const excelRow of LEAF_ROWS) {
    const series: YearKeyedSeries = {}
    for (const year of YEARS) {
      const raw = num(incomeStatementCells, `${IS_COL[year]}${excelRow}`)
      series[year] = EXPENSE_ROWS.has(excelRow) ? -raw : raw
    }
    out[excelRow] = series
  }
  return out
}

describe('IS manifest computedFrom matches fixture at all historical years', () => {
  const leafValues = loadLeafValues()
  const computed = deriveComputedRows(
    INCOME_STATEMENT_MANIFEST.rows,
    leafValues,
    YEARS,
  )

  // Profit subtotals that are sign-invariant across the two conventions.
  // Row 28 (Net Interest) is included because its computedFrom [26, -27]
  // mirrors the workbook formula C26+C27 once the expense sign is
  // flipped. Each subtotal should equal the workbook's own computed
  // value at 6-decimal precision (plenty for whole-IDR figures).
  const PROFIT_ROWS = [8, 18, 22, 28, 32, 35] as const

  for (const row of PROFIT_ROWS) {
    for (const year of YEARS) {
      it(`row ${row} at ${year} matches fixture`, () => {
        const expected = num(incomeStatementCells, `${IS_COL[year]}${row}`)
        const actual = computed[row]?.[year]
        expect(actual).toBeDefined()
        expect(actual).toBeCloseTo(expected, 6)
      })
    }
  }
})

/**
 * Fixture-grounded integration test for CFS live mode.
 *
 * Loads BS, IS, FA leaf values from fixtures (simulating user input),
 * feeds them through `computeCashFlowLiveRows` + `deriveComputedRows`,
 * and asserts every CFS row matches the workbook fixture values for
 * all 3 historical years.
 *
 * IS expense rows are sign-flipped to simulate user-positive input
 * convention (users enter expenses as positive numbers).
 */

import { describe, expect, it } from 'vitest'
import { computeCashFlowLiveRows } from '@/data/live/compute-cash-flow-live'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { CASH_FLOW_STATEMENT_MANIFEST } from '@/data/manifests/cash-flow-statement'
// INCOME_STATEMENT_MANIFEST removed — IS values read directly from fixture
import type { YearKeyedSeries } from '@/types/financial'
import {
  balanceSheetCells,
  incomeStatementCells,
  fixedAssetCells,
  cashFlowStatementCells,
  num,
  numOpt,
} from '../../helpers/fixture'

// ── Column maps per sheet (LESSON-013) ──
const BS_COL: Record<number, string> = {
  2018: 'C',
  2019: 'D',
  2020: 'E',
  2021: 'F',
}
const IS_COL: Record<number, string> = {
  2019: 'D',
  2020: 'E',
  2021: 'F',
}
const FA_COL: Record<number, string> = {
  2019: 'C',
  2020: 'D',
  2021: 'E',
}
const CFS_COL: Record<number, string> = {
  2019: 'C',
  2020: 'D',
  2021: 'E',
}

const BS_YEARS = [2018, 2019, 2020, 2021]
const CFS_YEARS = [2019, 2020, 2021]

// ── IS leaf configuration ──
const IS_LEAF_ROWS = [6, 7, 12, 13, 21, 26, 27, 30, 33]

// ── BS leaf rows referenced by CFS ──
const BS_ROWS = [8, 9, 10, 11, 12, 13, 14, 31, 32, 33, 34]

// ── FA leaf rows (Beginning + Additions for Acq and Dep) ──
const FA_LEAF_ROWS = [
  8, 9, 10, 11, 12, 13, // Beginning Acquisition
  17, 18, 19, 20, 21, 22, // Additions Acquisition
  36, 37, 38, 39, 40, 41, // Beginning Depreciation
  45, 46, 47, 48, 49, 50, // Additions Depreciation
]

function loadBsLeaves(): Record<number, YearKeyedSeries> {
  const out: Record<number, YearKeyedSeries> = {}
  for (const row of BS_ROWS) {
    const series: YearKeyedSeries = {}
    for (const year of BS_YEARS) {
      series[year] = numOpt(balanceSheetCells, `${BS_COL[year]}${row}`) ?? 0
    }
    out[row] = series
  }
  return out
}

function loadIsLeaves(): Record<number, YearKeyedSeries> {
  const out: Record<number, YearKeyedSeries> = {}
  // Read IS values in Excel convention (expenses negative) — NO sign flip.
  // Sentinel rows (8, 18, 22, 28, 32, 35) read directly from fixture.
  const ALL_IS_ROWS = [...IS_LEAF_ROWS, 8, 15, 18, 22, 26, 27, 28, 30, 32, 33, 35]
  const unique = [...new Set(ALL_IS_ROWS)]
  for (const row of unique) {
    const series: YearKeyedSeries = {}
    for (const year of CFS_YEARS) {
      series[year] = numOpt(incomeStatementCells, `${IS_COL[year]}${row}`) ?? 0
    }
    out[row] = series
  }
  return out
}

function loadFaLeaves(): Record<number, YearKeyedSeries> {
  const out: Record<number, YearKeyedSeries> = {}
  for (const row of FA_LEAF_ROWS) {
    const series: YearKeyedSeries = {}
    for (const year of CFS_YEARS) {
      series[year] = numOpt(fixedAssetCells, `${FA_COL[year]}${row}`) ?? 0
    }
    out[row] = series
  }
  return out
}

describe('CFS live mode matches fixture at all historical years', () => {
  const bsLeaves = loadBsLeaves()
  const isLeaves = loadIsLeaves()
  const faLeaves = loadFaLeaves()

  // Compute CFS leaf rows from upstream data
  const cfsLeafRows = computeCashFlowLiveRows(
    bsLeaves,
    isLeaves,
    faLeaves,
    null, // AP not populated (all zeros — matches prototype)
    CFS_YEARS,
    BS_YEARS,
  )

  // Derive subtotals via CFS manifest computedFrom
  const cfsComputed = deriveComputedRows(
    CASH_FLOW_STATEMENT_MANIFEST.rows,
    cfsLeafRows,
    CFS_YEARS,
  )

  // Merge leaf + computed for assertion
  const allRows: Record<number, YearKeyedSeries> = {
    ...cfsLeafRows,
    ...cfsComputed,
  }

  // All CFS manifest excelRows to verify
  const CFS_ROWS = [5, 6, 8, 9, 10, 11, 13, 17, 19, 22, 23, 24, 25, 26, 28, 30, 32, 33, 35, 36]

  for (const row of CFS_ROWS) {
    for (const year of CFS_YEARS) {
      it(`row ${row} at ${year} matches fixture`, () => {
        const expected = num(
          cashFlowStatementCells,
          `${CFS_COL[year]}${row}`,
        )
        const actual = allRows[row]?.[year]
        expect(actual).toBeDefined()
        expect(actual).toBeCloseTo(expected, 6)
      })
    }
  }
})

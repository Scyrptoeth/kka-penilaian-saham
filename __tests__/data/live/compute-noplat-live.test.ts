/**
 * End-to-end verification: user-positive IS leaves → computeNoplatLiveRows
 * → deriveComputedRows against the NOPLAT manifest → match the workbook's
 * own NOPLAT fixture values for rows 7, 8, 9, 10, 11, 13, 17, 19.
 *
 * This is the fixture-grounded guard the Session 011 plan asks for on
 * Task 4: if the sign handling in compute-noplat-live.ts drifts even
 * one row, the NOPLAT number on /analysis/noplat will no longer match
 * the workbook. The test catches that before the user ever sees it.
 */

import { describe, expect, it } from 'vitest'
import { computeNoplatLiveRows } from '@/data/live/compute-noplat-live'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { NOPLAT_MANIFEST } from '@/data/manifests/noplat'
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
// NOPLAT fixture only carries 2019–2021 (columns C, D, E). Tests verify
// that the three-year NOPLAT window derived from IS matches.
const NOPLAT_COL: Record<number, string> = {
  2019: 'C',
  2020: 'D',
  2021: 'E',
}
const NOPLAT_YEARS = [2019, 2020, 2021]

// Mirror Task 2 sign-flip: IS workbook stores expenses negative but the
// live slice holds user-positive values, so flip on the way in.
const IS_LEAF_ROWS = [6, 7, 12, 13, 21, 26, 27, 30, 33]
const IS_EXPENSE_ROWS = new Set([7, 12, 13, 21, 27, 33])

function loadIsLeaves(
  years: readonly number[],
): Record<number, YearKeyedSeries> {
  const out: Record<number, YearKeyedSeries> = {}
  for (const excelRow of IS_LEAF_ROWS) {
    const series: YearKeyedSeries = {}
    for (const year of years) {
      const raw = num(incomeStatementCells, `${IS_COL[year]}${excelRow}`)
      series[year] = IS_EXPENSE_ROWS.has(excelRow) ? -raw : raw
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

  // All rows the end-to-end pipeline produces, mapped to the fixture
  // column in the NOPLAT sheet (which uses its own C/D/E layout).
  const ROWS_TO_VERIFY = [7, 8, 9, 10, 11, 13, 17, 19] as const

  for (const row of ROWS_TO_VERIFY) {
    for (const year of NOPLAT_YEARS) {
      it(`row ${row} at ${year} matches NOPLAT fixture`, () => {
        const expected = num(noplatCells, `${NOPLAT_COL[year]}${row}`)
        // Leaves come from computeNoplatLiveRows; subtotals (11, 17, 19)
        // come from deriveComputedRows against the manifest.
        const actual =
          noplatLeaves[row]?.[year] ?? noplatComputed[row]?.[year]
        expect(actual).toBeDefined()
        expect(actual).toBeCloseTo(expected, 6)
      })
    }
  }
})

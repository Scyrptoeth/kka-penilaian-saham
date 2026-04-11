/**
 * Fixed Asset Schedule tests — validated against real Excel ground truth.
 *
 * Fixture: __tests__/fixtures/fixed-asset.json (extracted from kka-penilaian-saham.xlsx)
 *
 * Year columns: C = 2019, D = 2020, E = 2021.
 *
 * Section A — Acquisition Costs:
 *   Beginning rows 8..13 (Land..Electrical), Total 14
 *   Additions rows 17..22,                  Total 23
 *   Ending    rows 26..31,                  Total 32
 * Section B — Depreciation:
 *   Beginning rows 36..41, Total 42
 *   Additions rows 45..50, Total 51
 *   Ending    rows 54..59, Total 60
 * Net Value:
 *   Per category rows 63..68, Total 69
 */

import { describe, expect, it } from 'vitest'
import {
  computeFixedAssetSchedule,
  type FixedAssetInput,
} from '@/lib/calculations/fixed-asset'
import type { YearKeyedSeries } from '@/types/financial'
import { fixedAssetCells, num } from '../../helpers/fixture'

const PRECISION = 12
const YEAR_COL: Record<number, string> = { 2019: 'C', 2020: 'D', 2021: 'E' }
const YEARS = [2019, 2020, 2021] as const

function seriesFromRow(row: number): YearKeyedSeries {
  const out: YearKeyedSeries = {}
  for (const year of YEARS) {
    out[year] = num(fixedAssetCells, `${YEAR_COL[year]}${row}`)
  }
  return out
}

const CATEGORY_NAMES = [
  'Land',
  'Building',
  'Equipment & Laboratory',
  'Vehicle & Heavy Equipment',
  'Office Inventory',
  'Electrical Installation',
] as const

const CATEGORY_ROWS = [
  { acqBegin: 8, acqAdd: 17, depBegin: 36, depAdd: 45 },
  { acqBegin: 9, acqAdd: 18, depBegin: 37, depAdd: 46 },
  { acqBegin: 10, acqAdd: 19, depBegin: 38, depAdd: 47 },
  { acqBegin: 11, acqAdd: 20, depBegin: 39, depAdd: 48 },
  { acqBegin: 12, acqAdd: 21, depBegin: 40, depAdd: 49 },
  { acqBegin: 13, acqAdd: 22, depBegin: 41, depAdd: 50 },
]

function buildInputFromFixture(): FixedAssetInput {
  return {
    categories: CATEGORY_NAMES.map((name, i) => ({
      name,
      acquisitionBeginning: seriesFromRow(CATEGORY_ROWS[i].acqBegin),
      acquisitionAdditions: seriesFromRow(CATEGORY_ROWS[i].acqAdd),
      depreciationBeginning: seriesFromRow(CATEGORY_ROWS[i].depBegin),
      depreciationAdditions: seriesFromRow(CATEGORY_ROWS[i].depAdd),
    })),
  }
}

describe('computeFixedAssetSchedule — validated against FIXED ASSET fixture', () => {
  const result = computeFixedAssetSchedule(buildInputFromFixture())

  it('Total Acquisition Ending (row 32) matches fixture for all 3 years', () => {
    for (const y of YEARS) {
      expect(result.totals.acquisitionEnding[y]).toBeCloseTo(
        num(fixedAssetCells, `${YEAR_COL[y]}32`),
        PRECISION,
      )
    }
  })

  it('Total Depreciation Ending (row 60) matches fixture for all 3 years', () => {
    for (const y of YEARS) {
      expect(result.totals.depreciationEnding[y]).toBeCloseTo(
        num(fixedAssetCells, `${YEAR_COL[y]}60`),
        PRECISION,
      )
    }
  })

  it('Total Net Value (row 69) matches fixture for all 3 years', () => {
    for (const y of YEARS) {
      expect(result.totals.netValue[y]).toBeCloseTo(
        num(fixedAssetCells, `${YEAR_COL[y]}69`),
        PRECISION,
      )
    }
  })

  it('Vehicle & Heavy Equipment ending depreciation matches fixture row 57', () => {
    const vehicle = result.categories[3]
    for (const y of YEARS) {
      expect(vehicle.depreciationEnding[y]).toBeCloseTo(
        num(fixedAssetCells, `${YEAR_COL[y]}57`),
        PRECISION,
      )
    }
  })

  it('Office Inventory net value matches fixture row 67 across 3 years', () => {
    const office = result.categories[4]
    for (const y of YEARS) {
      expect(office.netValue[y]).toBeCloseTo(
        num(fixedAssetCells, `${YEAR_COL[y]}67`),
        PRECISION,
      )
    }
  })

  it('Total depreciation additions (row 51) exposed for FCF consumption', () => {
    for (const y of YEARS) {
      expect(result.totals.depreciationAdditions[y]).toBeCloseTo(
        num(fixedAssetCells, `${YEAR_COL[y]}51`),
        PRECISION,
      )
    }
  })

  it('rejects input where category series have mismatched years', () => {
    const broken: FixedAssetInput = {
      categories: [
        {
          name: 'X',
          acquisitionBeginning: { 2019: 0, 2020: 0, 2021: 0 },
          acquisitionAdditions: { 2019: 0, 2020: 0, 2022: 0 },
          depreciationBeginning: { 2019: 0, 2020: 0, 2021: 0 },
          depreciationAdditions: { 2019: 0, 2020: 0, 2021: 0 },
        },
      ],
    }
    expect(() => computeFixedAssetSchedule(broken)).toThrow(/year set mismatch/)
  })
})

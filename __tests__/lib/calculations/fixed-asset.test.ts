/**
 * Fixed Asset Schedule tests — verified against real Excel ground truth.
 *
 * Fixture: __tests__/fixtures/fixed-asset.json (extracted from kka-penilaian-saham.xlsx)
 *
 * Sheet layout on `FIXED ASSET`:
 *   Year columns: C = 2019, D = 2020, E = 2021
 *
 *   Section A — Acquisition Costs:
 *     Beginning: rows 8 (Land), 9 (Building), 10 (Equipment Lab), 11 (Vehicle),
 *                12 (Office Inventory), 13 (Electrical); Total row 14.
 *     Additions: rows 17..22 (same order); Total row 23.
 *     Ending:    rows 26..31 (same order); Total row 32.
 *
 *   Section B — Depreciation:
 *     Beginning: rows 36..41; Total row 42.
 *     Additions: rows 45..50; Total row 51.
 *     Ending:    rows 54..59; Total row 60.
 *
 *   Net Value (= Acquisition Ending − Depreciation Ending):
 *     Per category rows 63..68; Total row 69.
 *
 * Formulas mirrored:
 *   AcquisitionEnding[cat, year] = AcquisitionBeginning + AcquisitionAdditions
 *     (this workbook has no disposals column in the data rows)
 *   DepreciationEnding[cat, year] = DepreciationBeginning + DepreciationAdditions
 *   NetValue[cat, year]           = AcquisitionEnding − DepreciationEnding
 *   Total rows                    = SUM across 6 categories
 */

import { describe, expect, it } from 'vitest'
import {
  computeFixedAssetSchedule,
  type FixedAssetInput,
} from '@/lib/calculations/fixed-asset'
import { fixedAssetCells, num } from '../../helpers/fixture'

const PRECISION = 12
const YEAR_COLS = ['C', 'D', 'E'] as const
const CATEGORY_NAMES = [
  'Land',
  'Building',
  'Equipment & Laboratory',
  'Vehicle & Heavy Equipment',
  'Office Inventory',
  'Electrical Installation',
] as const

type CategoryRowMap = {
  acqBegin: number
  acqAdd: number
  depBegin: number
  depAdd: number
}

// Row indices per category, in the same order as CATEGORY_NAMES.
const CATEGORY_ROWS: CategoryRowMap[] = [
  { acqBegin: 8, acqAdd: 17, depBegin: 36, depAdd: 45 },
  { acqBegin: 9, acqAdd: 18, depBegin: 37, depAdd: 46 },
  { acqBegin: 10, acqAdd: 19, depBegin: 38, depAdd: 47 },
  { acqBegin: 11, acqAdd: 20, depBegin: 39, depAdd: 48 },
  { acqBegin: 12, acqAdd: 21, depBegin: 40, depAdd: 49 },
  { acqBegin: 13, acqAdd: 22, depBegin: 41, depAdd: 50 },
]

function seriesFromRow(row: number): number[] {
  return YEAR_COLS.map((col) => num(fixedAssetCells, `${col}${row}`))
}

function buildInputFromFixture(): FixedAssetInput {
  return {
    years: YEAR_COLS.length,
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
    expect(result.totals.acquisitionEnding[0]).toBeCloseTo(
      num(fixedAssetCells, 'C32'),
      PRECISION,
    )
    expect(result.totals.acquisitionEnding[1]).toBeCloseTo(
      num(fixedAssetCells, 'D32'),
      PRECISION,
    )
    expect(result.totals.acquisitionEnding[2]).toBeCloseTo(
      num(fixedAssetCells, 'E32'),
      PRECISION,
    )
  })

  it('Total Depreciation Ending (row 60) matches fixture for all 3 years', () => {
    expect(result.totals.depreciationEnding[0]).toBeCloseTo(
      num(fixedAssetCells, 'C60'),
      PRECISION,
    )
    expect(result.totals.depreciationEnding[1]).toBeCloseTo(
      num(fixedAssetCells, 'D60'),
      PRECISION,
    )
    expect(result.totals.depreciationEnding[2]).toBeCloseTo(
      num(fixedAssetCells, 'E60'),
      PRECISION,
    )
  })

  it('Total Net Value (row 69) matches fixture for all 3 years', () => {
    expect(result.totals.netValue[0]).toBeCloseTo(
      num(fixedAssetCells, 'C69'),
      PRECISION,
    )
    expect(result.totals.netValue[1]).toBeCloseTo(
      num(fixedAssetCells, 'D69'),
      PRECISION,
    )
    expect(result.totals.netValue[2]).toBeCloseTo(
      num(fixedAssetCells, 'E69'),
      PRECISION,
    )
  })

  it('Vehicle & Heavy Equipment ending depreciation matches fixture rows 57', () => {
    const vehicle = result.categories[3]
    expect(vehicle.depreciationEnding[0]).toBeCloseTo(
      num(fixedAssetCells, 'C57'),
      PRECISION,
    )
    expect(vehicle.depreciationEnding[1]).toBeCloseTo(
      num(fixedAssetCells, 'D57'),
      PRECISION,
    )
    expect(vehicle.depreciationEnding[2]).toBeCloseTo(
      num(fixedAssetCells, 'E57'),
      PRECISION,
    )
  })

  it('Office Inventory net value matches fixture row 67 across 3 years', () => {
    const office = result.categories[4]
    expect(office.netValue[0]).toBeCloseTo(num(fixedAssetCells, 'C67'), PRECISION)
    expect(office.netValue[1]).toBeCloseTo(num(fixedAssetCells, 'D67'), PRECISION)
    expect(office.netValue[2]).toBeCloseTo(num(fixedAssetCells, 'E67'), PRECISION)
  })

  it('Total FCF-consumed depreciation additions (row 51) is exposed for downstream use', () => {
    expect(result.totals.depreciationAdditions[0]).toBeCloseTo(
      num(fixedAssetCells, 'C51'),
      PRECISION,
    )
    expect(result.totals.depreciationAdditions[1]).toBeCloseTo(
      num(fixedAssetCells, 'D51'),
      PRECISION,
    )
    expect(result.totals.depreciationAdditions[2]).toBeCloseTo(
      num(fixedAssetCells, 'E51'),
      PRECISION,
    )
  })
})

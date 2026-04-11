/**
 * Fixed Asset Schedule calculations.
 *
 * Mirrors formulas from the `FIXED ASSET` worksheet in kka-penilaian-saham.xlsx.
 *
 * Three sections per category (6 canonical categories: Land, Building,
 * Equipment & Laboratory, Vehicle & Heavy Equipment, Office Inventory,
 * Electrical — but the module accepts any set of categories):
 *
 *   1. Acquisition Costs:
 *        Ending = Beginning + Additions − Disposals
 *   2. Accumulated Depreciation:
 *        Ending = Beginning + Additions − Disposals
 *   3. Net Value:
 *        Net = Acquisition Ending − Depreciation Ending
 *
 * Each series is a {@link YearKeyedSeries}. All inputs of a single call must
 * share the same year set — validated via {@link assertSameYears}. Totals are
 * year-wise sums across categories.
 */

import type { YearKeyedSeries } from '@/types/financial'
import { assertSameYears, emptySeriesLike, yearsOf } from './helpers'

export interface FixedAssetCategoryInput {
  name: string
  acquisitionBeginning: YearKeyedSeries
  acquisitionAdditions: YearKeyedSeries
  acquisitionDisposals?: YearKeyedSeries
  depreciationBeginning: YearKeyedSeries
  depreciationAdditions: YearKeyedSeries
  depreciationDisposals?: YearKeyedSeries
}

export interface FixedAssetInput {
  categories: readonly FixedAssetCategoryInput[]
}

export interface FixedAssetCategorySchedule {
  name: string
  acquisitionBeginning: YearKeyedSeries
  acquisitionAdditions: YearKeyedSeries
  acquisitionDisposals: YearKeyedSeries
  acquisitionEnding: YearKeyedSeries
  depreciationBeginning: YearKeyedSeries
  depreciationAdditions: YearKeyedSeries
  depreciationDisposals: YearKeyedSeries
  depreciationEnding: YearKeyedSeries
  netValue: YearKeyedSeries
}

export interface FixedAssetTotals {
  acquisitionBeginning: YearKeyedSeries
  acquisitionAdditions: YearKeyedSeries
  acquisitionDisposals: YearKeyedSeries
  acquisitionEnding: YearKeyedSeries
  depreciationBeginning: YearKeyedSeries
  depreciationAdditions: YearKeyedSeries
  depreciationDisposals: YearKeyedSeries
  depreciationEnding: YearKeyedSeries
  netValue: YearKeyedSeries
}

export interface FixedAssetSchedule {
  categories: FixedAssetCategorySchedule[]
  totals: FixedAssetTotals
}

/** Returns a fresh zeroed series keyed to the same years as `template`. */
function zerosLike(template: YearKeyedSeries): YearKeyedSeries {
  return emptySeriesLike(template)
}

/** Accumulates `source` into `target` in-place, key by key. */
function addInto(target: YearKeyedSeries, source: YearKeyedSeries): void {
  for (const y of yearsOf(source)) target[y] += source[y]
}

/**
 * Compute the full fixed asset schedule from input rows.
 *
 * Pure — no mutation of inputs, no side effects. Every series in every
 * category must share the same year set as the first category's
 * `acquisitionBeginning`.
 */
export function computeFixedAssetSchedule(
  input: FixedAssetInput,
): FixedAssetSchedule {
  const { categories } = input
  if (categories.length === 0) {
    throw new RangeError('fixed-asset: at least one category required')
  }

  const anchor = categories[0].acquisitionBeginning
  const years = yearsOf(anchor)
  if (years.length === 0) {
    throw new RangeError('fixed-asset: anchor series must have at least one year')
  }

  const categorySchedules: FixedAssetCategorySchedule[] = categories.map(
    (cat, idx) => {
      const label = (field: string) => `fixed-asset.categories[${idx}].${field}`

      const acquisitionBeginning = { ...cat.acquisitionBeginning }
      assertSameYears(label('acquisitionBeginning'), anchor, acquisitionBeginning)

      const acquisitionAdditions = { ...cat.acquisitionAdditions }
      assertSameYears(label('acquisitionAdditions'), anchor, acquisitionAdditions)

      const acquisitionDisposals = cat.acquisitionDisposals
        ? { ...cat.acquisitionDisposals }
        : zerosLike(anchor)
      assertSameYears(label('acquisitionDisposals'), anchor, acquisitionDisposals)

      const depreciationBeginning = { ...cat.depreciationBeginning }
      assertSameYears(
        label('depreciationBeginning'),
        anchor,
        depreciationBeginning,
      )

      const depreciationAdditions = { ...cat.depreciationAdditions }
      assertSameYears(
        label('depreciationAdditions'),
        anchor,
        depreciationAdditions,
      )

      const depreciationDisposals = cat.depreciationDisposals
        ? { ...cat.depreciationDisposals }
        : zerosLike(anchor)
      assertSameYears(
        label('depreciationDisposals'),
        anchor,
        depreciationDisposals,
      )

      const acquisitionEnding: YearKeyedSeries = {}
      const depreciationEnding: YearKeyedSeries = {}
      const netValue: YearKeyedSeries = {}

      for (const y of years) {
        acquisitionEnding[y] =
          acquisitionBeginning[y] + acquisitionAdditions[y] - acquisitionDisposals[y]
        depreciationEnding[y] =
          depreciationBeginning[y] + depreciationAdditions[y] - depreciationDisposals[y]
        netValue[y] = acquisitionEnding[y] - depreciationEnding[y]
      }

      return {
        name: cat.name,
        acquisitionBeginning,
        acquisitionAdditions,
        acquisitionDisposals,
        acquisitionEnding,
        depreciationBeginning,
        depreciationAdditions,
        depreciationDisposals,
        depreciationEnding,
        netValue,
      }
    },
  )

  const totals: FixedAssetTotals = {
    acquisitionBeginning: zerosLike(anchor),
    acquisitionAdditions: zerosLike(anchor),
    acquisitionDisposals: zerosLike(anchor),
    acquisitionEnding: zerosLike(anchor),
    depreciationBeginning: zerosLike(anchor),
    depreciationAdditions: zerosLike(anchor),
    depreciationDisposals: zerosLike(anchor),
    depreciationEnding: zerosLike(anchor),
    netValue: zerosLike(anchor),
  }

  for (const cat of categorySchedules) {
    addInto(totals.acquisitionBeginning, cat.acquisitionBeginning)
    addInto(totals.acquisitionAdditions, cat.acquisitionAdditions)
    addInto(totals.acquisitionDisposals, cat.acquisitionDisposals)
    addInto(totals.acquisitionEnding, cat.acquisitionEnding)
    addInto(totals.depreciationBeginning, cat.depreciationBeginning)
    addInto(totals.depreciationAdditions, cat.depreciationAdditions)
    addInto(totals.depreciationDisposals, cat.depreciationDisposals)
    addInto(totals.depreciationEnding, cat.depreciationEnding)
    addInto(totals.netValue, cat.netValue)
  }

  return { categories: categorySchedules, totals }
}

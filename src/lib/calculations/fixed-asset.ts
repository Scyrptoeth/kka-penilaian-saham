/**
 * Fixed Asset Schedule calculations.
 *
 * Mirrors formulas from the `FIXED ASSET` worksheet in kka-penilaian-saham.xlsx.
 *
 * Three sections per category (6 categories: Land, Building, Equipment &
 * Laboratory, Vehicle & Heavy Equipment, Office Inventory, Electrical):
 *
 *   1. Acquisition Costs:
 *        Ending = Beginning + Additions − Disposals
 *   2. Accumulated Depreciation:
 *        Ending = Beginning + Additions − Disposals
 *   3. Net Value:
 *        Net = Acquisition Ending − Depreciation Ending
 *
 * Each series is an array of length N (number of years). Totals are row-wise
 * sums across categories. Downstream consumers (FCF, Cash Flow Statement) use
 * `totals.depreciationAdditions` as the current-period depreciation expense.
 */

export interface FixedAssetCategoryInput {
  name: string
  acquisitionBeginning: readonly number[]
  acquisitionAdditions: readonly number[]
  acquisitionDisposals?: readonly number[]
  depreciationBeginning: readonly number[]
  depreciationAdditions: readonly number[]
  depreciationDisposals?: readonly number[]
}

export interface FixedAssetInput {
  years: number
  categories: readonly FixedAssetCategoryInput[]
}

export interface FixedAssetCategorySchedule {
  name: string
  acquisitionBeginning: number[]
  acquisitionAdditions: number[]
  acquisitionDisposals: number[]
  acquisitionEnding: number[]
  depreciationBeginning: number[]
  depreciationAdditions: number[]
  depreciationDisposals: number[]
  depreciationEnding: number[]
  netValue: number[]
}

export interface FixedAssetTotals {
  acquisitionBeginning: number[]
  acquisitionAdditions: number[]
  acquisitionDisposals: number[]
  acquisitionEnding: number[]
  depreciationBeginning: number[]
  depreciationAdditions: number[]
  depreciationDisposals: number[]
  depreciationEnding: number[]
  netValue: number[]
}

export interface FixedAssetSchedule {
  categories: FixedAssetCategorySchedule[]
  totals: FixedAssetTotals
}

function zeros(length: number): number[] {
  return Array.from({ length }, () => 0)
}

function defaulted(
  source: readonly number[] | undefined,
  length: number,
): number[] {
  if (!source) return zeros(length)
  if (source.length !== length) {
    throw new RangeError(
      `fixed-asset: expected series of length ${length}, got ${source.length}`,
    )
  }
  return source.slice()
}

function addInto(target: number[], source: readonly number[]): void {
  for (let i = 0; i < target.length; i++) target[i] += source[i]
}

function combine(
  years: number,
  beginning: readonly number[],
  additions: readonly number[],
  disposals: readonly number[],
): number[] {
  const out = zeros(years)
  for (let i = 0; i < years; i++) {
    out[i] = beginning[i] + additions[i] - disposals[i]
  }
  return out
}

/**
 * Compute the full fixed asset schedule from input rows.
 *
 * Pure — no mutation of inputs, no side effects. Validates that every series
 * has the expected length.
 */
export function computeFixedAssetSchedule(
  input: FixedAssetInput,
): FixedAssetSchedule {
  const { years, categories } = input
  if (years <= 0) {
    throw new RangeError('fixed-asset: years must be > 0')
  }

  const categorySchedules: FixedAssetCategorySchedule[] = categories.map(
    (cat) => {
      const acquisitionBeginning = defaulted(cat.acquisitionBeginning, years)
      const acquisitionAdditions = defaulted(cat.acquisitionAdditions, years)
      const acquisitionDisposals = defaulted(cat.acquisitionDisposals, years)
      const depreciationBeginning = defaulted(cat.depreciationBeginning, years)
      const depreciationAdditions = defaulted(cat.depreciationAdditions, years)
      const depreciationDisposals = defaulted(cat.depreciationDisposals, years)

      const acquisitionEnding = combine(
        years,
        acquisitionBeginning,
        acquisitionAdditions,
        acquisitionDisposals,
      )
      const depreciationEnding = combine(
        years,
        depreciationBeginning,
        depreciationAdditions,
        depreciationDisposals,
      )
      const netValue = zeros(years)
      for (let i = 0; i < years; i++) {
        netValue[i] = acquisitionEnding[i] - depreciationEnding[i]
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
    acquisitionBeginning: zeros(years),
    acquisitionAdditions: zeros(years),
    acquisitionDisposals: zeros(years),
    acquisitionEnding: zeros(years),
    depreciationBeginning: zeros(years),
    depreciationAdditions: zeros(years),
    depreciationDisposals: zeros(years),
    depreciationEnding: zeros(years),
    netValue: zeros(years),
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

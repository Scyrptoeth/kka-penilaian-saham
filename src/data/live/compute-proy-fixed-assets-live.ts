/**
 * PROY Fixed Assets — Per-account Net Value growth projection (Session 036).
 *
 * Each account in `fixedAsset.accounts` projects its 7 bands (Acq
 * Begin/Add/End, Dep Begin/Add/End, Net Value) using the per-account
 * average YoY growth computed from its NET VALUE historical series.
 *
 * Display semantics (page layer):
 * - Net Value band (rows 63-68 or offset 7000) is visible across hist
 *   + projection years.
 * - Acq/Dep bands display "—" in projection years (but values are
 *   COMPUTED in this output so downstream cascade is preserved —
 *   PROY LR reads row 51 Total Dep Additions).
 *
 * Why uniform growth across all 7 bands: Net Value growth captures
 * how FA scales over time; applying the same rate to Acq/Dep preserves
 * their relative proportions and keeps Dep Additions non-zero in
 * projection years so PROY LR depreciation schedule remains meaningful.
 *
 * Subtotals (rows 14/23/32/42/51/60/69) sum per-account values per band
 * at each year.
 */

import type { YearKeyedSeries } from '@/types/financial'
import type { FaAccountEntry } from '@/data/catalogs/fixed-asset-catalog'
import { FA_OFFSET, FA_SUBTOTAL } from '@/data/catalogs/fixed-asset-catalog'
import { computeAvgGrowth } from '@/lib/calculations/helpers'

/** All 7 band offsets in the FA schedule. */
const ALL_BAND_OFFSETS = Object.values(FA_OFFSET) as readonly number[]

/** Map from FA_OFFSET value → corresponding SUBTOTAL row number. */
const BAND_OFFSET_TO_SUBTOTAL: Record<number, number> = {
  [FA_OFFSET.ACQ_BEGINNING]: FA_SUBTOTAL.TOTAL_ACQ_BEGINNING,
  [FA_OFFSET.ACQ_ADDITIONS]: FA_SUBTOTAL.TOTAL_ACQ_ADDITIONS,
  [FA_OFFSET.ACQ_ENDING]: FA_SUBTOTAL.TOTAL_ACQ_ENDING,
  [FA_OFFSET.DEP_BEGINNING]: FA_SUBTOTAL.TOTAL_DEP_BEGINNING,
  [FA_OFFSET.DEP_ADDITIONS]: FA_SUBTOTAL.TOTAL_DEP_ADDITIONS,
  [FA_OFFSET.DEP_ENDING]: FA_SUBTOTAL.TOTAL_DEP_ENDING,
  [FA_OFFSET.NET_VALUE]: FA_SUBTOTAL.TOTAL_NET_VALUE,
}

export interface ProyFaInput {
  /** All user-selected FA accounts from `fixedAsset.accounts`. */
  accounts: readonly FaAccountEntry[]
  /** Historical FA rows (leaves + computed bands + sentinels), keyed by excelRow. */
  faRows: Readonly<Record<number, YearKeyedSeries>>
  /** Historical years (ascending). Last entry = histYear (seed for projection). */
  historicalYears: readonly number[]
}

/**
 * Legacy growth helper retained for any remaining call sites.
 * Returns average YoY growth of an additions series.
 */
export function computeFaGrowthRate(
  additions: YearKeyedSeries | undefined,
  years: readonly number[],
): number {
  if (!additions || years.length < 2) return 0
  const growths: number[] = []
  for (let i = 1; i < years.length; i++) {
    const prev = additions[years[i - 1]!] ?? 0
    const curr = additions[years[i]!] ?? 0
    if (prev === 0) {
      growths.push(0)
    } else {
      growths.push((curr - prev) / prev)
    }
  }
  if (growths.length === 0) return 0
  return growths.reduce((s, g) => s + g, 0) / growths.length
}

/**
 * Project each FA account's 7 bands via its Net Value avg YoY growth.
 * Subtotals (FA_SUBTOTAL rows) sum across accounts per band per year.
 *
 * @param input See ProyFaInput
 * @param projYears Projection years (ascending)
 * @returns Record keyed by excelRow covering histYear + projYears.
 *   Includes: per-account bands at (excelRow + offset) keys, and
 *   SUBTOTAL rows (14/23/32/42/51/60/69).
 */
export function computeProyFixedAssetsLive(
  input: ProyFaInput,
  projYears: readonly number[],
): Record<number, YearKeyedSeries> {
  const { accounts, faRows, historicalYears } = input
  if (historicalYears.length === 0) return {}
  const histYear = historicalYears[historicalYears.length - 1]!
  const allYears = [histYear, ...projYears]
  const result: Record<number, YearKeyedSeries> = {}

  // 1. Per-account projection across all 7 bands at the same growth rate
  for (const acct of accounts) {
    const netValueSeries = faRows[acct.excelRow + FA_OFFSET.NET_VALUE] ?? {}
    const netGrowth = computeAvgGrowth(netValueSeries)

    for (const offset of ALL_BAND_OFFSETS) {
      const key = acct.excelRow + offset
      const historicalBand = faRows[key] ?? {}
      const seed = historicalBand[histYear] ?? 0
      const bandSeries: YearKeyedSeries = {}
      bandSeries[histYear] = seed
      let prev = seed
      for (const year of projYears) {
        const next = prev * (1 + netGrowth)
        bandSeries[year] = next
        prev = next
      }
      result[key] = bandSeries
    }
  }

  // 2. Per-band subtotals — sum across accounts at each year
  for (const offset of ALL_BAND_OFFSETS) {
    const subtotalRow = BAND_OFFSET_TO_SUBTOTAL[offset]!
    const totals: YearKeyedSeries = {}
    for (const year of allYears) {
      let sum = 0
      for (const acct of accounts) {
        sum += result[acct.excelRow + offset]?.[year] ?? 0
      }
      totals[year] = sum
    }
    result[subtotalRow] = totals
  }

  return result
}

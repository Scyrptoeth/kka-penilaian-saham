/**
 * Key Drivers auto-computed values (Session 050).
 *
 * Unified derivation of all auto-populated read-only values shown on the
 * INPUT DATA → Key Drivers page:
 *
 *   - cogsRatio             = avg |COGS / Revenue| across histYears
 *   - sellingExpenseRatio   = avg |TotalOpEx / Revenue| / 2
 *   - gaExpenseRatio        = avg |TotalOpEx / Revenue| / 2
 *   - additionalCapexByAccount
 *                           = per-account ACQ_ADDITIONS band from
 *                             `computeProyFixedAssetsLive` over an
 *                             extended 7-year projection horizon
 *
 * Sign convention: ratios stored POSITIVE. Export boundary
 * (KeyDriversBuilder → `reconcileRatioSigns`) negates on write
 * (Session 040 LESSON-112 preserved).
 *
 * Selling / G&A split: IS catalog does not distinguish Selling vs G&A —
 * both are aggregated into row 15 "Total Operating Expenses (excl.
 * Depreciation)". Per user spec (Q1 Session 050), display the aggregate
 * ratio split equally 50/50 across the two fields.
 */

import type { FaAccountEntry } from '@/data/catalogs/fixed-asset-catalog'
import { FA_OFFSET } from '@/data/catalogs/fixed-asset-catalog'
import type { YearKeyedSeries } from '@/types/financial'
import { averageSeries } from './derivation-helpers'
import { ratioOfBase } from './helpers'
import { computeProyFixedAssetsLive } from '@/data/live/compute-proy-fixed-assets-live'

/** IS row numbers consumed by this helper. */
const IS_REVENUE_ROW = 6
const IS_TOTAL_COGS_ROW = 7
const IS_TOTAL_OPEX_ROW = 15

export interface KdAutoValuesInput {
  /** Income Statement rows from store (leaves + sentinels), keyed by excelRow. */
  isRows: Readonly<Record<number, YearKeyedSeries>>
  /**
   * Historical years for IS ratio averaging (ascending).
   *
   * IS store slice defaults to 4 historical years; this span is used for
   * cogsRatio + totalOpExRatio averages. Alias of `histYears` for callers
   * that share the same year set across IS and FA.
   */
  isHistYears: readonly number[]
  /** User-selected Fixed Asset accounts. */
  faAccounts: readonly FaAccountEntry[]
  /** Historical FA rows (leaves + computed bands + sentinels), keyed by excelRow. */
  faRows: Readonly<Record<number, YearKeyedSeries>>
  /**
   * Historical years for FA roll-forward seed (ascending).
   *
   * FA store slice defaults to 3 historical years; last entry seeds the
   * first projection year. Decoupled from `isHistYears` because sheets use
   * different historical spans.
   */
  faHistYears: readonly number[]
  /** Projection years for Additional Capex (typically 7 for KD). */
  projYears: readonly number[]
}

export interface KdAutoValues {
  cogsRatio: number
  sellingExpenseRatio: number
  gaExpenseRatio: number
  additionalCapexByAccount: Record<number, YearKeyedSeries>
}

/**
 * Compute avg common-size ratio |line / Revenue| across histYears, using
 * {@link averageSeries} leading-zero-skip semantics so years where Revenue
 * is zero (and therefore the ratio = 0 via {@link ratioOfBase}) don't
 * pollute the mean. Returns 0 when both series are empty / all-zero.
 */
function avgAbsCommonSize(
  line: YearKeyedSeries | undefined,
  revenue: YearKeyedSeries | undefined,
  years: readonly number[],
): number {
  if (!line || !revenue) return 0
  const ratios: YearKeyedSeries = {}
  for (const y of years) {
    ratios[y] = Math.abs(ratioOfBase(line[y] ?? 0, revenue[y] ?? 0))
  }
  return averageSeries(ratios, years) ?? 0
}

export function buildKdAutoValues(input: KdAutoValuesInput): KdAutoValues {
  const { isRows, isHistYears, faAccounts, faRows, faHistYears, projYears } = input

  // Ratios from IS avg common size
  const revenue = isRows[IS_REVENUE_ROW]
  const cogs = isRows[IS_TOTAL_COGS_ROW]
  const opex = isRows[IS_TOTAL_OPEX_ROW]
  const cogsRatio = avgAbsCommonSize(cogs, revenue, isHistYears)
  const totalOpExRatio = avgAbsCommonSize(opex, revenue, isHistYears)
  const halfOpEx = totalOpExRatio / 2

  // Additional Capex from Proy FA ADDITIONS band (7-year)
  const additionalCapexByAccount: Record<number, YearKeyedSeries> = {}
  if (faAccounts.length > 0 && faHistYears.length > 0 && projYears.length > 0) {
    const proyFa = computeProyFixedAssetsLive(
      { accounts: faAccounts, faRows, historicalYears: faHistYears },
      projYears,
    )
    for (const acct of faAccounts) {
      const addSeries = proyFa[acct.excelRow + FA_OFFSET.ACQ_ADDITIONS]
      if (!addSeries) continue
      const projectionOnly: YearKeyedSeries = {}
      for (const y of projYears) {
        projectionOnly[y] = addSeries[y] ?? 0
      }
      additionalCapexByAccount[acct.excelRow] = projectionOnly
    }
  }

  return {
    cogsRatio,
    sellingExpenseRatio: halfOpEx,
    gaExpenseRatio: halfOpEx,
    additionalCapexByAccount,
  }
}

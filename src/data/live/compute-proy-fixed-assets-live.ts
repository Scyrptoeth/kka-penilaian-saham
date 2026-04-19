/**
 * PROY Fixed Assets — Roll-forward projection model (Session 045 + 046 + 047).
 *
 * For each user-selected FA account, the 7 bands project as follows:
 *
 *   - Acq Additions[Y+1] = Acq Additions[Y] × (1 + acqAddGrowth)
 *     where acqAddGrowth = avg YoY growth of the HISTORICAL Acq Additions
 *     band for this account. If only 1 historical year (no YoY available),
 *     growth = 0 → Additions carry forward.
 *   - Acq Beginning[Y+1] = Acq Ending[Y]  (roll-forward identity)
 *   - Acq Ending[Y]      = Acq Beginning[Y] + Acq Additions[Y]
 *
 *   - Dep bands mirror Acq with their own Dep Additions growth, EXCEPT
 *     when Net Value[Y-1] ≤ 0 (asset fully depreciated / disposed) —
 *     then Dep Additions[Y] = 0 (Session 046 stopping rule).
 *
 *   - Net Value[Y] = Acq Ending[Y] - Dep Ending[Y], with Session 047
 *     clamping rule for PROJECTION years:
 *       * If prev Net ≤ 0 (asset disposed) → Net forced 0 (sticky —
 *         book value cannot revive even if Acq grows while Dep is frozen;
 *         negative book values are nonsensical in accounting).
 *       * Otherwise Net = max(0, raw) — clamp the first year raw would
 *         go below 0.
 *     Historical year is NOT clamped — user's ground truth data
 *     preserved as-is (Opsi A).
 *
 * Session 046 seed fix: Historical End values (ACQ_ENDING / DEP_ENDING)
 * are NOT persisted by DynamicFaEditor pre-Session 046, so reading
 * `faRows[excelRow + ACQ_ENDING][histYear]` returns undefined → 0.
 * Compute now DERIVES `endAtHist = Beg[hist] + Add[hist]` as the
 * roll-forward seed so first projected Beginning is correct even when
 * sentinel rows are missing. Self-healing for existing localStorage.
 *
 * Subtotals (rows 14/23/32/42/51/60/69) sum per-account values per band
 * at each year (unchanged from Session 036).
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
 * Per-account Additions growth rates (Session 045).
 * Used by both the compute function and the page display (Growth sub-row
 * under each Acq/Dep Additions band).
 */
export interface FaAdditionsGrowths {
  /** Keyed by excelRow of the leaf account. */
  acqAdd: Record<number, number>
  depAdd: Record<number, number>
}

/**
 * Compute average YoY growth of Acq Additions + Dep Additions per account.
 * Returns 0 for accounts with < 2 historical years or all-zero history.
 * Used by the Proy FA page to render the Growth sub-row.
 */
export function computeFaAdditionsGrowths(
  accounts: readonly FaAccountEntry[],
  faRows: Readonly<Record<number, YearKeyedSeries>>,
): FaAdditionsGrowths {
  const acqAdd: Record<number, number> = {}
  const depAdd: Record<number, number> = {}
  for (const acct of accounts) {
    const acqAddSeries = faRows[acct.excelRow + FA_OFFSET.ACQ_ADDITIONS] ?? {}
    const depAddSeries = faRows[acct.excelRow + FA_OFFSET.DEP_ADDITIONS] ?? {}
    acqAdd[acct.excelRow] = computeAvgGrowth(acqAddSeries)
    depAdd[acct.excelRow] = computeAvgGrowth(depAddSeries)
  }
  return { acqAdd, depAdd }
}

/**
 * Project each FA account's 7 bands via the roll-forward model.
 * Subtotals (FA_SUBTOTAL rows) sum across accounts per band per year.
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

  const growths = computeFaAdditionsGrowths(accounts, faRows)

  for (const acct of accounts) {
    const acqAddHist = faRows[acct.excelRow + FA_OFFSET.ACQ_ADDITIONS] ?? {}
    const acqEndHist = faRows[acct.excelRow + FA_OFFSET.ACQ_ENDING] ?? {}
    const acqBegHist = faRows[acct.excelRow + FA_OFFSET.ACQ_BEGINNING] ?? {}
    const depAddHist = faRows[acct.excelRow + FA_OFFSET.DEP_ADDITIONS] ?? {}
    const depEndHist = faRows[acct.excelRow + FA_OFFSET.DEP_ENDING] ?? {}
    const depBegHist = faRows[acct.excelRow + FA_OFFSET.DEP_BEGINNING] ?? {}
    const netHist = faRows[acct.excelRow + FA_OFFSET.NET_VALUE] ?? {}

    // Session 046: derive historical End from Beg+Add when not in faRows
    // (ACQ_ENDING / DEP_ENDING / NET_VALUE are computed manifest rows —
    // pre-Session 046 editor didn't persist them, so we self-heal).
    const acqBegAtHist = acqBegHist[histYear] ?? 0
    // Session 052: strict INPUT-as-source-of-truth — histYear value (or 0
    // when undefined) is the seed. No fabricated fallback from pre-histYear
    // data — that silently diverges Proy FA Additions from INPUT FA
    // Additions at the shared anchor year. Reverts LESSON-144.
    const acqAddAtHist = acqAddHist[histYear] ?? 0
    const acqEndAtHist = acqEndHist[histYear] ?? (acqBegAtHist + acqAddAtHist)
    const depBegAtHist = depBegHist[histYear] ?? 0
    const depAddAtHist = depAddHist[histYear] ?? 0
    const depEndAtHist = depEndHist[histYear] ?? (depBegAtHist + depAddAtHist)
    const netAtHist = netHist[histYear] ?? (acqEndAtHist - depEndAtHist)

    const acqBegSeries: YearKeyedSeries = { [histYear]: acqBegAtHist }
    const acqAddSeries: YearKeyedSeries = { [histYear]: acqAddAtHist }
    const acqEndSeries: YearKeyedSeries = { [histYear]: acqEndAtHist }
    const depBegSeries: YearKeyedSeries = { [histYear]: depBegAtHist }
    const depAddSeries: YearKeyedSeries = { [histYear]: depAddAtHist }
    const depEndSeries: YearKeyedSeries = { [histYear]: depEndAtHist }
    const netSeries: YearKeyedSeries = { [histYear]: netAtHist }

    const acqGrowth = growths.acqAdd[acct.excelRow] ?? 0
    const depGrowth = growths.depAdd[acct.excelRow] ?? 0

    for (let i = 0; i < projYears.length; i++) {
      const projYear = projYears[i]!
      const prevYear = i === 0 ? histYear : projYears[i - 1]!

      const thisAcqBeg = acqEndSeries[prevYear] ?? 0
      const thisAcqAdd = (acqAddSeries[prevYear] ?? 0) * (1 + acqGrowth)
      const thisAcqEnd = thisAcqBeg + thisAcqAdd

      // Session 046 stopping rule: if Net Value ≤ 0 in previous year,
      // asset is fully depreciated / disposed — zero further Dep Additions.
      const prevNet = netSeries[prevYear] ?? 0
      const assetDone = prevNet <= 0

      const thisDepBeg = depEndSeries[prevYear] ?? 0
      const thisDepAdd = assetDone
        ? 0
        : (depAddSeries[prevYear] ?? 0) * (1 + depGrowth)
      const thisDepEnd = thisDepBeg + thisDepAdd

      // Session 047 clamp + sticky rule for PROJECTION years.
      // - assetDone (prev Net ≤ 0) → Net forced 0 (sticky — book value can't
      //   revive even if Acq continues to grow while Dep is frozen).
      // - Else: clamp raw negative to 0 the first year it would go below 0.
      // Historical year is NOT clamped (see netAtHist above).
      const rawNet = thisAcqEnd - thisDepEnd
      const thisNet = assetDone ? 0 : Math.max(0, rawNet)

      acqBegSeries[projYear] = thisAcqBeg
      acqAddSeries[projYear] = thisAcqAdd
      acqEndSeries[projYear] = thisAcqEnd
      depBegSeries[projYear] = thisDepBeg
      depAddSeries[projYear] = thisDepAdd
      depEndSeries[projYear] = thisDepEnd
      netSeries[projYear] = thisNet
    }

    result[acct.excelRow + FA_OFFSET.ACQ_BEGINNING] = acqBegSeries
    result[acct.excelRow + FA_OFFSET.ACQ_ADDITIONS] = acqAddSeries
    result[acct.excelRow + FA_OFFSET.ACQ_ENDING] = acqEndSeries
    result[acct.excelRow + FA_OFFSET.DEP_BEGINNING] = depBegSeries
    result[acct.excelRow + FA_OFFSET.DEP_ADDITIONS] = depAddSeries
    result[acct.excelRow + FA_OFFSET.DEP_ENDING] = depEndSeries
    result[acct.excelRow + FA_OFFSET.NET_VALUE] = netSeries
  }

  // Per-band subtotals — sum across accounts at each year
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

/**
 * Legacy growth helper retained for backward compat with any remaining
 * call sites that expect the old signature.
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

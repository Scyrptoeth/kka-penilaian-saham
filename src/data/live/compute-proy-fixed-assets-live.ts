/**
 * PROY Fixed Assets — Roll-forward projection model (Session 045 rewrite).
 *
 * For each user-selected FA account, the 7 bands project as follows:
 *
 *   - Acq Additions[Y+1] = Acq Additions[Y] × (1 + acqAddGrowth)
 *     where acqAddGrowth = avg YoY growth of the HISTORICAL Acq Additions
 *     band for this account. If only 1 historical year (no YoY available),
 *     growth = 0 → Additions carry forward (LESSON-131 carry-forward default).
 *   - Acq Beginning[Y+1] = Acq Ending[Y]  (roll-forward identity)
 *   - Acq Ending[Y]      = Acq Beginning[Y] + Acq Additions[Y]
 *
 *   - Dep bands mirror Acq with their own Dep Additions growth.
 *
 *   - Net Value[Y] = Acq Ending[Y] - Dep Ending[Y].
 *
 * Previously (Session 036) all 7 bands projected using a single per-account
 * NET VALUE growth rate. That model was simpler but less correct — it didn't
 * preserve Acq=Beginning+Additions identity and couldn't distinguish Acq
 * additions growth from Dep additions growth. This rewrite is the proper
 * accounting roll-forward model requested in Session 045.
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

    const acqBegSeries: YearKeyedSeries = { [histYear]: acqBegHist[histYear] ?? 0 }
    const acqAddSeries: YearKeyedSeries = { [histYear]: acqAddHist[histYear] ?? 0 }
    const acqEndSeries: YearKeyedSeries = { [histYear]: acqEndHist[histYear] ?? 0 }
    const depBegSeries: YearKeyedSeries = { [histYear]: depBegHist[histYear] ?? 0 }
    const depAddSeries: YearKeyedSeries = { [histYear]: depAddHist[histYear] ?? 0 }
    const depEndSeries: YearKeyedSeries = { [histYear]: depEndHist[histYear] ?? 0 }
    const netSeries: YearKeyedSeries = { [histYear]: netHist[histYear] ?? 0 }

    const acqGrowth = growths.acqAdd[acct.excelRow] ?? 0
    const depGrowth = growths.depAdd[acct.excelRow] ?? 0

    for (let i = 0; i < projYears.length; i++) {
      const projYear = projYears[i]!
      const prevYear = i === 0 ? histYear : projYears[i - 1]!

      const thisAcqBeg = acqEndSeries[prevYear] ?? 0
      const thisAcqAdd = (acqAddSeries[prevYear] ?? 0) * (1 + acqGrowth)
      const thisAcqEnd = thisAcqBeg + thisAcqAdd

      const thisDepBeg = depEndSeries[prevYear] ?? 0
      const thisDepAdd = (depAddSeries[prevYear] ?? 0) * (1 + depGrowth)
      const thisDepEnd = thisDepBeg + thisDepAdd

      const thisNet = thisAcqEnd - thisDepEnd

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

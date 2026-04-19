/**
 * Working Capital breakdown helper — Session 053.
 *
 * Derives per-account contribution to FCF rows 12 (CA delta negated) and
 * 13 (CL delta). Used by <FcfCwcBreakdown> to render inline transparency
 * below the aggregate CWC section on the FCF page.
 *
 * Sign convention mirrors `computeCashFlowLiveRows` (LESSON-110
 * resolveWcRows shared):
 *
 *   CA[year][account]:
 *     year 1  → -bsRows[account][year]                 (absolute, Excel quirk)
 *     year 2+ → -(bsRows[account][year] - prev)
 *
 *   CL[year][account]:
 *     year 1  → bsRows[account][year] - bsRows[account][bsYears[0]]
 *     year 2+ → bsRows[account][year] - bsRows[account][prevYear]
 *
 * Summing each column over account lists equals CFS row 8 / row 9 exactly,
 * which in turn feeds FCF row 12 / 13. This guarantees the breakdown sums
 * match the aggregate (no hidden divergence — LESSON-139 applied to FCF).
 */

import type { YearKeyedSeries } from '@/types/financial'
import type { BsAccountEntry } from '@/data/catalogs/balance-sheet-catalog'
import { resolveWcRows } from '@/data/live/compute-cash-flow-live'

export interface WcAccountBreakdown {
  readonly excelRow: number
  readonly series: YearKeyedSeries
}

export interface WcBreakdown {
  readonly caIncluded: WcAccountBreakdown[]
  readonly clIncluded: WcAccountBreakdown[]
  readonly caExcluded: WcAccountBreakdown[]
  readonly clExcluded: WcAccountBreakdown[]
}

/**
 * @param bsAccounts           All user-selected BS accounts (from store)
 * @param bsRows               BS leaf values keyed by excelRow
 * @param cfsYears             FCF year span, e.g. [2019, 2020, 2021]
 * @param bsYears              BS year span (one year wider on the left)
 * @param excludedCurrentAssets BS excelRows user excluded from CA scope
 * @param excludedCurrentLiab  BS excelRows user excluded from CL scope
 */
export function computeWcBreakdown(
  bsAccounts: readonly BsAccountEntry[],
  bsRows: Record<number, YearKeyedSeries>,
  cfsYears: readonly number[],
  bsYears: readonly number[],
  excludedCurrentAssets: readonly number[] = [],
  excludedCurrentLiab: readonly number[] = [],
): WcBreakdown {
  const caIncludedRows = resolveWcRows(bsAccounts, 'current_assets', excludedCurrentAssets)
  const clIncludedRows = resolveWcRows(bsAccounts, 'current_liabilities', excludedCurrentLiab)
  const caExcludedSet = new Set(excludedCurrentAssets)
  const clExcludedSet = new Set(excludedCurrentLiab)

  const caAllRows = bsAccounts
    .filter((a) => a.section === 'current_assets')
    .map((a) => a.excelRow)
  const clAllRows = bsAccounts
    .filter((a) => a.section === 'current_liabilities')
    .map((a) => a.excelRow)

  const caExcludedRows = caAllRows.filter((r) => caExcludedSet.has(r))
  const clExcludedRows = clAllRows.filter((r) => clExcludedSet.has(r))

  return {
    caIncluded: buildCaBreakdown(caIncludedRows, bsRows, cfsYears),
    clIncluded: buildClBreakdown(clIncludedRows, bsRows, cfsYears, bsYears),
    caExcluded: buildCaBreakdown(caExcludedRows, bsRows, cfsYears),
    clExcluded: buildClBreakdown(clExcludedRows, bsRows, cfsYears, bsYears),
  }
}

function buildCaBreakdown(
  rows: readonly number[],
  bsRows: Record<number, YearKeyedSeries>,
  cfsYears: readonly number[],
): WcAccountBreakdown[] {
  return rows.map((excelRow) => {
    const series: YearKeyedSeries = {}
    for (let i = 0; i < cfsYears.length; i++) {
      const year = cfsYears[i]!
      const curr = bsRows[excelRow]?.[year] ?? 0
      if (i === 0) {
        // Year 1 Excel convention: absolute level negated
        series[year] = -curr
      } else {
        const prev = bsRows[excelRow]?.[cfsYears[i - 1]!] ?? 0
        series[year] = -(curr - prev)
      }
    }
    return { excelRow, series }
  })
}

function buildClBreakdown(
  rows: readonly number[],
  bsRows: Record<number, YearKeyedSeries>,
  cfsYears: readonly number[],
  bsYears: readonly number[],
): WcAccountBreakdown[] {
  return rows.map((excelRow) => {
    const series: YearKeyedSeries = {}
    for (let i = 0; i < cfsYears.length; i++) {
      const year = cfsYears[i]!
      const curr = bsRows[excelRow]?.[year] ?? 0
      const prevYear = i === 0 ? bsYears[0]! : cfsYears[i - 1]!
      const prev = bsRows[excelRow]?.[prevYear] ?? 0
      series[year] = curr - prev
    }
    return { excelRow, series }
  })
}

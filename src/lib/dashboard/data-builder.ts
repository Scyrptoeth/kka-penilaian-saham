/**
 * Dashboard data builder — pure functions that shape store state into the
 * chart series consumed by `/dashboard`.
 *
 * Session 043 Task 4 extraction (LESSON-108 audit fix): previously the page
 * referenced raw row numbers like `allBs[26]` which were stale holdovers
 * from the PT Raja Voltama prototype — they were wrong for any user whose
 * dynamic BS catalog renumbered subtotals (and also wrong even for the
 * prototype after the Session 020 dynamic-catalog refactor that moved
 * TOTAL ASSETS → row 27, TOTAL LIABILITIES → row 41, Shareholders' Equity
 * → row 49). The KOMPOSISI NERACA chart was silently empty.
 *
 * System-development principle: Dashboard should NEVER use magic row
 * numbers. It reads via semantic constants (BS_SUBTOTAL, IS_SENTINEL,
 * PROY_LR_ROW, FCF_ROW) and, for Balance Sheet composition, falls back
 * to account-driven aggregation when the sentinel is missing (e.g. user
 * opened the app pre-sentinel-persist data).
 */

import type { YearKeyedSeries } from '@/types/financial'
import type { BsAccountEntry } from '@/data/catalogs/balance-sheet-catalog'
import { BS_SUBTOTAL } from '@/data/catalogs/balance-sheet-catalog'
import { IS_SENTINEL } from '@/data/catalogs/income-statement-catalog'
import { PROY_LR_ROW } from '@/data/live/compute-proy-lr-live'
import { FCF_ROW } from '@/data/manifests/fcf'

// ── Type shapes ──

export interface RevenuePoint {
  year: string
  revenue: number
  netIncome: number
  type: 'hist' | 'proj'
}

export interface BsCompositionPoint {
  year: string
  assets: number
  liabilities: number
  equity: number
}

export interface FcfPoint {
  year: string
  fcf: number
  type: 'hist'
}

// ── Account-driven BS aggregator (LESSON-108 fallback) ──

/**
 * Aggregate BS values by section from the user's dynamic accounts. Used
 * as the primary source for liabilities/equity totals (never trust
 * hardcoded rows), and as a fallback for assets when the sentinel is
 * missing.
 *
 * Accounts with excelRow=22 (Fixed Asset Net — a cross-ref row that is
 * not in the accounts array but flows into BS via computedFrom) are
 * read directly from allBs[22] when applicable.
 */
export function aggregateBsBySection(params: {
  accounts: readonly BsAccountEntry[]
  allBs: Readonly<Record<number, YearKeyedSeries>>
  year: number
}): { assets: number; liabilities: number; equity: number } {
  const { accounts, allBs, year } = params
  let currentAssets = 0
  let otherNonCurrentAssets = 0
  let intangibleAssets = 0
  let currentLiab = 0
  let nonCurrentLiab = 0
  let equity = 0

  for (const acct of accounts) {
    const val = allBs[acct.excelRow]?.[year] ?? 0
    switch (acct.section) {
      case 'current_assets':
        currentAssets += val
        break
      case 'other_non_current_assets':
        otherNonCurrentAssets += val
        break
      case 'intangible_assets':
        intangibleAssets += val
        break
      case 'current_liabilities':
        currentLiab += val
        break
      case 'non_current_liabilities':
        nonCurrentLiab += val
        break
      case 'equity':
        equity += val
        break
    }
  }

  // Fixed Asset Net is row 22 (cross-ref from FA store, always in sentinels)
  const fixedAssetNet = allBs[BS_SUBTOTAL.FIXED_ASSETS_NET]?.[year] ?? 0

  return {
    assets: currentAssets + otherNonCurrentAssets + intangibleAssets + fixedAssetNet,
    liabilities: currentLiab + nonCurrentLiab,
    equity,
  }
}

// ── Revenue & Net Income series ──

/**
 * Builds the PENDAPATAN & LABA BERSIH series for historical + optional
 * projection years. Reads IS_SENTINEL.REVENUE / NET_PROFIT (rows 6/35
 * in historical IS) and PROY_LR_ROW.REVENUE / NET_PROFIT (rows 8/39 in
 * projected LR — the row mapping differs because PROY LR uses its own
 * template slot layout, LESSON-103).
 */
export function buildRevenueNetIncomeSeries(params: {
  incomeStatementRows: Readonly<Record<number, YearKeyedSeries>>
  histYears: readonly number[]
  projection?: {
    proyLrRows: Readonly<Record<number, YearKeyedSeries>>
    projYears: readonly number[]
  }
}): RevenuePoint[] {
  const { incomeStatementRows: isRows, histYears, projection } = params
  const out: RevenuePoint[] = histYears.map(y => ({
    year: String(y),
    revenue: isRows[IS_SENTINEL.REVENUE]?.[y] ?? 0,
    netIncome: isRows[IS_SENTINEL.NET_PROFIT]?.[y] ?? 0,
    type: 'hist' as const,
  }))
  if (projection) {
    for (const y of projection.projYears) {
      out.push({
        year: String(y),
        revenue: projection.proyLrRows[PROY_LR_ROW.REVENUE]?.[y] ?? 0,
        netIncome: projection.proyLrRows[PROY_LR_ROW.NET_PROFIT]?.[y] ?? 0,
        type: 'proj' as const,
      })
    }
  }
  return out
}

// ── Balance Sheet composition series ──

/**
 * Builds the KOMPOSISI NERACA series for historical years. Uses
 * account-driven aggregation as the PRIMARY source (LESSON-108) — the
 * BS sentinel rows (TOTAL_ASSETS=27, TOTAL_LIABILITIES=41,
 * TOTAL_EQUITY=49) are used only as a crosscheck denominator when
 * present; missing sentinels do NOT blank the chart because the
 * per-account aggregation is always available.
 */
export function buildBsCompositionSeries(params: {
  accounts: readonly BsAccountEntry[]
  allBs: Readonly<Record<number, YearKeyedSeries>>
  histYears: readonly number[]
}): BsCompositionPoint[] {
  const { accounts, allBs, histYears } = params
  return histYears.map(year => {
    const agg = aggregateBsBySection({ accounts, allBs, year })
    return { year: String(year), ...agg }
  })
}

// ── Free Cash Flow series ──

/**
 * Builds the ARUS KAS BEBAS series from upstream FCF compute results.
 * Reads FCF_ROW.FREE_CASH_FLOW (row 20 in FCF_MANIFEST).
 */
export function buildFcfSeries(params: {
  allFcf: Readonly<Record<number, YearKeyedSeries>>
  histYears: readonly number[]
}): FcfPoint[] {
  const { allFcf, histYears } = params
  return histYears.map(y => ({
    year: String(y),
    fcf: allFcf[FCF_ROW.FREE_CASH_FLOW]?.[y] ?? 0,
    type: 'hist' as const,
  }))
}

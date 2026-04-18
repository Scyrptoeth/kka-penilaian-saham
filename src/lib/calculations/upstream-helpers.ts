/**
 * Shared builder functions that centralize store→input mapping for
 * calculation modules consumed by multiple pages.
 *
 * Pattern from LESSON-043: copy-paste store→input mapping across pages
 * = guaranteed divergence. Centralized builders = zero divergence risk.
 *
 * Each builder is a pure function — no store access, all data via params.
 */

import type { HomeInputs, YearKeyedSeries } from '@/types'
import type { BsAccountEntry } from '@/data/catalogs/balance-sheet-catalog'
import { isIbdAccount } from '@/data/catalogs/balance-sheet-catalog'
import type { AamInput } from '@/lib/calculations/aam-valuation'
import type { DcfInput } from '@/lib/calculations/dcf'
import type { BorrowingCapInput } from '@/lib/calculations/borrowing-cap'
import type { EemInput } from '@/lib/calculations/eem-valuation'
import type { CfiInput } from '@/lib/calculations/cfi'
import type { DiscountRateResult } from '@/lib/calculations/discount-rate'
import type { BorrowingCapInputState } from '@/lib/store/useKkaStore'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { NOPLAT_MANIFEST } from '@/data/manifests/noplat'
import { CASH_FLOW_STATEMENT_MANIFEST } from '@/data/manifests/cash-flow-statement'
import { FIXED_ASSET_MANIFEST } from '@/data/manifests/fixed-asset'
import { FCF_MANIFEST } from '@/data/manifests/fcf'
import { computeNoplatLiveRows } from '@/data/live/compute-noplat-live'
import { computeCashFlowLiveRows } from '@/data/live/compute-cash-flow-live'
import { computeFcfLiveRows } from '@/data/live/compute-fcf-live'
import { computeRoicLiveRows } from '@/data/live/compute-roic-live'
import { computeGrowthRateLive } from '@/data/live/compute-growth-rate-live'
import { computeProporsiSaham } from '@/lib/store/useKkaStore'

/** Default borrowing percentage for fixed assets (E7 in Borrowing Cap sheet). */
export const BORROWING_PERCENT_DEFAULT = 0.7

// ── Historical Upstream Chain ──

export interface HistoricalUpstreamInput {
  balanceSheetRows: Record<number, YearKeyedSeries>
  /**
   * Session 039 — BS account entries needed for account-driven WC aggregation.
   * Kept optional (`[]` default) so test helpers and callers that predate
   * Session 039 don't break; CFS live compute will return 0 deltas when the
   * account list is empty, which is correct no-op behavior.
   */
  balanceSheetAccounts?: readonly BsAccountEntry[]
  incomeStatementRows: Record<number, YearKeyedSeries>
  fixedAssetRows: Record<number, YearKeyedSeries> | null
  accPayablesRows: Record<number, YearKeyedSeries> | null
  allBs: Record<number, YearKeyedSeries>
  histYears3: number[]
  histYears4: number[]
  /**
   * Session 039 — Working Capital scope. `null` = user has not confirmed scope
   * yet; compute treats every CA / CL account as included (behaviorally
   * identical to `{ excludedCurrentAssets: [], excludedCurrentLiabilities: [] }`).
   * This default makes the helper safe to call before the user visits the
   * WC scope page; the UI-level `PageEmptyState` gate on 9 consumer pages
   * ensures users see a nagging prompt before trusting downstream numbers.
   */
  changesInWorkingCapital?: {
    excludedCurrentAssets: readonly number[]
    excludedCurrentLiabilities: readonly number[]
  } | null
}

export interface HistoricalUpstreamResult {
  allNoplat: Record<number, YearKeyedSeries>
  allCfs: Record<number, YearKeyedSeries>
  allFcf: Record<number, YearKeyedSeries>
  allFa: Record<number, YearKeyedSeries>
  faComp: Record<number, YearKeyedSeries> | null
  roicRows: Record<number, YearKeyedSeries>
  growthRate: number
}

/**
 * Compute the full historical upstream chain that DCF, CFI, EEM, and
 * Dashboard all need. Previously copy-pasted in 5 locations.
 */
export function computeHistoricalUpstream(input: HistoricalUpstreamInput): HistoricalUpstreamResult {
  const {
    balanceSheetRows, balanceSheetAccounts = [],
    incomeStatementRows, fixedAssetRows, accPayablesRows,
    allBs, histYears3, histYears4,
    changesInWorkingCapital,
  } = input

  const noplatLeaf = computeNoplatLiveRows(incomeStatementRows, histYears3)
  const noplatComp = deriveComputedRows(NOPLAT_MANIFEST.rows, noplatLeaf, histYears3)
  const allNoplat = { ...noplatLeaf, ...noplatComp }

  const excludedCA = changesInWorkingCapital?.excludedCurrentAssets ?? []
  const excludedCL = changesInWorkingCapital?.excludedCurrentLiabilities ?? []

  const cfsLeaf = computeCashFlowLiveRows(
    balanceSheetAccounts, balanceSheetRows,
    incomeStatementRows, fixedAssetRows, accPayablesRows,
    histYears3, histYears4,
    excludedCA, excludedCL,
  )
  const cfsComp = deriveComputedRows(CASH_FLOW_STATEMENT_MANIFEST.rows, cfsLeaf, histYears3)
  const allCfs = { ...cfsLeaf, ...cfsComp }

  const faComp = fixedAssetRows
    ? deriveComputedRows(FIXED_ASSET_MANIFEST.rows, fixedAssetRows, histYears3)
    : null
  const allFa = faComp ? { ...faComp, ...fixedAssetRows! } : {}

  const fcfLeaf = computeFcfLiveRows(allNoplat, faComp, allCfs, histYears3)
  const fcfComp = deriveComputedRows(FCF_MANIFEST.rows, fcfLeaf, histYears3)
  const allFcf = { ...fcfLeaf, ...fcfComp }

  const roicRows = computeRoicLiveRows(allFcf, allBs, histYears3)
  const grData = computeGrowthRateLive(allBs, allFa, roicRows, histYears3)
  const growthRate = grData?.result.average ?? 0

  return { allNoplat, allCfs, allFcf, allFa, faComp, roicRows, growthRate }
}

// ── AAM Input Builder ──

export interface BuildAamParams {
  accounts: readonly BsAccountEntry[]
  allBs: Record<number, YearKeyedSeries>
  lastYear: number
  home: HomeInputs
  aamAdjustments: Record<number, number>
  /**
   * Session 038: user-entered total Interest Bearing Debt (POSITIVE
   * amount). Sourced from `/valuation/interest-bearing-debt` page.
   * Replaces the previous classifier-based auto-aggregation via
   * `isIbdAccount()` — see AAM page note that instructs users to apply
   * negative adjustments (column D) on IBD liability accounts so NAV
   * math does not double-count.
   */
  interestBearingDebt: number
}

/**
 * Build AamInput from dynamic BS accounts + per-row adjustments.
 *
 * Session 027 redesign: iterates `accounts` array (all user-selected BS
 * accounts including catalog + custom), classifies each liability as IBD
 * or non-IBD, and aggregates per section. Fixed Asset Net (row 22) is
 * always included as special non-current asset from BS sentinel.
 */
export function buildAamInput(params: BuildAamParams): AamInput {
  const { accounts, allBs, lastYear: ly, home, aamAdjustments: adj, interestBearingDebt } = params
  const bs = (row: number) => allBs[row]?.[ly] ?? 0
  const a = (row: number) => adj[row] ?? 0
  const adjusted = (row: number) => bs(row) + a(row)
  const totalAdjustments = Object.values(adj).reduce((sum, v) => sum + v, 0)

  // Aggregate per section from dynamic accounts
  let totalCurrentAssets = 0
  let otherNonCurrentAssets = 0
  let intangibleAssets = 0
  let nonIbdCL = 0
  let ibdCL = 0
  let nonIbdNCL = 0
  let ibdNCL = 0
  let totalEquity = 0

  for (const acct of accounts) {
    const val = adjusted(acct.excelRow)
    switch (acct.section) {
      case 'current_assets':
        totalCurrentAssets += val
        break
      case 'other_non_current_assets':
        otherNonCurrentAssets += val
        break
      case 'intangible_assets':
        intangibleAssets += val
        break
      case 'current_liabilities':
        if (isIbdAccount(acct)) ibdCL += val
        else nonIbdCL += val
        break
      case 'non_current_liabilities':
        if (isIbdAccount(acct)) ibdNCL += val
        else nonIbdNCL += val
        break
      case 'equity':
        totalEquity += val
        break
      // fixed_assets section is excluded — handled by row 22 sentinel below
    }
  }

  // Fixed Asset Net (row 22) — cross-ref from FA store, always in BS sentinel
  const faNet = adjusted(22)
  const totalNonCurrentAssets = faNet + otherNonCurrentAssets
  const totalAssets = totalCurrentAssets + totalNonCurrentAssets + intangibleAssets

  const totalCurrentLiabilities = nonIbdCL + ibdCL
  const totalNonCurrentLiabilities = nonIbdNCL + ibdNCL

  // Session 038: IBD is now a dedicated user input from the store
  // (POSITIVE amount). Classifier-based auto-aggregation is retained only
  // for the CL/NCL split so AAM page subtotals (non-IBD vs IBD categories)
  // continue to display — the split has no effect on NAV math when the
  // user follows the workflow of zeroing IBD accounts via column D.

  return {
    totalCurrentAssets,
    totalNonCurrentAssets,
    intangibleAssets,
    totalAssets,
    nonIbdCurrentLiabilities: nonIbdCL,
    ibdCurrentLiabilities: ibdCL,
    totalCurrentLiabilities,
    nonIbdNonCurrentLiabilities: nonIbdNCL,
    ibdNonCurrentLiabilities: ibdNCL,
    totalNonCurrentLiabilities,
    interestBearingDebtHistorical: interestBearingDebt,
    totalEquity,
    totalAdjustments,
    dlomPercent: home.dlomPercent,
    dlocPercent: home.dlocPercent,
    proporsiSaham: computeProporsiSaham(home),
  }
}

// ── DCF Input Builder ──

export interface BuildDcfParams {
  upstream: HistoricalUpstreamResult
  allBs: Record<number, YearKeyedSeries>
  lastHistYear: number
  projYears: number[]
  proyNoplatRows: Record<number, YearKeyedSeries>
  proyFaRows: Record<number, YearKeyedSeries>
  proyCfsRows: Record<number, YearKeyedSeries>
  wacc: number
  growthRate: number
  /**
   * Session 038: user-entered total Interest Bearing Debt (POSITIVE
   * amount). Builder negates internally to match `DcfInput.interestBearingDebt`
   * which the Excel workbook stores as (BS!F31+F38)*-1.
   */
  interestBearingDebt: number
}

/** Build DcfInput from upstream + projection pipeline. Eliminates 15-param copy-paste. */
export function buildDcfInput(params: BuildDcfParams): DcfInput {
  const { upstream, allBs: _allBs, lastHistYear: ly, projYears, proyNoplatRows, proyFaRows, proyCfsRows, wacc, growthRate, interestBearingDebt } = params
  const { allNoplat, allFa, allCfs, roicRows } = upstream
  void _allBs // retained in params for API stability; no longer used for IBD lookup

  return {
    historicalNoplat: allNoplat[19]?.[ly] ?? 0,
    historicalDepreciation: allFa[51]?.[ly] ?? 0,
    historicalChangesCA: allCfs[8]?.[ly] ?? 0,
    historicalChangesCL: allCfs[9]?.[ly] ?? 0,
    historicalCapex: -(allFa[23]?.[ly] ?? 0),
    projectedNoplat: projYears.map(y => proyNoplatRows[19]?.[y] ?? 0),
    projectedDepreciation: projYears.map(y => proyFaRows[51]?.[y] ?? 0),
    projectedChangesCA: projYears.map(y => proyCfsRows[8]?.[y] ?? 0),
    projectedChangesCL: projYears.map(y => proyCfsRows[9]?.[y] ?? 0),
    projectedCapex: projYears.map(y => -(proyFaRows[23]?.[y] ?? 0)),
    wacc,
    growthRate,
    interestBearingDebt: -interestBearingDebt,
    excessCash: -(roicRows[10]?.[ly] ?? 0),
    idleAsset: -(roicRows[9]?.[ly] ?? 0),
  }
}

// ── EEM Input Builder ──

export interface BuildEemParams {
  aamResult: { totalCurrentAssets: number; totalNonCurrentAssets: number }
  allBs: Record<number, YearKeyedSeries>
  upstream: HistoricalUpstreamResult
  lastYear: number
  waccTangible: number
  wacc: number
  /**
   * Session 038: user-entered IBD (POSITIVE). Builder negates internally
   * to match `EemInput.interestBearingDebt` which workbook stores as
   * (BS!F31+F38)*-1.
   */
  interestBearingDebt: number
}

/** Build EemInput from AAM result + upstream data. */
export function buildEemInput(params: BuildEemParams): EemInput {
  const { aamResult, allBs, upstream, lastYear: ly, waccTangible, wacc, interestBearingDebt } = params
  const { allNoplat, allFa, allCfs } = upstream
  const bs = (row: number) => allBs[row]?.[ly] ?? 0

  return {
    aamTotalCurrentAssets: aamResult.totalCurrentAssets,
    aamTotalNonCurrentAssets: aamResult.totalNonCurrentAssets,
    aamAccountPayable: bs(32), aamTaxPayable: bs(33),
    aamOtherCurrentLiabilities: bs(34),
    aamRelatedPartyNCL: bs(39), aamCashOnHands: bs(8),
    waccTangible,
    historicalNoplat: allNoplat[19]?.[ly] ?? 0,
    historicalDepreciation: allFa[51]?.[ly] ?? 0,
    historicalTotalWC: (allCfs[8]?.[ly] ?? 0) + (allCfs[9]?.[ly] ?? 0),
    historicalCapex: -(allFa[23]?.[ly] ?? 0),
    wacc,
    interestBearingDebt: -interestBearingDebt,
    nonOperatingAsset: bs(8),
  }
}

// ── Borrowing Cap Input Builder ──

export interface BuildBorrowingCapParams {
  allBs: Record<number, YearKeyedSeries>
  lastYear: number
  bcInput: BorrowingCapInputState | null
  dr: DiscountRateResult
}

/** Build BorrowingCapInput from BS + DR + CALK values. */
export function buildBorrowingCapInput(params: BuildBorrowingCapParams): BorrowingCapInput {
  const { allBs, lastYear: ly, bcInput, dr } = params
  const bs = (row: number) => allBs[row]?.[ly] ?? 0

  return {
    piutangCalk: bcInput?.piutangCalk ?? 0,
    persediaanCalk: bcInput?.persediaanCalk ?? 0,
    bsReceivables: bs(10) + bs(11),
    bsInventory: bs(12),
    bsFixedAssetNet: bs(22),
    borrowingPercent: BORROWING_PERCENT_DEFAULT,
    costDebtAfterTax: dr.kd,
    costEquity: dr.ke,
  }
}

// ── CFI Input Builder ──

export interface BuildCfiParams {
  upstream: HistoricalUpstreamResult
  histYears3: number[]
  projYears: number[]
  /** Projected FCF from DCF computation — positional, aligned to projYears. */
  dcfProjectedFcf: readonly number[]
  proyLrRows: Record<number, YearKeyedSeries>
  incomeStatementRows: Record<number, YearKeyedSeries>
}

/**
 * Build CfiInput from upstream + DCF + PROY LR data. Previously inline
 * in `src/app/valuation/cfi/page.tsx`; centralized here per LESSON-046
 * since the CFI SheetBuilder (Session 034) consumes the same mapping.
 *
 * Wiring:
 *   historicalFcf    ← upstream.allFcf[20] per histYears3
 *   projectedFcf     ← dcfProjectedFcf[i] aligned to projYears
 *   historicalNonOpCf ← IS row 30 per histYears3
 *   projectedNonOpCf ← proyLrRows[34] per projYears
 */
export function buildCfiInput(params: BuildCfiParams): CfiInput {
  const {
    upstream, histYears3, projYears,
    dcfProjectedFcf, proyLrRows, incomeStatementRows,
  } = params

  const historicalFcf: YearKeyedSeries = {}
  for (const y of histYears3) historicalFcf[y] = upstream.allFcf[20]?.[y] ?? 0

  const projectedFcf: YearKeyedSeries = {}
  projYears.forEach((y, i) => { projectedFcf[y] = dcfProjectedFcf[i] ?? 0 })

  const historicalNonOpCf: YearKeyedSeries = {}
  for (const y of histYears3) historicalNonOpCf[y] = incomeStatementRows[30]?.[y] ?? 0

  const projectedNonOpCf: YearKeyedSeries = {}
  for (const y of projYears) projectedNonOpCf[y] = proyLrRows[34]?.[y] ?? 0

  return { historicalFcf, projectedFcf, historicalNonOpCf, projectedNonOpCf }
}

// ── Risk Category Derivation ──

type RiskCategory = 'Paling Rendah (Resiko Tinggi)' | 'Moderat' | 'Paling Tinggi (Resiko Rendah)'

/**
 * Derive DLOM risk category from percentage.
 * Excel mapping: -40% → Paling Tinggi, -30% → Moderat, -20% → Paling Rendah.
 */
export function deriveDlomRiskCategory(dlomPercent: number): RiskCategory {
  const abs = Math.abs(dlomPercent)
  if (abs >= 0.35) return 'Paling Tinggi (Resiko Rendah)'
  if (abs >= 0.25) return 'Moderat'
  return 'Paling Rendah (Resiko Tinggi)'
}

/**
 * Derive DLOC risk category from percentage.
 * Excel mapping: -70% → Paling Tinggi, -50% → Moderat, -30% → Paling Rendah.
 */
export function deriveDlocRiskCategory(dlocPercent: number): RiskCategory {
  const abs = Math.abs(dlocPercent)
  if (abs >= 0.60) return 'Paling Tinggi (Resiko Rendah)'
  if (abs >= 0.40) return 'Moderat'
  return 'Paling Rendah (Resiko Tinggi)'
}

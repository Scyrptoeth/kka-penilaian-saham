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

// ── IBD Scope Helper (Session 041 Task 5) ──

/**
 * Compute the user-curated Interest Bearing Debt total at a given year by
 * iterating BS Current + Non-Current Liabilities accounts and skipping
 * those the user marked NON-IBD on `/valuation/interest-bearing-debt`.
 *
 * Returns 0 when:
 *   - `interestBearingDebt` slice is null (user has not confirmed scope)
 *   - balanceSheet slice is null
 *   - all liability accounts are excluded
 *
 * Result is POSITIVE per the AAM/DCF/EEM convention — sign reconciliation
 * lives at builder boundaries (DCF/EEM negate internally per LESSON-011).
 */
export function computeInterestBearingDebt(input: {
  balanceSheetAccounts: readonly BsAccountEntry[]
  balanceSheetRows: Record<number, YearKeyedSeries>
  interestBearingDebt: {
    excludedCurrentLiabilities: number[]
    excludedNonCurrentLiabilities: number[]
  } | null
  year: number
}): number {
  const { balanceSheetAccounts, balanceSheetRows, interestBearingDebt, year } = input
  if (interestBearingDebt === null) return 0
  const exclCL = new Set(interestBearingDebt.excludedCurrentLiabilities)
  const exclNCL = new Set(interestBearingDebt.excludedNonCurrentLiabilities)
  let total = 0
  for (const acct of balanceSheetAccounts) {
    if (acct.section === 'current_liabilities') {
      if (exclCL.has(acct.excelRow)) continue
      total += balanceSheetRows[acct.excelRow]?.[year] ?? 0
    } else if (acct.section === 'non_current_liabilities') {
      if (exclNCL.has(acct.excelRow)) continue
      total += balanceSheetRows[acct.excelRow]?.[year] ?? 0
    }
  }
  return total
}

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

// ── AAM IBD Auto-Adjustment Helper (Session 043 Task 3) ──

export interface IbdAutoAdjustParams {
  accounts: readonly BsAccountEntry[]
  bsValues: Readonly<Record<number, YearKeyedSeries>>
  lastYear: number
  excludedCurrentLiabIbd: ReadonlySet<number>
  excludedNonCurrentLiabIbd: ReadonlySet<number>
}

/**
 * Session 043 Task 3 — Auto-negate column D (Penyesuaian) for liability accounts
 * that are RETAINED as Interest Bearing Debt.
 *
 * Business rationale: user-curated IBD exclusion sets are the single source of
 * truth for the IBD/non-IBD split (LESSON-119). Retained IBD accounts (those
 * NOT excluded) represent financing obligations the user confirmed should be
 * IBD. By convention, IBD is not counted inside Net Asset Value — it is
 * subtracted later (NAV − IBD = Equity Value). To avoid double-counting and
 * to match the visual contract "E = 0 for retained IBD", we auto-apply
 * `adjustment = -historical` at the builder boundary.
 *
 * User aamAdjustments are still honored for ASSET and EQUITY sections; the
 * auto-map only covers CL + NCL retained IBD rows. Auto-map wins over user
 * input for those specific rows (locked in UI).
 *
 * Returns a plain Record<excelRow, adjustmentAmount> sized to the number of
 * retained IBD liability accounts.
 */
export function computeIbdAutoAdjustments(
  params: IbdAutoAdjustParams,
): Record<number, number> {
  const { accounts, bsValues, lastYear, excludedCurrentLiabIbd, excludedNonCurrentLiabIbd } = params
  const out: Record<number, number> = {}
  for (const acct of accounts) {
    const isCl = acct.section === 'current_liabilities'
    const isNcl = acct.section === 'non_current_liabilities'
    if (!isCl && !isNcl) continue
    const excluded = isCl ? excludedCurrentLiabIbd : excludedNonCurrentLiabIbd
    if (excluded.has(acct.excelRow)) continue
    const bsVal = bsValues[acct.excelRow]?.[lastYear] ?? 0
    // Zero historical stays zero (avoid JavaScript's -0 sentinel).
    out[acct.excelRow] = bsVal === 0 ? 0 : -bsVal
  }
  return out
}

// ── AAM Input Builder ──

export interface BuildAamParams {
  accounts: readonly BsAccountEntry[]
  allBs: Record<number, YearKeyedSeries>
  lastYear: number
  home: HomeInputs
  aamAdjustments: Record<number, number>
  /**
   * Session 041 Task 5: user-curated Interest Bearing Debt scope.
   * Sourced from `/valuation/interest-bearing-debt` page (mirror of WC
   * scope page UX). The numeric IBD total is derived via
   * `computeInterestBearingDebt(state)`; downstream builders accept the
   * derived number as a positive amount and reconcile sign at the boundary
   * (DCF/EEM negate internally per LESSON-011).
   *
   * Replaces both:
   *   - The Session 038 manual numeric input (`number | null`)
   *   - The legacy `isIbdAccount()` classifier-based auto-aggregation
   *
   * AAM CL/NCL display split is now also driven by this exclusion set —
   * `excludedXxx` accounts are treated as NON-IBD (user opted them out),
   * remaining liability accounts within the scope are treated as IBD.
   */
  interestBearingDebt: number
  /**
   * Session 041 Task 5: BS row sets the user marked as NON-IBD (i.e. user
   * opted these accounts out of the IBD scope on the dedicated page).
   * Empty default = no exclusions yet (every CL / NCL account counted as
   * IBD until user trims the list).
   */
  excludedCurrentLiabIbd?: ReadonlySet<number>
  excludedNonCurrentLiabIbd?: ReadonlySet<number>
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
  const {
    accounts,
    allBs,
    lastYear: ly,
    home,
    aamAdjustments: userAdj,
    interestBearingDebt,
    excludedCurrentLiabIbd,
    excludedNonCurrentLiabIbd,
  } = params
  // Session 043 Task 3: auto-compute Penyesuaian for retained IBD liabilities.
  // Merge auto-map AFTER user adjustments — auto wins for retained IBD rows
  // (UI locks those cells so users cannot override anyway). Non-liability
  // sections (assets, equity) remain fully user-driven.
  const autoAdj = computeIbdAutoAdjustments({
    accounts,
    bsValues: allBs,
    lastYear: ly,
    excludedCurrentLiabIbd: excludedCurrentLiabIbd ?? new Set(),
    excludedNonCurrentLiabIbd: excludedNonCurrentLiabIbd ?? new Set(),
  })
  const adj: Record<number, number> = { ...userAdj, ...autoAdj }
  const bs = (row: number) => allBs[row]?.[ly] ?? 0
  const a = (row: number) => adj[row] ?? 0
  const adjusted = (row: number) => bs(row) + a(row)
  const totalAdjustments = Object.values(adj).reduce((sum, v) => sum + v, 0)

  // Aggregate per section from dynamic accounts.
  // Session 041 Task 5: CL/NCL split is driven by the user-curated IBD
  // exclusion set (LESSON-074 isIbdAccount classifier removed). An account
  // appearing in the exclusion set means the user marked it NOT IBD on the
  // dedicated /valuation/interest-bearing-debt page.
  let totalCurrentAssets = 0
  let otherNonCurrentAssets = 0
  let intangibleAssets = 0
  let nonIbdCL = 0
  let ibdCL = 0
  let nonIbdNCL = 0
  let ibdNCL = 0
  let totalEquity = 0

  const exclCL = excludedCurrentLiabIbd
  const exclNCL = excludedNonCurrentLiabIbd

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
        if (exclCL?.has(acct.excelRow)) nonIbdCL += val
        else ibdCL += val
        break
      case 'non_current_liabilities':
        if (exclNCL?.has(acct.excelRow)) nonIbdNCL += val
        else ibdNCL += val
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

  // Session 041 Task 5: IBD total comes from `computeInterestBearingDebt`,
  // and the CL/NCL split is driven by the same exclusion set. Single source
  // of truth for both display and NAV math — no LESSON-074 classifier drift.

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

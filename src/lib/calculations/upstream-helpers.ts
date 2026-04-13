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
import type { AamInput } from '@/lib/calculations/aam-valuation'
import type { DcfInput } from '@/lib/calculations/dcf'
import type { BorrowingCapInput } from '@/lib/calculations/borrowing-cap'
import type { EemInput } from '@/lib/calculations/eem-valuation'
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
  incomeStatementRows: Record<number, YearKeyedSeries>
  fixedAssetRows: Record<number, YearKeyedSeries> | null
  accPayablesRows: Record<number, YearKeyedSeries> | null
  allBs: Record<number, YearKeyedSeries>
  histYears3: number[]
  histYears4: number[]
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
  const { balanceSheetRows, incomeStatementRows, fixedAssetRows, accPayablesRows, allBs, histYears3, histYears4 } = input

  const noplatLeaf = computeNoplatLiveRows(incomeStatementRows, histYears3)
  const noplatComp = deriveComputedRows(NOPLAT_MANIFEST.rows, noplatLeaf, histYears3)
  const allNoplat = { ...noplatLeaf, ...noplatComp }

  const cfsLeaf = computeCashFlowLiveRows(
    balanceSheetRows, incomeStatementRows, fixedAssetRows, accPayablesRows, histYears3, histYears4,
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
  allBs: Record<number, YearKeyedSeries>
  lastYear: number
  home: HomeInputs
  faAdjustment: number
}

/** Build AamInput from BS rows + home. Eliminates 20-param copy-paste. */
export function buildAamInput(params: BuildAamParams): AamInput {
  const { allBs, lastYear: ly, home, faAdjustment } = params
  const bs = (row: number) => allBs[row]?.[ly] ?? 0

  return {
    cashOnHands: bs(8), cashOnBank: bs(9),
    accountReceivable: bs(10), otherReceivable: bs(11),
    inventory: bs(12), otherCurrentAssets: bs(14),
    fixedAssetNet: bs(22), otherNonCurrentAssets: bs(23),
    intangibleAssets: bs(24), totalNonCurrentAssets: bs(25),
    faAdjustment,
    bankLoanST: bs(31), accountPayable: bs(32),
    taxPayable: bs(33), otherCurrentLiabilities: bs(34),
    bankLoanLT: bs(38), relatedPartyNCL: bs(39),
    modalDisetor: bs(43), agioDisagio: bs(44),
    retainedCurrentYear: bs(46), retainedPriorYears: bs(47),
    dlomPercent: home.dlomPercent,
    dlocPercent: home.dlocPercent,
    proporsiSaham: computeProporsiSaham(home),
    paidUpCapitalDeduction: home.jumlahSahamBeredar * home.nilaiNominalPerSaham,
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
}

/** Build DcfInput from upstream + projection pipeline. Eliminates 15-param copy-paste. */
export function buildDcfInput(params: BuildDcfParams): DcfInput {
  const { upstream, allBs, lastHistYear: ly, projYears, proyNoplatRows, proyFaRows, proyCfsRows, wacc, growthRate } = params
  const { allNoplat, allFa, allCfs, roicRows } = upstream

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
    interestBearingDebt: -((allBs[31]?.[ly] ?? 0) + (allBs[38]?.[ly] ?? 0)),
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
}

/** Build EemInput from AAM result + upstream data. */
export function buildEemInput(params: BuildEemParams): EemInput {
  const { aamResult, allBs, upstream, lastYear: ly, waccTangible, wacc } = params
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
    interestBearingDebt: -((allBs[31]?.[ly] ?? 0) + (allBs[38]?.[ly] ?? 0)),
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

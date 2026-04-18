/**
 * Shared projection pipeline — computes the full chain of projected
 * financial statements from historical input data + key drivers.
 *
 * Extracted from DCF and PROY CFS pages to eliminate ~90-line duplication.
 * Pure function — no store access, all data via parameters.
 *
 * Pipeline order (dependency chain):
 *   1. PROY FA  (from historical FA + growth rates)
 *   2. PROY LR  (from IS + key drivers + PROY FA depreciation)
 *   3. PROY NOPLAT (from PROY LR + tax rates)
 *   4. PROY BS  (from BS avg growth + PROY FA + PROY LR net profit)
 *   5. PROY ACC PAYABLES (from key drivers + BS loan balances)
 *   6. PROY CFS (from all of the above + historical cash ending)
 */

import type { HomeInputs } from '@/types'
import type { KeyDriversState } from '@/lib/store/useKkaStore'
import type {
  BalanceSheetInputState,
  IncomeStatementInputState,
  FixedAssetInputState,
} from '@/data/live/types'
import type { YearKeyedSeries } from '@/types/financial'
import { computeHistoricalYears, computeProjectionYears } from '@/lib/calculations/year-helpers'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { computeAvgGrowth, ratioOfBase } from '@/lib/calculations/helpers'
import { computeAverage } from '@/lib/calculations/derivation-helpers'
import { BALANCE_SHEET_MANIFEST } from '@/data/manifests/balance-sheet'
import { FIXED_ASSET_MANIFEST } from '@/data/manifests/fixed-asset'
import { buildDynamicBsManifest } from '@/data/manifests/build-dynamic-bs'
import { computeProyFixedAssetsLive } from '@/data/live/compute-proy-fixed-assets-live'
import { computeProyLrLive, type ProyLrInput } from '@/data/live/compute-proy-lr-live'
import { computeProyBsLive, type ProyBsInput } from '@/data/live/compute-proy-bs-live'
import { computeProyAccPayablesLive } from '@/data/live/compute-proy-acc-payables-live'
import { computeProyCfsLive, type ProyCfsInput } from '@/data/live/compute-proy-cfs-live'
import { computeProyNoplatLive, type ProyNoplatInput } from '@/data/live/compute-proy-noplat-live'

export interface ProjectionPipelineInput {
  home: HomeInputs
  balanceSheet: BalanceSheetInputState
  incomeStatement: IncomeStatementInputState
  fixedAsset: FixedAssetInputState | null
  keyDrivers: KeyDriversState
  /**
   * Session 039 — WC scope for projection ΔCA / ΔCL aggregation. `null`
   * defaults to "no exclusions" (all CA / CL accounts included). UI gates
   * downstream consumer pages via PageEmptyState when this is null.
   */
  changesInWorkingCapital?: {
    excludedCurrentAssets: readonly number[]
    excludedCurrentLiabilities: readonly number[]
  } | null
}

export interface ProjectionPipelineOutput {
  proyFaRows: Record<number, YearKeyedSeries>
  proyLrRows: Record<number, YearKeyedSeries>
  proyBsRows: Record<number, YearKeyedSeries>
  proyNoplatRows: Record<number, YearKeyedSeries>
  proyApRows: Record<number, YearKeyedSeries>
  proyCfsRows: Record<number, YearKeyedSeries>
  /** Historical BS with computed subtotals (needed for DCF IBD, excess cash). */
  allBs: Record<number, YearKeyedSeries>
  /** Historical FA computed subtotals (needed for DCF depreciation, capex). */
  faComp: Record<number, YearKeyedSeries> | null
  histYears4: number[]
  histYears3: number[]
  projYears: number[]
  lastHistYear: number
}

export function computeFullProjectionPipeline(
  input: ProjectionPipelineInput,
): ProjectionPipelineOutput {
  const { home, balanceSheet, incomeStatement, fixedAsset, keyDrivers, changesInWorkingCapital } = input

  const histYears4 = computeHistoricalYears(home.tahunTransaksi, 4)
  const histYears3 = computeHistoricalYears(home.tahunTransaksi, 3)
  const projYears = computeProjectionYears(home.tahunTransaksi)
  const lastHistYear = home.tahunTransaksi - 1

  // ── BS computed subtotals (needed for histCashEnding + downstream) ──
  // Merge: bsComp first, then store — sentinel subtotals override re-derived
  const bsComp = deriveComputedRows(BALANCE_SHEET_MANIFEST.rows, balanceSheet.rows, histYears4)
  const allBs = { ...bsComp, ...balanceSheet.rows }

  // ── Step 1: PROY FA ──
  let proyFaRows: Record<number, YearKeyedSeries> = {}
  let faComp: Record<number, YearKeyedSeries> | null = null
  if (fixedAsset) {
    faComp = deriveComputedRows(FIXED_ASSET_MANIFEST.rows, fixedAsset.rows, histYears3)
    const allFa = { ...faComp, ...fixedAsset.rows }
    proyFaRows = computeProyFixedAssetsLive(
      { accounts: fixedAsset.accounts, faRows: allFa, historicalYears: histYears3 },
      projYears,
    )
  }

  // ── Step 2: PROY LR (Session 049 — Revenue × avg common-size drivers) ──
  const isRows = incomeStatement.rows
  const isVal = (row: number) => isRows[row]?.[lastHistYear] ?? 0
  /**
   * avg( IS.row[y] / IS.6[y] ) across historical years. `computeAverage`
   * preserves leading-null / leading-zero skip semantics (LESSON-105).
   * Sign preserved: negative expense / positive revenue → negative ratio.
   */
  const avgCommonSizeFor = (row: number): number => {
    const ratios = histYears4.map((y) =>
      ratioOfBase(isRows[row]?.[y] ?? 0, isRows[6]?.[y] ?? 0),
    )
    return computeAverage(ratios) ?? 0
  }
  const lrInput: ProyLrInput = {
    keyDrivers,
    revenueGrowth: computeAvgGrowth(isRows[6] ?? {}),
    commonSize: {
      cogs: avgCommonSizeFor(7),
      totalOpEx: avgCommonSizeFor(15),
      interestIncome: avgCommonSizeFor(26),
      interestExpense: avgCommonSizeFor(27),
      nonOpIncome: avgCommonSizeFor(30),
    },
    isLastYear: {
      revenue: isVal(6), cogs: isVal(7), grossProfit: isVal(8),
      totalOpEx: isVal(15),
      depreciation: -(isVal(21)),
      interestIncome: isVal(26), interestExpense: isVal(27),
      nonOpIncome: isVal(30), tax: isVal(33),
    },
    proyFaDepreciation: proyFaRows[51] ?? {},
  }
  const proyLrRows = computeProyLrLive(lrInput, lastHistYear, projYears)

  // ── Step 3: PROY NOPLAT ──
  const histPbt = isVal(32)
  const histTax = isVal(33)
  const histTaxRate = histPbt !== 0 ? Math.abs(histTax / histPbt) : 0
  const noplatInput: ProyNoplatInput = {
    proyLrRows,
    taxRate: keyDrivers.financialDrivers.corporateTaxRate,
    isLastYear: {
      pbt: histPbt,
      interestExpense: isVal(27),
      interestIncome: isVal(26),
      nonOpIncome: isVal(30),
      tax: histTax,
    },
    histTaxRate,
  }
  const proyNoplatRows = computeProyNoplatLive(noplatInput, lastHistYear, projYears)

  // ── Step 4: PROY BS (Session 036 — Full Simple Growth model) ──
  // Per-account historical-growth projection via dynamic BS manifest.
  // No cross-refs to PROY FA / PROY LR — decoupled.
  const bsManifest = buildDynamicBsManifest(
    balanceSheet.accounts,
    balanceSheet.language,
    balanceSheet.yearCount,
    home.tahunTransaksi,
  )
  const bsInput: ProyBsInput = {
    accounts: balanceSheet.accounts,
    bsRows: balanceSheet.rows,
    historicalYears: histYears4,
    manifestRows: bsManifest.rows,
  }
  const proyBsRows = computeProyBsLive(bsInput, projYears)

  // ── Step 5: PROY ACC PAYABLES ──
  const proyApRows = computeProyAccPayablesLive({
    interestRateST: keyDrivers.financialDrivers.interestRateShortTerm,
    interestRateLT: keyDrivers.financialDrivers.interestRateLongTerm,
    stEnding: balanceSheet.rows[31]?.[lastHistYear] ?? 0,
    ltEnding: balanceSheet.rows[38]?.[lastHistYear] ?? 0,
  }, lastHistYear, projYears)

  // ── Step 6: PROY CFS ──
  const histCashEnding = (allBs[8]?.[lastHistYear] ?? 0) + (allBs[9]?.[lastHistYear] ?? 0)
  const cfsInput: ProyCfsInput = {
    proyLrRows, proyBsRows, proyFaRows, proyApRows,
    histCashEnding,
    bsAccounts: balanceSheet.accounts,
    excludedCurrentAssets: changesInWorkingCapital?.excludedCurrentAssets ?? [],
    excludedCurrentLiabilities: changesInWorkingCapital?.excludedCurrentLiabilities ?? [],
  }
  const proyCfsRows = computeProyCfsLive(cfsInput, lastHistYear, projYears)

  return {
    proyFaRows, proyLrRows, proyBsRows, proyNoplatRows, proyApRows, proyCfsRows,
    allBs, faComp,
    histYears4, histYears3, projYears, lastHistYear,
  }
}

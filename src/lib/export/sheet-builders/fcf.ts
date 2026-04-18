import type { SheetBuilder } from './types'
import { computeNoplatLiveRows } from '@/data/live/compute-noplat-live'
import { computeCashFlowLiveRows } from '@/data/live/compute-cash-flow-live'
import { computeFcfLiveRows } from '@/data/live/compute-fcf-live'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { NOPLAT_MANIFEST } from '@/data/manifests/noplat'
import { CASH_FLOW_STATEMENT_MANIFEST } from '@/data/manifests/cash-flow-statement'
import { FIXED_ASSET_MANIFEST } from '@/data/manifests/fixed-asset'
import { FCF_MANIFEST } from '@/data/manifests/fcf'
import { writeComputedRowsToSheet } from './computed-writer'

const SHEET_NAME = 'FCF'

/**
 * FcfBuilder — state-driven FCF sheet owner.
 *
 * build() composes the full upstream chain because FCF depends on
 * NOPLAT + FA computed subtotals + CFS computed subtotals:
 *   1. Year spans (cfs 3yr, bs 4yr)
 *   2. NOPLAT: computeNoplatLiveRows + deriveComputedRows
 *   3. FA: deriveComputedRows(FIXED_ASSET_MANIFEST) from fa.rows
 *   4. CFS: computeCashFlowLiveRows + deriveComputedRows
 *   5. FCF leaves: computeFcfLiveRows(allNoplat, faComp, allCfs, years)
 *   6. FCF full: deriveComputedRows(FCF_MANIFEST) for subtotals 9, 18, 20
 *
 * Upstream: ['home', 'balanceSheet', 'incomeStatement', 'fixedAsset'].
 * AP is optional for CFS financing section.
 */
export const FcfBuilder: SheetBuilder = {
  sheetName: SHEET_NAME,
  upstream: ['home', 'balanceSheet', 'incomeStatement', 'fixedAsset', 'changesInWorkingCapital'],
  build(workbook, state) {
    const ws = workbook.getWorksheet(SHEET_NAME)
    if (
      !ws ||
      !state.home ||
      !state.balanceSheet ||
      !state.incomeStatement ||
      !state.fixedAsset
    ) {
      return
    }

    const cfsYears = computeHistoricalYears(
      state.home.tahunTransaksi,
      FCF_MANIFEST.historicalYearCount ?? 3,
    )
    const bsYears = computeHistoricalYears(state.home.tahunTransaksi, 4)

    // NOPLAT full chain
    const noplatLeaf = computeNoplatLiveRows(state.incomeStatement.rows, cfsYears)
    const noplatComp = deriveComputedRows(NOPLAT_MANIFEST.rows, noplatLeaf, cfsYears)
    const allNoplat = { ...noplatLeaf, ...noplatComp }

    // FA computed subtotals
    const faComp = deriveComputedRows(
      FIXED_ASSET_MANIFEST.rows,
      state.fixedAsset.rows,
      cfsYears,
    )

    // CFS full chain
    const cfsLeaf = computeCashFlowLiveRows(
      state.balanceSheet.accounts,
      state.balanceSheet.rows,
      state.incomeStatement.rows,
      state.fixedAsset.rows,
      state.accPayables?.rows ?? null,
      cfsYears,
      bsYears,
      state.changesInWorkingCapital?.excludedCurrentAssets ?? [],
      state.changesInWorkingCapital?.excludedCurrentLiabilities ?? [],
    )
    const cfsComp = deriveComputedRows(
      CASH_FLOW_STATEMENT_MANIFEST.rows,
      cfsLeaf,
      cfsYears,
    )
    const allCfs = { ...cfsLeaf, ...cfsComp }

    // FCF
    const fcfLeaf = computeFcfLiveRows(allNoplat, faComp, allCfs, cfsYears)
    const fcfComp = deriveComputedRows(FCF_MANIFEST.rows, fcfLeaf, cfsYears)
    const allFcf = { ...fcfLeaf, ...fcfComp }

    writeComputedRowsToSheet(ws, FCF_MANIFEST, allFcf, cfsYears)
  },
}

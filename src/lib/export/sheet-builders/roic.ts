import type { SheetBuilder } from './types'
import { computeNoplatLiveRows } from '@/data/live/compute-noplat-live'
import { computeCashFlowLiveRows } from '@/data/live/compute-cash-flow-live'
import { computeFcfLiveRows } from '@/data/live/compute-fcf-live'
import { computeRoicLiveRows } from '@/data/live/compute-roic-live'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { BALANCE_SHEET_MANIFEST } from '@/data/manifests/balance-sheet'
import { NOPLAT_MANIFEST } from '@/data/manifests/noplat'
import { CASH_FLOW_STATEMENT_MANIFEST } from '@/data/manifests/cash-flow-statement'
import { FIXED_ASSET_MANIFEST } from '@/data/manifests/fixed-asset'
import { FCF_MANIFEST } from '@/data/manifests/fcf'
import { ROIC_MANIFEST } from '@/data/manifests/roic'
import { writeComputedRowsToSheet } from './computed-writer'

const SHEET_NAME = 'ROIC'

/**
 * RoicBuilder — state-driven ROIC sheet owner.
 *
 * ROIC needs:
 *   - FCF row 20 (full upstream chain: NOPLAT → FA → CFS → FCF)
 *   - BS row 27 (Total Assets) and row 8 (Cash on Hand)
 *
 * build() composes the full chain, then calls computeRoicLiveRows which
 * handles cross-year references (row 13 = prior year's row 12) internally.
 * No deriveComputedRows call for ROIC — the manifest has no computedFrom
 * because year 1 has no prior-year baseline.
 *
 * Upstream: ['home', 'balanceSheet', 'incomeStatement', 'fixedAsset'].
 */
export const RoicBuilder: SheetBuilder = {
  sheetName: SHEET_NAME,
  upstream: ['home', 'balanceSheet', 'incomeStatement', 'fixedAsset'],
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
      ROIC_MANIFEST.historicalYearCount ?? 3,
    )
    const bsYears = computeHistoricalYears(state.home.tahunTransaksi, 4)

    // BS computed subtotals (row 27 = Total Assets needed)
    const bsComp = deriveComputedRows(
      BALANCE_SHEET_MANIFEST.rows,
      state.balanceSheet.rows,
      bsYears,
    )
    // Store sentinels win over re-derived values (LESSON-057)
    const allBs = { ...bsComp, ...state.balanceSheet.rows }

    // NOPLAT
    const noplatLeaf = computeNoplatLiveRows(state.incomeStatement.rows, cfsYears)
    const noplatComp = deriveComputedRows(NOPLAT_MANIFEST.rows, noplatLeaf, cfsYears)
    const allNoplat = { ...noplatLeaf, ...noplatComp }

    // FA computed
    const faComp = deriveComputedRows(
      FIXED_ASSET_MANIFEST.rows,
      state.fixedAsset.rows,
      cfsYears,
    )

    // CFS
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

    // ROIC
    const roicRows = computeRoicLiveRows(allFcf, allBs, cfsYears)

    writeComputedRowsToSheet(ws, ROIC_MANIFEST, roicRows, cfsYears)
  },
}

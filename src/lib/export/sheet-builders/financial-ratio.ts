import type { SheetBuilder } from './types'
import { computeFinancialRatioLiveRows } from '@/data/live/compute-financial-ratio-live'
import { computeNoplatLiveRows } from '@/data/live/compute-noplat-live'
import { computeCashFlowLiveRows } from '@/data/live/compute-cash-flow-live'
import { computeFcfLiveRows } from '@/data/live/compute-fcf-live'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { NOPLAT_MANIFEST } from '@/data/manifests/noplat'
import { CASH_FLOW_STATEMENT_MANIFEST } from '@/data/manifests/cash-flow-statement'
import { FIXED_ASSET_MANIFEST } from '@/data/manifests/fixed-asset'
import { FCF_MANIFEST } from '@/data/manifests/fcf'
import { FINANCIAL_RATIO_MANIFEST } from '@/data/manifests/financial-ratio'
import { writeComputedRowsToSheet } from './computed-writer'

const SHEET_NAME = 'FINANCIAL RATIO'

/**
 * FinancialRatioBuilder — state-driven FINANCIAL RATIO sheet owner.
 *
 * 18 ratios split across 4 sections. BS + IS are mandatory (14/18 ratios
 * need only these). When FA + AP are also available, the CFS chain
 * populates rows 26/28/30. When FA is available, FCF populates row 27.
 *
 * Upstream: ['home', 'balanceSheet', 'incomeStatement']. FA + AP are
 * optional per compute-financial-ratio-live design.
 */
export const FinancialRatioBuilder: SheetBuilder = {
  sheetName: SHEET_NAME,
  upstream: ['home', 'balanceSheet', 'incomeStatement'],
  build(workbook, state) {
    const ws = workbook.getWorksheet(SHEET_NAME)
    if (!ws || !state.home || !state.balanceSheet || !state.incomeStatement) return

    const cfsYears = computeHistoricalYears(
      state.home.tahunTransaksi,
      FINANCIAL_RATIO_MANIFEST.historicalYearCount ?? 3,
    )
    const bsYears = computeHistoricalYears(state.home.tahunTransaksi, 4)

    // CFS chain (optional upstream → falls through to null if FA missing)
    const cfsLeaf = computeCashFlowLiveRows(
      state.balanceSheet.accounts,
      state.balanceSheet.rows,
      state.incomeStatement.rows,
      state.fixedAsset?.rows ?? null,
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

    // FCF chain (only if FA provided — else pass null for row 27)
    let allFcf: Record<number, import('@/types/financial').YearKeyedSeries> | null = null
    if (state.fixedAsset) {
      const noplatLeaf = computeNoplatLiveRows(state.incomeStatement.rows, cfsYears)
      const noplatComp = deriveComputedRows(NOPLAT_MANIFEST.rows, noplatLeaf, cfsYears)
      const allNoplat = { ...noplatLeaf, ...noplatComp }
      const faComp = deriveComputedRows(
        FIXED_ASSET_MANIFEST.rows,
        state.fixedAsset.rows,
        cfsYears,
      )
      const fcfLeaf = computeFcfLiveRows(allNoplat, faComp, allCfs, cfsYears)
      const fcfComp = deriveComputedRows(FCF_MANIFEST.rows, fcfLeaf, cfsYears)
      allFcf = { ...fcfLeaf, ...fcfComp }
    }

    const ratios = computeFinancialRatioLiveRows(
      state.balanceSheet.rows,
      state.incomeStatement.rows,
      cfsYears,
      allCfs,
      allFcf,
    )

    writeComputedRowsToSheet(ws, FINANCIAL_RATIO_MANIFEST, ratios, cfsYears)
  },
}

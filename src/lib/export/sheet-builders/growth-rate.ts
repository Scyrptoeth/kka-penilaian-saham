import type { SheetBuilder } from './types'
import { computeNoplatLiveRows } from '@/data/live/compute-noplat-live'
import { computeCashFlowLiveRows } from '@/data/live/compute-cash-flow-live'
import { computeFcfLiveRows } from '@/data/live/compute-fcf-live'
import { computeRoicLiveRows } from '@/data/live/compute-roic-live'
import { computeGrowthRateLive } from '@/data/live/compute-growth-rate-live'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { BALANCE_SHEET_MANIFEST } from '@/data/manifests/balance-sheet'
import { NOPLAT_MANIFEST } from '@/data/manifests/noplat'
import { CASH_FLOW_STATEMENT_MANIFEST } from '@/data/manifests/cash-flow-statement'
import { FIXED_ASSET_MANIFEST } from '@/data/manifests/fixed-asset'
import { FCF_MANIFEST } from '@/data/manifests/fcf'

const SHEET_NAME = 'GROWTH RATE'

/**
 * GrowthRateBuilder — state-driven GROWTH RATE sheet owner.
 *
 * GROWTH RATE has no SheetManifest (custom page layout, 2 years only).
 * Build writes cells directly per compute-growth-rate-live layout:
 *
 *   Column B = grYears[0] (e.g. 2020)
 *   Column C = grYears[1] (e.g. 2021)
 *
 *   row 6:  netFaEnd  (from FA sentinel row 69)
 *   row 7:  netCaEnd  (from BS sentinel row 16)
 *   row 8:  netFaBeg  (negative, from BS row 22 prior-year)
 *   row 9:  netCaBeg  (negative, from BS row 16 prior-year)
 *   row 10: totalNetInvestment (SUM(6:9))
 *   row 12: totalIcBoy (from ROIC row 12 prior-year)
 *   row 14: growthRates (row 10 / row 12)
 *   row 15: Average of growth rates (single cell at B15)
 *
 * Upstream: ['home', 'balanceSheet', 'incomeStatement', 'fixedAsset'].
 * AP optional for CFS chain.
 */
export const GrowthRateBuilder: SheetBuilder = {
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

    const cfsYears = computeHistoricalYears(state.home.tahunTransaksi, 3)
    const bsYears = computeHistoricalYears(state.home.tahunTransaksi, 4)

    // BS computed (for row 27 Total Assets — used by ROIC — and as allBs)
    const bsComp = deriveComputedRows(
      BALANCE_SHEET_MANIFEST.rows,
      state.balanceSheet.rows,
      bsYears,
    )
    const allBs = { ...bsComp, ...state.balanceSheet.rows }

    // NOPLAT
    const noplatLeaf = computeNoplatLiveRows(state.incomeStatement.rows, cfsYears)
    const noplatComp = deriveComputedRows(NOPLAT_MANIFEST.rows, noplatLeaf, cfsYears)
    const allNoplat = { ...noplatLeaf, ...noplatComp }

    // FA computed — merge with store so sentinel row 69 survives
    const faCompOnly = deriveComputedRows(
      FIXED_ASSET_MANIFEST.rows,
      state.fixedAsset.rows,
      cfsYears,
    )
    const allFa = { ...faCompOnly, ...state.fixedAsset.rows }

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
    const fcfLeaf = computeFcfLiveRows(allNoplat, faCompOnly, allCfs, cfsYears)
    const fcfComp = deriveComputedRows(FCF_MANIFEST.rows, fcfLeaf, cfsYears)
    const allFcf = { ...fcfLeaf, ...fcfComp }

    // ROIC
    const roicRows = computeRoicLiveRows(allFcf, allBs, cfsYears)

    // Growth Rate
    const gr = computeGrowthRateLive(allBs, allFa, roicRows, cfsYears)
    if (!gr) return

    // Layout: B = grYears[0], C = grYears[1]
    const cols = ['B', 'C'] as const
    for (let i = 0; i < gr.years.length && i < cols.length; i++) {
      const col = cols[i]
      ws.getCell(`${col}6`).value = gr.inputs.netFaEnd[i]
      ws.getCell(`${col}7`).value = gr.inputs.netCaEnd[i]
      ws.getCell(`${col}8`).value = gr.inputs.netFaBeg[i]
      ws.getCell(`${col}9`).value = gr.inputs.netCaBeg[i]
      ws.getCell(`${col}10`).value = gr.result.totalNetInvestment[i]
      ws.getCell(`${col}12`).value = gr.inputs.totalIcBoy[i]
      ws.getCell(`${col}14`).value = gr.result.growthRates[i]
    }
    ws.getCell('B15').value = gr.result.average
  },
}

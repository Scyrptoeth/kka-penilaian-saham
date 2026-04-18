import type { SheetBuilder } from './types'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { BALANCE_SHEET_MANIFEST } from '@/data/manifests/balance-sheet'
import {
  computeHistoricalUpstream,
  buildAamInput, buildEemInput, buildBorrowingCapInput,
} from '@/lib/calculations/upstream-helpers'
import { computeDiscountRate, buildDiscountRateInput } from '@/lib/calculations/discount-rate'
import { computeAam } from '@/lib/calculations/aam-valuation'
import { computeBorrowingCap } from '@/lib/calculations/borrowing-cap'
import { computeEem } from '@/lib/calculations/eem-valuation'

const SHEET_NAME = 'EEM'

/**
 * EemBuilder — state-driven EEM (Excess Earnings Method) sheet owner.
 *
 * EEM uses HISTORICAL data only — no projection pipeline required.
 * Upstream: home + BS + IS + FA + discountRate. (AP optional; bcInput optional.)
 *
 * Rows 35-45 (DLOM/DLOC/share-value tail) are LEFT UNTOUCHED — template
 * formulas there reference HOME/DLOM/... cells owned by other builders.
 */
export const EemBuilder: SheetBuilder = {
  sheetName: SHEET_NAME,
  upstream: ['home', 'balanceSheet', 'incomeStatement', 'fixedAsset', 'discountRate', 'interestBearingDebt'],
  build(workbook, state) {
    const ws = workbook.getWorksheet(SHEET_NAME)
    if (
      !ws ||
      !state.home ||
      !state.balanceSheet ||
      !state.incomeStatement ||
      !state.fixedAsset ||
      !state.discountRate ||
      state.interestBearingDebt === null
    ) {
      return
    }

    const ibd = state.interestBearingDebt

    const histYears3 = computeHistoricalYears(state.home.tahunTransaksi, 3)
    const histYears4 = computeHistoricalYears(state.home.tahunTransaksi, 4)
    const lastYear = histYears4[histYears4.length - 1]!

    const bsComp = deriveComputedRows(
      BALANCE_SHEET_MANIFEST.rows,
      state.balanceSheet.rows,
      histYears4,
    )
    const allBs = { ...bsComp, ...state.balanceSheet.rows }

    const upstream = computeHistoricalUpstream({
      balanceSheetRows: state.balanceSheet.rows,
      incomeStatementRows: state.incomeStatement.rows,
      fixedAssetRows: state.fixedAsset.rows,
      accPayablesRows: state.accPayables?.rows ?? null,
      allBs,
      histYears3,
      histYears4,
    })

    const dr = computeDiscountRate(buildDiscountRateInput(state.discountRate))

    const aamResult = computeAam(buildAamInput({
      accounts: state.balanceSheet.accounts,
      allBs,
      lastYear,
      home: state.home,
      aamAdjustments: state.aamAdjustments,
      interestBearingDebt: ibd,
    }))

    const bc = computeBorrowingCap(buildBorrowingCapInput({
      allBs, lastYear, bcInput: state.borrowingCapInput, dr,
    }))

    const eemInput = buildEemInput({
      aamResult, allBs, upstream, lastYear,
      waccTangible: bc.waccTangible, wacc: dr.wacc,
      interestBearingDebt: ibd,
    })
    const eem = computeEem(eemInput)

    // Column D = values; column C = two rates (waccTangible, WACC).
    ws.getCell('D7').value = eem.netTangibleAsset
    ws.getCell('C8').value = eemInput.waccTangible
    ws.getCell('D9').value = eem.earningReturn

    // Historical FCF build-out rows 12-25
    ws.getCell('D12').value = eemInput.historicalNoplat
    ws.getCell('D13').value = eemInput.historicalDepreciation
    ws.getCell('D14').value = eem.grossCashFlow
    ws.getCell('D17').value = upstream.allCfs[8]?.[lastYear] ?? 0
    ws.getCell('D18').value = upstream.allCfs[9]?.[lastYear] ?? 0
    ws.getCell('D19').value = eem.totalWC
    ws.getCell('D21').value = eemInput.historicalCapex
    ws.getCell('D23').value = eem.grossInvestment
    ws.getCell('D25').value = eem.fcf

    ws.getCell('D27').value = eem.excessEarning
    ws.getCell('C28').value = eemInput.wacc
    ws.getCell('D29').value = eem.capitalizedExcess

    ws.getCell('D31').value = eem.enterpriseValue
    ws.getCell('D32').value = eemInput.interestBearingDebt
    ws.getCell('D33').value = eemInput.nonOperatingAsset
    ws.getCell('D34').value = eem.equityValue100
  },
}

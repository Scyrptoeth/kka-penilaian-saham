import type { SheetBuilder } from './types'
import { computeFullProjectionPipeline } from '@/lib/calculations/projection-pipeline'
import {
  computeHistoricalUpstream, buildDcfInput, buildCfiInput,
} from '@/lib/calculations/upstream-helpers'
import { computeDcf } from '@/lib/calculations/dcf'
import { computeDiscountRate, buildDiscountRateInput } from '@/lib/calculations/discount-rate'
import { computeCfi } from '@/lib/calculations/cfi'

const SHEET_NAME = 'CFI'

/**
 * CfiBuilder — state-driven CFI (Cash Flow Available to Investor) sheet owner.
 *
 * Layout (6-year span):
 *   B/C/D = histYears3[0..2]
 *   E/F/G = projYears[0..2]
 *   Row 7: FCF (B-D = FCF!C/D/E row 20 historical; E-G = DCF projectedFcf)
 *   Row 8: Add: Cash Flow from Non-Operations (hist = IS row 30; proj = PROY LR row 34)
 *   Row 9: CFI = row 7 + row 8
 */
export const CfiBuilder: SheetBuilder = {
  sheetName: SHEET_NAME,
  upstream: ['home', 'balanceSheet', 'incomeStatement', 'fixedAsset', 'keyDrivers', 'discountRate', 'interestBearingDebt'],
  build(workbook, state) {
    const ws = workbook.getWorksheet(SHEET_NAME)
    if (
      !ws ||
      !state.home ||
      !state.balanceSheet ||
      !state.incomeStatement ||
      !state.fixedAsset ||
      !state.keyDrivers ||
      !state.discountRate ||
      state.interestBearingDebt === null
    ) {
      return
    }

    const ibd = state.interestBearingDebt

    const pipeline = computeFullProjectionPipeline({
      home: state.home,
      balanceSheet: state.balanceSheet,
      incomeStatement: state.incomeStatement,
      fixedAsset: state.fixedAsset,
      keyDrivers: state.keyDrivers,
    })

    const { allBs, proyNoplatRows, proyFaRows, proyCfsRows, histYears3, histYears4, projYears, lastHistYear } = pipeline

    const upstream = computeHistoricalUpstream({
      balanceSheetRows: state.balanceSheet.rows,
      incomeStatementRows: state.incomeStatement.rows,
      fixedAssetRows: state.fixedAsset.rows,
      accPayablesRows: state.accPayables?.rows ?? null,
      allBs, histYears3, histYears4,
    })

    const dr = computeDiscountRate(buildDiscountRateInput(state.discountRate))

    const dcf = computeDcf(buildDcfInput({
      upstream, allBs, lastHistYear, projYears,
      proyNoplatRows, proyFaRows, proyCfsRows,
      wacc: dr.wacc, growthRate: upstream.growthRate,
      interestBearingDebt: ibd,
    }))

    const cfi = computeCfi(buildCfiInput({
      upstream, histYears3, projYears,
      dcfProjectedFcf: dcf.projectedFcf,
      proyLrRows: pipeline.proyLrRows,
      incomeStatementRows: state.incomeStatement.rows,
    }))

    const histCols = ['B', 'C', 'D'] as const
    const projCols = ['E', 'F', 'G'] as const

    // Row 7: FCF — historical from upstream.allFcf[20], projected from DCF
    for (let i = 0; i < histCols.length; i++) {
      ws.getCell(`${histCols[i]}7`).value = upstream.allFcf[20]?.[histYears3[i]!] ?? 0
    }
    for (let i = 0; i < projCols.length; i++) {
      ws.getCell(`${projCols[i]}7`).value = dcf.projectedFcf[i] ?? 0
    }

    // Row 8: Non-Op CF
    for (let i = 0; i < histCols.length; i++) {
      ws.getCell(`${histCols[i]}8`).value = cfi.nonOpCf[histYears3[i]!] ?? 0
    }
    for (let i = 0; i < projCols.length; i++) {
      ws.getCell(`${projCols[i]}8`).value = cfi.nonOpCf[projYears[i]!] ?? 0
    }

    // Row 9: CFI = row7 + row8
    for (let i = 0; i < histCols.length; i++) {
      ws.getCell(`${histCols[i]}9`).value = cfi.cfi[histYears3[i]!] ?? 0
    }
    for (let i = 0; i < projCols.length; i++) {
      ws.getCell(`${projCols[i]}9`).value = cfi.cfi[projYears[i]!] ?? 0
    }
  },
}

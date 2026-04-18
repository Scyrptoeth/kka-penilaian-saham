import type { SheetBuilder } from './types'
import { computeFullProjectionPipeline } from '@/lib/calculations/projection-pipeline'
import { computeHistoricalUpstream, buildDcfInput } from '@/lib/calculations/upstream-helpers'
import { computeDcf } from '@/lib/calculations/dcf'
import { computeDiscountRate, buildDiscountRateInput } from '@/lib/calculations/discount-rate'

const SHEET_NAME = 'DCF'

/**
 * DcfBuilder — state-driven DCF sheet owner.
 *
 * Writes FCF + discounting + terminal value + equity value summary
 * across mixed columns (C = last hist year, D-F = 3 projection years).
 *
 * Rows 34-42 (DLOM/DLOC/share-value tail) are LEFT UNTOUCHED — the
 * template's cross-sheet formulas there reference cells that other
 * builders populate (HOME!B8, EEM!C35). Preserving those formulas keeps
 * the live-reactivity chain intact in Excel.
 */
export const DcfBuilder: SheetBuilder = {
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
      allBs,
      histYears3,
      histYears4,
    })

    const dr = computeDiscountRate(buildDiscountRateInput(state.discountRate))

    const dcfInput = buildDcfInput({
      upstream, allBs, lastHistYear, projYears,
      proyNoplatRows, proyFaRows, proyCfsRows,
      wacc: dr.wacc, growthRate: upstream.growthRate,
      interestBearingDebt: ibd,
    })
    const dcf = computeDcf(dcfInput)

    // Column map for DCF: C = hist, D/E/F = proj[0..2]
    const projCols: readonly string[] = ['D', 'E', 'F']

    // ── Rows 7-9: NOPLAT / Depreciation / Gross CF ──
    ws.getCell('C7').value = dcfInput.historicalNoplat
    ws.getCell('C8').value = dcfInput.historicalDepreciation
    ws.getCell('C9').value = dcfInput.historicalNoplat + dcfInput.historicalDepreciation
    for (let i = 0; i < projCols.length; i++) {
      const col = projCols[i]!
      const n = dcfInput.projectedNoplat[i] ?? 0
      const d = dcfInput.projectedDepreciation[i] ?? 0
      ws.getCell(`${col}7`).value = n
      ws.getCell(`${col}8`).value = d
      ws.getCell(`${col}9`).value = n + d
    }

    // ── Rows 12-14: Change in CA / CL / Total WC ──
    ws.getCell('C12').value = dcfInput.historicalChangesCA
    ws.getCell('C13').value = dcfInput.historicalChangesCL
    ws.getCell('C14').value = dcfInput.historicalChangesCA + dcfInput.historicalChangesCL
    for (let i = 0; i < projCols.length; i++) {
      const col = projCols[i]!
      const ca = dcfInput.projectedChangesCA[i] ?? 0
      const cl = dcfInput.projectedChangesCL[i] ?? 0
      ws.getCell(`${col}12`).value = ca
      ws.getCell(`${col}13`).value = cl
      ws.getCell(`${col}14`).value = ca + cl
    }

    // ── Row 16: CapEx ──
    ws.getCell('C16').value = dcfInput.historicalCapex
    for (let i = 0; i < projCols.length; i++) {
      ws.getCell(`${projCols[i]!}16`).value = dcfInput.projectedCapex[i] ?? 0
    }

    // ── Row 18: Total Invest = WC + CapEx ──
    ws.getCell('C18').value = (dcfInput.historicalChangesCA + dcfInput.historicalChangesCL) + dcfInput.historicalCapex
    for (let i = 0; i < projCols.length; i++) {
      const col = projCols[i]!
      const wc = (dcfInput.projectedChangesCA[i] ?? 0) + (dcfInput.projectedChangesCL[i] ?? 0)
      ws.getCell(`${col}18`).value = wc + (dcfInput.projectedCapex[i] ?? 0)
    }

    // ── Row 20: FCF (historical + projected) ──
    ws.getCell('C20').value = dcf.historicalFcf
    for (let i = 0; i < projCols.length; i++) {
      ws.getCell(`${projCols[i]!}20`).value = dcf.projectedFcf[i] ?? 0
    }

    // ── Row 22: Periods (D-F only) ──
    for (let i = 0; i < projCols.length; i++) {
      ws.getCell(`${projCols[i]!}22`).value = dcf.periods[i] ?? i + 1
    }

    // ── Row 23: WACC at B + discount factors at D-F ──
    ws.getCell('B23').value = dcf.pvFcf.length > 0 ? dcfInput.wacc : 0
    for (let i = 0; i < projCols.length; i++) {
      ws.getCell(`${projCols[i]!}23`).value = dcf.discountFactors[i] ?? 0
    }

    // ── Row 24: PV FCF (D-F) ──
    for (let i = 0; i < projCols.length; i++) {
      ws.getCell(`${projCols[i]!}24`).value = dcf.pvFcf[i] ?? 0
    }

    // ── Row 25: Total PV FCF ──
    ws.getCell('C25').value = dcf.totalPvFcf

    // ── Row 26: Growth rate (B) ──
    ws.getCell('B26').value = dcfInput.growthRate

    // ── Rows 27-29: Terminal / PV Terminal / Enterprise Value ──
    ws.getCell('C27').value = dcf.terminalValue
    ws.getCell('C28').value = dcf.pvTerminal
    ws.getCell('C29').value = dcf.enterpriseValue

    // ── Rows 30-32: IBD / Excess Cash / Idle Asset ──
    ws.getCell('C30').value = dcfInput.interestBearingDebt
    ws.getCell('C31').value = dcfInput.excessCash
    ws.getCell('C32').value = dcfInput.idleAsset

    // ── Row 33: Equity Value (100%) ──
    ws.getCell('C33').value = dcf.equityValue100

    // Year headers rows 5/6 + labels left to template — no writes.
    void histYears3
  },
}

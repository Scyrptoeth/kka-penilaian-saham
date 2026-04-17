import type { SheetBuilder } from './types'
import { computeHistoricalYears, computeProjectionYears } from '@/lib/calculations/year-helpers'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { BALANCE_SHEET_MANIFEST } from '@/data/manifests/balance-sheet'
import { computeFullProjectionPipeline } from '@/lib/calculations/projection-pipeline'

const SHEET_NAME = 'DASHBOARD'

/**
 * DashboardBuilder — state-driven DASHBOARD sheet owner.
 *
 * The visible DASHBOARD template contains a compact 4-block summary at
 * rows 58-62 × columns G/L/P/U (labels+years) and H/M/Q/V (values):
 *
 *   Block 1 (G/H): year = lastHistYear - 1     (2 yrs ago)
 *   Block 2 (L/M): year = "?"                   (template placeholder; zeros)
 *   Block 3 (P/Q): year = lastHistYear          (most-recent historical)
 *   Block 4 (U/V): year = projYears[0]          (1st projection)
 *
 * Metrics per block:
 *   Row 59: Net Profit (IS row 35 historical, PROY LR row 39 projected)
 *   Row 60: Ekuitas    (BS row 48 total equity)
 *   Row 61: DER        = (-BS row 31 + -BS row 38) / Ekuitas
 *   Row 62: NPM        = Net Profit / Revenue
 *
 * Upstream MANDATORY: home + balanceSheet + incomeStatement (for
 * historical blocks). Projection block (U/V) lights up only when
 * keyDrivers + fixedAsset are also populated; otherwise those cells
 * get zeros — same pattern as the website Dashboard page.
 */
export const DashboardBuilder: SheetBuilder = {
  sheetName: SHEET_NAME,
  upstream: ['home', 'balanceSheet', 'incomeStatement'],
  build(workbook, state) {
    const ws = workbook.getWorksheet(SHEET_NAME)
    if (!ws || !state.home || !state.balanceSheet || !state.incomeStatement) {
      return
    }

    const histYears4 = computeHistoricalYears(state.home.tahunTransaksi, 4)
    const lastHistYear = histYears4[histYears4.length - 1]!
    const priorHistYear = lastHistYear - 1
    const projYear = computeProjectionYears(state.home.tahunTransaksi)[0]!

    const bsComp = deriveComputedRows(
      BALANCE_SHEET_MANIFEST.rows,
      state.balanceSheet.rows,
      histYears4,
    )
    const allBs = { ...bsComp, ...state.balanceSheet.rows }
    const isRows = state.incomeStatement.rows

    const netProfit = (year: number): number => isRows[35]?.[year] ?? 0
    const revenue = (year: number): number => isRows[6]?.[year] ?? 0
    const equity = (year: number): number => allBs[48]?.[year] ?? 0
    const ibd = (year: number): number => {
      const st = allBs[31]?.[year] ?? 0
      const lt = allBs[38]?.[year] ?? 0
      return -(st + lt) // stored negative in BS → take absolute
    }
    const safeDiv = (num: number, den: number): number => (den !== 0 ? num / den : 0)

    // ── Block 1: G/H (priorHistYear) ──
    ws.getCell('G58').value = priorHistYear
    ws.getCell('H59').value = netProfit(priorHistYear)
    ws.getCell('H60').value = equity(priorHistYear)
    ws.getCell('H61').value = safeDiv(ibd(priorHistYear), equity(priorHistYear))
    ws.getCell('H62').value = safeDiv(netProfit(priorHistYear), revenue(priorHistYear))

    // ── Block 2: L/M (placeholder) ──
    ws.getCell('L58').value = '?'
    ws.getCell('M59').value = 0
    ws.getCell('M60').value = 0
    ws.getCell('M61').value = 0
    ws.getCell('M62').value = 0

    // ── Block 3: P/Q (lastHistYear) ──
    ws.getCell('P58').value = lastHistYear
    ws.getCell('Q59').value = netProfit(lastHistYear)
    ws.getCell('Q60').value = equity(lastHistYear)
    ws.getCell('Q61').value = safeDiv(ibd(lastHistYear), equity(lastHistYear))
    ws.getCell('Q62').value = safeDiv(netProfit(lastHistYear), revenue(lastHistYear))

    // ── Block 4: U/V (projYear[0]) — requires KD + FA ──
    ws.getCell('U58').value = projYear
    if (state.keyDrivers && state.fixedAsset) {
      const pipeline = computeFullProjectionPipeline({
        home: state.home,
        balanceSheet: state.balanceSheet,
        incomeStatement: state.incomeStatement,
        fixedAsset: state.fixedAsset,
        keyDrivers: state.keyDrivers,
      })
      const proyLrRows = pipeline.proyLrRows
      const proyBsRows = pipeline.proyBsRows

      const projNp = proyLrRows[39]?.[projYear] ?? 0
      const projRev = proyLrRows[6]?.[projYear] ?? 0

      // PROY BS Shareholders Equity row 60 ≈ website BS[48]
      const projEquity = proyBsRows[60]?.[projYear] ?? 0

      // PROY BS: rows 37 (Bank ST) + 48 (Bank LT) — stored negative.
      // computed output has them already projected.
      const projSt = proyBsRows[37]?.[projYear] ?? 0
      const projLt = proyBsRows[48]?.[projYear] ?? 0
      const projIbd = -(projSt + projLt)

      ws.getCell('V59').value = projNp
      ws.getCell('V60').value = projEquity
      ws.getCell('V61').value = safeDiv(projIbd, projEquity)
      ws.getCell('V62').value = safeDiv(projNp, projRev)
    } else {
      ws.getCell('V59').value = 0
      ws.getCell('V60').value = 0
      ws.getCell('V61').value = 0
      ws.getCell('V62').value = 0
    }
  },
}

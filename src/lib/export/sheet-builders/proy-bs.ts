import type { SheetBuilder } from './types'
import { computeFullProjectionPipeline } from '@/lib/calculations/projection-pipeline'

const SHEET_NAME = 'PROY BALANCE SHEET'

/**
 * ProyBsBuilder — state-driven PROY BALANCE SHEET owner.
 *
 * Layout: Column C = lastHistYear, D/E/F = 3 projection years.
 * Rows are whichever keys `computeProyBsLive` populates
 * (see `src/data/live/compute-proy-bs-live.ts` for the authoritative list).
 * Iterating over the computed output keeps the builder resilient to future
 * compute changes — fixture-driven tests validate correctness.
 */
export const ProyBsBuilder: SheetBuilder = {
  sheetName: SHEET_NAME,
  upstream: ['home', 'balanceSheet', 'incomeStatement', 'fixedAsset', 'keyDrivers'],
  build(workbook, state) {
    const ws = workbook.getWorksheet(SHEET_NAME)
    if (
      !ws ||
      !state.home ||
      !state.balanceSheet ||
      !state.incomeStatement ||
      !state.fixedAsset ||
      !state.keyDrivers
    ) {
      return
    }

    const pipeline = computeFullProjectionPipeline({
      home: state.home,
      balanceSheet: state.balanceSheet,
      incomeStatement: state.incomeStatement,
      fixedAsset: state.fixedAsset,
      keyDrivers: state.keyDrivers,
    })

    const { proyBsRows, lastHistYear, projYears } = pipeline

    const cols: Array<[string, number]> = [
      ['C', lastHistYear],
      ['D', projYears[0] ?? 0],
      ['E', projYears[1] ?? 0],
      ['F', projYears[2] ?? 0],
    ]

    for (const [col, year] of cols) {
      if (!year) continue
      for (const rowStr of Object.keys(proyBsRows)) {
        const row = Number(rowStr)
        const val = proyBsRows[row]?.[year]
        if (val === undefined || !Number.isFinite(val)) continue
        ws.getCell(`${col}${row}`).value = val
      }
    }
  },
}

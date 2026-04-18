import type { SheetBuilder } from './types'
import { computeFullProjectionPipeline } from '@/lib/calculations/projection-pipeline'

const SHEET_NAME = 'PROY NOPLAT'

/**
 * ProyNoplatBuilder — state-driven PROY NOPLAT sheet owner.
 *
 * Layout: Column C = lastHistYear, D/E/F = 3 projection years.
 * Writes rows produced by `computeProyNoplatLive`: 7-11, 13-17, 19.
 */
export const ProyNoplatBuilder: SheetBuilder = {
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
      changesInWorkingCapital: state.changesInWorkingCapital,
    })

    const { proyNoplatRows, lastHistYear, projYears } = pipeline

    const cols: Array<[string, number]> = [
      ['C', lastHistYear],
      ['D', projYears[0] ?? 0],
      ['E', projYears[1] ?? 0],
      ['F', projYears[2] ?? 0],
    ]

    for (const [col, year] of cols) {
      if (!year) continue
      for (const rowStr of Object.keys(proyNoplatRows)) {
        const row = Number(rowStr)
        const val = proyNoplatRows[row]?.[year]
        if (val === undefined || !Number.isFinite(val)) continue
        ws.getCell(`${col}${row}`).value = val
      }
    }
  },
}

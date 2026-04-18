import type { SheetBuilder } from './types'
import { computeFullProjectionPipeline } from '@/lib/calculations/projection-pipeline'

const SHEET_NAME = 'PROY LR'

/**
 * ProyLrBuilder — state-driven PROY LR (Projected P&L) sheet owner.
 *
 * Layout (matching proy-lr.json fixture):
 *   Column C = lastHistYear
 *   Columns D, E, F = projYears[0..2]
 *
 *   Rows written (from computeFullProjectionPipeline.proyLrRows):
 *     8, 9, 10, 11, 12, 15, 16, 17, 19, 20, 22, 25, 26,
 *     29, 31, 33, 34, 36, 37, 39, 40
 *
 * Upstream mandatory: home, balanceSheet, incomeStatement, fixedAsset,
 * keyDrivers. If any is null, builder returns early — orchestrator will
 * have already invoked clearSheetCompletely via the null-upstream path.
 */
export const ProyLrBuilder: SheetBuilder = {
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

    const { proyLrRows, lastHistYear, projYears } = pipeline

    // Column C = lastHistYear; D, E, F = projYears[0..2]
    const cols: Array<[string, number]> = [
      ['C', lastHistYear],
      ['D', projYears[0] ?? 0],
      ['E', projYears[1] ?? 0],
      ['F', projYears[2] ?? 0],
    ]

    const managedRows = [
      8, 9, 10, 11, 12, 15, 16, 17, 19, 20, 22, 25, 26,
      29, 31, 33, 34, 36, 37, 39, 40,
    ]

    for (const [col, year] of cols) {
      if (!year) continue
      for (const row of managedRows) {
        const val = proyLrRows[row]?.[year]
        if (val !== undefined) {
          ws.getCell(`${col}${row}`).value = val
        }
      }
    }
  },
}

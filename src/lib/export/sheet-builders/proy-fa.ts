import type { SheetBuilder } from './types'
import { computeFullProjectionPipeline } from '@/lib/calculations/projection-pipeline'

const SHEET_NAME = 'PROY FIXED ASSETS'

/**
 * ProyFaBuilder — state-driven PROY FIXED ASSETS sheet owner.
 *
 * Layout (matching proy-fixed-assets.json fixture):
 *   Column C = lastHistYear
 *   Columns D, E, F = projYears[0..2]
 *
 * 3 sections × 6 categories + per-section totals:
 *   Acquisition  beginning rows 8-13, total 14, additions 17-22, total 23, ending 26-31, total 32
 *   Depreciation beginning rows 36-41, total 42, additions 45-50, total 51, ending 54-59, total 60
 *   Net Value               rows 63-68, total 69
 */
const MANAGED_ROWS: readonly number[] = [
  // Acquisition section
  8, 9, 10, 11, 12, 13, 14,
  17, 18, 19, 20, 21, 22, 23,
  26, 27, 28, 29, 30, 31, 32,
  // Depreciation section
  36, 37, 38, 39, 40, 41, 42,
  45, 46, 47, 48, 49, 50, 51,
  54, 55, 56, 57, 58, 59, 60,
  // Net Value
  63, 64, 65, 66, 67, 68, 69,
]

export const ProyFaBuilder: SheetBuilder = {
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

    const { proyFaRows, lastHistYear, projYears } = pipeline

    const cols: Array<[string, number]> = [
      ['C', lastHistYear],
      ['D', projYears[0] ?? 0],
      ['E', projYears[1] ?? 0],
      ['F', projYears[2] ?? 0],
    ]

    for (const [col, year] of cols) {
      if (!year) continue
      for (const row of MANAGED_ROWS) {
        const val = proyFaRows[row]?.[year]
        if (val !== undefined) {
          ws.getCell(`${col}${row}`).value = val
        }
      }
    }
  },
}

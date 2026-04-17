import type { SheetBuilder } from './types'
import {
  writeScalarsForSheet,
  writeArraysForSheet,
} from '@/lib/export/export-xlsx'

const SHEET_NAME = 'KEY DRIVERS'

/**
 * KeyDriversBuilder — state-driven KEY DRIVERS sheet owner.
 *
 * build() writes:
 *   1. All scalars with excelSheet === 'KEY DRIVERS'
 *      (9 entries covering financial + operational drivers)
 *   2. All array mappings with excelSheet === 'KEY DRIVERS'
 *      (12 entries: sales increments, projected ratios E-J, working
 *       capital days D-J, additional capex D-J)
 *
 * The synthetic `_cogsRatioProjected` / `_sellingExpenseRatioProjected`
 * / `_gaExpenseRatioProjected` array fields are handled by
 * writeArraysForSheet → writeArrayMapping, which expands the underlying
 * scalar ratio into a fixed-length array for columns E-J (matches the
 * legacy injectArrayCells contract).
 *
 * Upstream: `['keyDrivers']`. Orchestrator clears the sheet when
 * state.keyDrivers is null.
 */
export const KeyDriversBuilder: SheetBuilder = {
  sheetName: SHEET_NAME,
  upstream: ['keyDrivers'],
  build(workbook, state) {
    writeScalarsForSheet(workbook, state, SHEET_NAME)
    writeArraysForSheet(workbook, state, SHEET_NAME)
  },
}

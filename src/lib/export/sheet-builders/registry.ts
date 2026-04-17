import type ExcelJS from 'exceljs'
import type { SheetBuilder } from './types'
import type { ExportableState } from '@/lib/export/export-xlsx'
import { clearSheetCompletely } from '@/lib/export/sheet-utils'
import { isPopulated } from './populated'

/**
 * Ordered list of SheetBuilders. Populated incrementally across Session 030
 * tasks T3-T7 (29 builders total). Empty until the first builder migrates.
 *
 * Order matters only for logging/debugging; builders are independent and
 * can run in any sequence because each writes to a dedicated sheet.
 */
export const SHEET_BUILDERS: readonly SheetBuilder[] = []

/**
 * Orchestrator — for every registered builder, resolve upstream dependencies
 * against the current state and either populate the sheet (build) or clear
 * it to a blank shell (clearSheetCompletely). Sheets not present in the
 * registry are untouched (legacy pipeline owns them during migration).
 */
export function runSheetBuilders(
  workbook: ExcelJS.Workbook,
  state: ExportableState,
): void {
  for (const builder of SHEET_BUILDERS) {
    const sheet = workbook.getWorksheet(builder.sheetName)
    if (!sheet) continue

    if (isPopulated(builder.upstream, state)) {
      builder.build(workbook, state)
    } else {
      clearSheetCompletely(sheet)
    }
  }
}

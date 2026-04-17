import type { SheetBuilder } from './types'
import { writeScalarsForSheet } from '@/lib/export/export-xlsx'

const SHEET_NAME = 'BORROWING CAP'

/**
 * BorrowingCapBuilder — state-driven BORROWING CAP sheet owner.
 *
 * The simplest builder in Session 032: only 2 scalar cells —
 * D5 (piutangCalk) + D6 (persediaanCalk). Values come from Catatan
 * Atas Laporan Keuangan, not derivable from other sheets.
 *
 * Upstream: `['borrowingCapInput']`. Orchestrator clears the sheet
 * when state.borrowingCapInput is null.
 */
export const BorrowingCapBuilder: SheetBuilder = {
  sheetName: SHEET_NAME,
  upstream: ['borrowingCapInput'],
  build(workbook, state) {
    writeScalarsForSheet(workbook, state, SHEET_NAME)
  },
}

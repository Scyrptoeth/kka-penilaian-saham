import type { SheetBuilder } from './types'
import { injectAamAdjustments } from '@/lib/export/export-xlsx'
import { writeAamLabels } from './label-writer'

const SHEET_NAME = 'AAM'

/**
 * AamBuilder — state-driven AAM sheet owner.
 *
 * build() composes:
 *   1. writeAamLabels         — language-aware col B labels mapped via
 *                               BS_ROW_TO_AAM_D_ROW (user-visible rename fix)
 *   2. injectAamAdjustments   — per-row adjustments to col D
 *
 * Values in col C (historical) and col E (computed = C+D) remain driven
 * by Excel cross-sheet formulas that reference BALANCE SHEET. This
 * preserves full reactivity: user edits BS → AAM C column recomputes →
 * AAM E column recomputes.
 *
 * Upstream: `balanceSheet` + `home`. Adjustments are optional — when the
 * user hasn't opened the AAM editor yet (empty aamAdjustments Record),
 * the builder still populates labels and delegates to the template's
 * own Excel formulas. If BS or home is null the orchestrator fires
 * clearSheetCompletely instead.
 *
 * Extended accounts (excelRow ≥ 100) are skipped by `writeAamLabels`
 * because the AAM template has no row for them in Session 031.
 * Extending AAM to host arbitrary BS accounts is deferred to Session 032+.
 */
export const AamBuilder: SheetBuilder = {
  sheetName: SHEET_NAME,
  upstream: ['balanceSheet', 'home'],
  build(workbook, state) {
    const ws = workbook.getWorksheet(SHEET_NAME)
    if (!ws) return
    const bs = state.balanceSheet
    if (!bs) return

    writeAamLabels(ws, bs.accounts, bs.language)
    injectAamAdjustments(workbook, state)
  },
}

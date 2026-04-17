import type { SheetBuilder } from './types'
import {
  writeScalarsForSheet,
  injectDlomAnswers,
  injectDlomJenisPerusahaan,
} from '@/lib/export/export-xlsx'

const SHEET_NAME = 'DLOM'

/**
 * DlomBuilder — state-driven DLOM sheet owner.
 *
 * Upstream = `['home']` (not `['dlom']`):
 *   - DLOM!C30 "DLOM Perusahaan tertutup/terbuka" is sourced from
 *     `home.jenisPerusahaan`. If the user has filled HOME but not
 *     opened the DLOM questionnaire, the sheet should still show the
 *     correct jenisPerusahaan — so the builder fires whenever HOME
 *     exists.
 *   - The 10 answer rows (F7,F9,...,F25) and C31 kepemilikan come from
 *     `state.dlom` and are written conditionally inside `build()`.
 *
 * build() composes:
 *   1. injectDlomJenisPerusahaan — C30 from home.jenisPerusahaan
 *   2. writeScalarsForSheet — C31 kepemilikan from state.dlom (writes
 *      only when state.dlom is non-null because resolveSlice returns
 *      undefined for null slice)
 *   3. injectDlomAnswers — F7..F25 from state.dlom.answers (no-op when
 *      state.dlom is null)
 */
export const DlomBuilder: SheetBuilder = {
  sheetName: SHEET_NAME,
  upstream: ['home'],
  build(workbook, state) {
    injectDlomJenisPerusahaan(workbook, state)
    writeScalarsForSheet(workbook, state, SHEET_NAME)
    injectDlomAnswers(workbook, state)
  },
}

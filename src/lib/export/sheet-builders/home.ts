import type { SheetBuilder } from './types'
import { writeScalarsForSheet } from '@/lib/export/export-xlsx'

const SHEET_NAME = 'HOME'

/**
 * HomeBuilder — state-driven HOME sheet owner.
 *
 * build() writes every scalar whose `excelSheet === 'HOME'` from
 * `ALL_SCALAR_MAPPINGS`. This covers:
 *   - B4: namaPerusahaan
 *   - B5: jenisPerusahaan
 *   - B6: jumlahSahamBeredar
 *   - B7: jumlahSahamYangDinilai
 *   - B9: tahunTransaksi
 *   - B12: objekPenilaian
 *
 * Formula cells (B15/B16 = DLOM/DLOC summary percents) are not in the
 * scalar mapping and are left untouched by `writeScalarsForSheet`. They
 * resolve against the DLOM/DLOC sheets via the template's own Excel
 * cross-refs.
 *
 * Upstream: `['home']`. When `state.home === null` the orchestrator
 * fires `clearSheetCompletely(sheet)` instead of `build()` — the user
 * sees a blank HOME sheet with no prototipe leakage.
 */
export const HomeBuilder: SheetBuilder = {
  sheetName: SHEET_NAME,
  upstream: ['home'],
  build(workbook, state) {
    writeScalarsForSheet(workbook, state, SHEET_NAME)
  },
}

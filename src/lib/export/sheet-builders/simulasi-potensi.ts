import type { SheetBuilder } from './types'

const SHEET_NAME = 'SIMULASI POTENSI (AAM)'

/** E11: user-input reported transfer value of the stake being valued. */
const NILAI_PENGALIHAN_CELL = 'E11'

/**
 * SimulasiPotensiBuilder — state-driven SIMULASI POTENSI (AAM) sheet owner.
 *
 * build() composes:
 *   1. Write `nilaiPengalihanDilaporkan` to E11 (only user-input cell
 *      on this sheet — everything else is template formula-driven).
 *
 * All downstream cells (DLOM amount, DLOC amount, Market Value, Potensi
 * Pengalihan, PPh Pasal 17 / PPh Badan tax buckets) are computed by
 * Excel formulas that reference the AAM sheet (for equity value),
 * HOME sheet (for proporsiSaham, dlomPercent, dlocPercent,
 * jenisSubjekPajak), and E11 on this sheet. Full Excel reactivity is
 * preserved — user edits AAM → SIMULASI auto-updates.
 *
 * Labels in col B are template-stable (e.g. "Nilai Ekuitas", "DLOM",
 * "Potensi Pengalihan") and do not vary per user. No override needed.
 *
 * Upstream: `balanceSheet` + `home`. BalanceSheet gates the whole AAM
 * chain that this sheet depends on; home provides required scalars.
 * When either is null the orchestrator clears the sheet.
 */
export const SimulasiPotensiBuilder: SheetBuilder = {
  sheetName: SHEET_NAME,
  upstream: ['balanceSheet', 'home'],
  build(workbook, state) {
    const ws = workbook.getWorksheet(SHEET_NAME)
    if (!ws) return

    ws.getCell(NILAI_PENGALIHAN_CELL).value = state.nilaiPengalihanDilaporkan
  },
}

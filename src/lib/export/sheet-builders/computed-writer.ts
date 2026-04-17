import type ExcelJS from 'exceljs'
import type { SheetManifest } from '@/data/manifests/types'
import type { YearKeyedSeries } from '@/types/financial'

/**
 * Shared write helper for state-driven computed analysis builders
 * (Session 033 T6). Iterates manifest rows × year columns and writes
 * each `allRows[excelRow][year]` to cell `<col><excelRow>`.
 *
 * - Rows without `excelRow` (headers, separators, add-buttons) are skipped.
 * - Missing row data or missing year entries leave target cells untouched
 *   (callers may seed formulas/values that should survive a no-data pass).
 * - `histYears` caller-controlled — lets the builder honour the user's
 *   own year window (from `state.home.tahunTransaksi` via
 *   `computeHistoricalYears`) rather than the manifest's prototype years.
 */
export function writeComputedRowsToSheet(
  ws: ExcelJS.Worksheet,
  manifest: SheetManifest,
  allRows: Record<number, YearKeyedSeries>,
  histYears: readonly number[],
): void {
  for (const row of manifest.rows) {
    if (row.excelRow === undefined) continue
    const series = allRows[row.excelRow]
    if (!series) continue
    for (const year of histYears) {
      const col = manifest.columns[year]
      if (!col) continue
      const value = series[year]
      if (value === null || value === undefined) continue
      ws.getCell(`${col}${row.excelRow}`).value = value
    }
  }
}

/**
 * Live data adapter — synthesize a {@link CellMap} from user-entered
 * financial data so the existing {@link buildRowsFromManifest} pipeline
 * can consume it without modification.
 *
 * Design (LESSON-030 — backward-compatible additions > breaking refactor):
 * instead of teaching `build.ts` a second data source, we generate cells
 * at the exact address pattern that `readValues` already expects:
 *
 *     address = `${manifest.columns[year]}${excelRow}`
 *
 * Live mode never reuses the seed manifest's `columns` map (those letters
 * belong to the prototype workbook layout); we assign synthetic letters
 * starting from C that stay stable for the life of the session. The
 * caller then hands `buildRowsFromManifest` a manifest override with
 * `columns: liveColumns` and `years: liveYears` — zero changes to
 * build.ts, applyDerivations, or any downstream primitive.
 *
 * Formula tooltips are intentionally absent in live mode: user-entered
 * cells have no Excel formula string, so `formulaOf()` returns undefined
 * and the tooltip layer degrades gracefully.
 */

import type { CellMap, FixtureCell } from '@/data/seed/loader'
import type { YearKeyedSeries } from '@/types/financial'

/**
 * Generate a synthetic Excel column mapping for live-mode years.
 * Starts from column C to mirror the typical workbook layout where
 * A = label column and B = optional gutter. Produces one letter per year.
 *
 *   generateLiveColumns([2020, 2021, 2022, 2023]) → { 2020:'C', 2021:'D', 2022:'E', 2023:'F' }
 */
export function generateLiveColumns(years: number[]): Record<number, string> {
  const startCol = 'C'.charCodeAt(0)
  const out: Record<number, string> = {}
  for (let i = 0; i < years.length; i++) {
    out[years[i]] = String.fromCharCode(startCol + i)
  }
  return out
}

/**
 * Build a {@link CellMap} from live user-input data.
 *
 * @param liveColumns — year → synthetic Excel column letter (from {@link generateLiveColumns})
 * @param liveData — excelRow → { year → value }, typically `store.balanceSheet.rows` etc.
 * @param years — ordered historical years (ascending)
 *
 * Missing (excelRow, year) combinations default to 0 so the resulting
 * CellMap is dense — matches the behaviour of `readRowSeries` in build.ts
 * which falls back to 0 for absent values.
 */
export function buildLiveCellMap(
  liveColumns: Record<number, string>,
  liveData: Record<number, YearKeyedSeries>,
  years: number[],
): CellMap {
  const map = new Map<string, FixtureCell>()

  for (const excelRowStr of Object.keys(liveData)) {
    const excelRow = Number(excelRowStr)
    const series = liveData[excelRow] ?? {}
    for (const year of years) {
      const col = liveColumns[year]
      if (!col) continue
      const value = series[year] ?? 0
      const addr = `${col}${excelRow}`
      map.set(addr, {
        addr,
        row: excelRow,
        col: col.charCodeAt(0) - 64, // A=1, B=2, C=3, …
        value,
        data_type: 'n',
      })
    }
  }

  return map as CellMap
}

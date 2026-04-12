/**
 * Compute Growth Revenue live-mode rows from Income Statement user input.
 *
 * Growth Revenue's sheet-local layout reads Revenue (IS row 6) and Net
 * Profit After Tax (IS row 35) across four historical years and lets
 * the existing `yoyGrowth` derivation primitive produce the growth
 * columns. This adapter simply projects IS values onto the GR manifest's
 * own excelRow numbers so the downstream pipeline can consume them
 * unchanged.
 *
 * GR layout:
 *   row 8  Penjualan (Revenue)      ← IS row 6  (leaf)
 *   row 9  Laba Bersih (NPAT)        ← IS row 35 (computed via IS manifest)
 *   rows 40, 41 industry benchmarks  ← not provided (stay blank)
 *
 * Row 35 is a computed subtotal in the IS manifest, so we run
 * `deriveComputedRows` once over the IS manifest before projecting,
 * the same trick Task 4 uses for NOPLAT's PBT dependency.
 */

import type { YearKeyedSeries } from '@/types/financial'
import { INCOME_STATEMENT_MANIFEST } from '@/data/manifests/income-statement'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'

export function computeGrowthRevenueLiveRows(
  isLeafRows: Record<number, YearKeyedSeries>,
  years: readonly number[],
): Record<number, YearKeyedSeries> {
  const isComputed = deriveComputedRows(
    INCOME_STATEMENT_MANIFEST.rows,
    isLeafRows,
    years,
  )

  const readIs = (row: number, year: number): number =>
    isLeafRows[row]?.[year] ?? isComputed[row]?.[year] ?? 0

  const out: Record<number, YearKeyedSeries> = {}
  const write = (row: number, compute: (year: number) => number) => {
    const series: YearKeyedSeries = {}
    for (const year of years) series[year] = compute(year)
    out[row] = series
  }

  write(8, (y) => readIs(6, y)) // Penjualan / Revenue
  write(9, (y) => readIs(35, y)) // Laba Bersih / Net Profit After Tax

  return out
}

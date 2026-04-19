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
 *   row 8  Penjualan (Revenue)      ← IS row 6  (derived, read-only)
 *   row 9  Laba Bersih (NPAT)        ← IS row 35 (derived, read-only)
 *   row 40 Penjualan (Industri)      ← `growthRevenue.industryRevenue` (user input)
 *   row 41 Pendapatan Bersih (Industri) ← `growthRevenue.industryNetProfit` (user input)
 *
 * Session 054: rows 40 + 41 flow from the new `growthRevenue` store slice.
 * When the store slice is null / undefined (user hasn't visited the editor),
 * rows 40 + 41 are OMITTED from the output so the SheetPage renders them
 * as blank with yoyGrowth → "—" via IFERROR.
 */

import type { YearKeyedSeries } from '@/types/financial'

export interface GrowthRevenueInput {
  industryRevenue: YearKeyedSeries
  industryNetProfit: YearKeyedSeries
}

export function computeGrowthRevenueLiveRows(
  isRows: Record<number, YearKeyedSeries>,
  years: readonly number[],
  growthRevenue?: GrowthRevenueInput | null,
): Record<number, YearKeyedSeries> {
  // IS store now contains pre-computed sentinel values — read directly.
  const readIs = (row: number, year: number): number =>
    isRows[row]?.[year] ?? 0

  const out: Record<number, YearKeyedSeries> = {}
  const write = (row: number, compute: (year: number) => number) => {
    const series: YearKeyedSeries = {}
    for (const year of years) series[year] = compute(year)
    out[row] = series
  }

  write(8, (y) => readIs(6, y)) // Penjualan / Revenue (from IS)
  write(9, (y) => readIs(35, y)) // Laba Bersih / NPAT (from IS)

  if (growthRevenue) {
    write(40, (y) => growthRevenue.industryRevenue[y] ?? 0)
    write(41, (y) => growthRevenue.industryNetProfit[y] ?? 0)
  }

  return out
}

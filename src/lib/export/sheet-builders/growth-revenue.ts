import type { SheetBuilder } from './types'
import { computeGrowthRevenueLiveRows } from '@/data/live/compute-growth-revenue-live'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { GROWTH_REVENUE_MANIFEST } from '@/data/manifests/growth-revenue'
import { writeComputedRowsToSheet } from './computed-writer'

const SHEET_NAME = 'GROWTH REVENUE'

/**
 * GrowthRevenueBuilder — state-driven GROWTH REVENUE sheet owner.
 *
 * build() projects IS row 6 (Revenue) and row 35 (NPAT) across the 4
 * historical years onto GR rows 8 and 9. Session 054: rows 40 + 41
 * (industry benchmarks) now come from the user-editable `growthRevenue`
 * slice — only written when the slice is populated. Template H/I/J
 * formulas compute YoY growth on recalc when Excel opens the file.
 *
 * Upstream: ['home', 'incomeStatement']. `growthRevenue` is OPTIONAL
 * (not upstream) because the sheet remains meaningful without it —
 * derived rows 8/9 render regardless.
 */
export const GrowthRevenueBuilder: SheetBuilder = {
  sheetName: SHEET_NAME,
  upstream: ['home', 'incomeStatement'],
  build(workbook, state) {
    const ws = workbook.getWorksheet(SHEET_NAME)
    if (!ws || !state.home || !state.incomeStatement) return

    const years = computeHistoricalYears(
      state.home.tahunTransaksi,
      GROWTH_REVENUE_MANIFEST.historicalYearCount ?? 4,
    )
    const rows = computeGrowthRevenueLiveRows(
      state.incomeStatement.rows,
      years,
      state.growthRevenue,
    )

    writeComputedRowsToSheet(ws, GROWTH_REVENUE_MANIFEST, rows, years)
  },
}

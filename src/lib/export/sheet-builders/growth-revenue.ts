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
 * historical years onto GR rows 8 and 9. Template H/I/J formulas
 * compute YoY growth on recalc when Excel opens the file.
 *
 * Rows 40/41 (industry benchmarks) are left untouched — the workbook
 * ships them blank and user-editable, so we don't overwrite them
 * (builder-writes only populate rows returned by the compute-live).
 *
 * Upstream: ['home', 'incomeStatement']. 4-year span per manifest.
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
    const rows = computeGrowthRevenueLiveRows(state.incomeStatement.rows, years)

    writeComputedRowsToSheet(ws, GROWTH_REVENUE_MANIFEST, rows, years)
  },
}

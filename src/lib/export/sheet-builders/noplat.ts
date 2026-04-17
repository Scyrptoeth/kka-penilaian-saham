import type { SheetBuilder } from './types'
import { computeNoplatLiveRows } from '@/data/live/compute-noplat-live'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { NOPLAT_MANIFEST } from '@/data/manifests/noplat'
import { writeComputedRowsToSheet } from './computed-writer'

const SHEET_NAME = 'NOPLAT'

/**
 * NoplatBuilder — state-driven NOPLAT sheet owner.
 *
 * build() composes:
 *   1. computeHistoricalYears(home.tahunTransaksi, 3) — user-owned
 *      3-year window
 *   2. computeNoplatLiveRows(is.rows, histYears3) — leaf rows 7/8/9/10/13-16
 *   3. deriveComputedRows(NOPLAT_MANIFEST.rows, leaves, histYears3) —
 *      subtotals 11 (EBIT), 17 (Total Taxes), 19 (NOPLAT) via signed
 *      computedFrom
 *   4. writeComputedRowsToSheet — writes all 11 row values at C/D/E
 *
 * Upstream: ['home', 'incomeStatement']. home needed for tahunTransaksi
 * year window derivation. When either is null, orchestrator fires
 * clearSheetCompletely().
 *
 * Why not share year-count config across builders: each computed
 * analysis sheet has its own historical span in its manifest
 * (`historicalYearCount`). Using the value from NOPLAT_MANIFEST keeps
 * per-sheet configuration co-located.
 */
export const NoplatBuilder: SheetBuilder = {
  sheetName: SHEET_NAME,
  upstream: ['home', 'incomeStatement'],
  build(workbook, state) {
    const ws = workbook.getWorksheet(SHEET_NAME)
    if (!ws || !state.home || !state.incomeStatement) return

    const histYears = computeHistoricalYears(
      state.home.tahunTransaksi,
      NOPLAT_MANIFEST.historicalYearCount ?? 3,
    )
    const leaves = computeNoplatLiveRows(state.incomeStatement.rows, histYears)
    const comp = deriveComputedRows(NOPLAT_MANIFEST.rows, leaves, histYears)
    const allRows = { ...leaves, ...comp }

    writeComputedRowsToSheet(ws, NOPLAT_MANIFEST, allRows, histYears)
  },
}

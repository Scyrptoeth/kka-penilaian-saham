/**
 * Compute NOPLAT live-mode leaf rows from Income Statement user input.
 *
 * Approach B from the Session 011 plan: we bypass the existing
 * `toNoplatInput` + `computeNoplat` adapter/calc pair because that
 * pipeline expects workbook-signed values (expenses negative), while
 * the IS store slice holds natural positive user input. Translating
 * positive → workbook-signed just to re-translate back via the adapter
 * is fragile and wastes test surface. Instead this adapter produces the
 * NOPLAT sheet's own leaf rows (7, 8, 9, 10, 13, 14, 15, 16) in the
 * user-positive convention, and lets the NOPLAT manifest's
 * `computedFrom` declarations (rows 11 EBIT, 17 Total Taxes, 19 NOPLAT)
 * handle the rest via `deriveComputedRows` downstream.
 *
 * Formula mapping — user-positive world:
 *
 *   row 7  PBT               ← IS row 32 (computed PBT)
 *   row 8  Add: IE           ← +IS row 27  (positive add-back to EBIT)
 *   row 9  Less: II          ← −IS row 26  (subtract positive II)
 *   row 10 Non-Op            ← −IS row 30  (subtract user-signed non-op)
 *   row 13 Tax Provision     ← +IS row 33  (positive tax)
 *   row 14 Tax Shield on IE  ← 0           (prototype sets tax rate 0)
 *   row 15 Less: Tax on II   ← 0           (prototype sets tax rate 0)
 *   row 16 Tax on Non-Op     ← 0           (prototype sets tax rate 0)
 *
 * Rows 14–16 are pinned to zero to preserve fixture-match behavior of
 * the prototype workbook (B33 tax rate cell is effectively 0 for this
 * block across all years). A future session that introduces user-owned
 * tax rate state can upgrade these formulas without touching this file.
 */

import type { YearKeyedSeries } from '@/types/financial'
import { INCOME_STATEMENT_MANIFEST } from '@/data/manifests/income-statement'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'

export function computeNoplatLiveRows(
  isLeafRows: Record<number, YearKeyedSeries>,
  years: readonly number[],
): Record<number, YearKeyedSeries> {
  // Compute IS subtotals once so we can read PBT (row 32) without the
  // caller having to duplicate the logic.
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

  write(7, (y) => readIs(32, y)) // Profit Before Tax
  write(8, (y) => readIs(27, y)) // Add: Interest Expense (user-positive)
  write(9, (y) => -readIs(26, y)) // Less: Interest Income
  write(10, (y) => -readIs(30, y)) // Non-Op Income (subtract to isolate operating)
  write(13, (y) => readIs(33, y)) // Tax Provision (user-positive)
  write(14, () => 0)
  write(15, () => 0)
  write(16, () => 0)

  return out
}

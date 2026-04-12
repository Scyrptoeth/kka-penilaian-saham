/**
 * Compute subtotal/total rows declared via `ManifestRow.computedFrom`.
 *
 * Used by live-mode input forms to show read-only aggregations alongside
 * the user's editable leaf rows. Seed mode never calls this — Excel's own
 * computed cells are already baked into the fixture.
 *
 * Algorithm: single forward pass. For each row whose `computedFrom` is
 * set, sum the series of every referenced row (applying the ref's sign),
 * reading from the user's leaf values first and then from prior computed
 * results. This lets subtotal-of-subtotals chains work (e.g. TOTAL ASSETS
 * references Total Current Assets + Total Non-Current Assets) as long as
 * the manifest keeps the natural top-down ordering Excel uses.
 *
 * Signed ref convention (Session 011): a negative excelRow in
 * `computedFrom` means "subtract this row". So BS stays all-positive
 * while IS can express `[6, -7]` for Gross Profit = Revenue − COGS.
 * Users enter every leaf with its natural positive sign; the manifest
 * owns the formula shape via signs on refs.
 *
 * Accounting sign conventions for stored negatives (like Accumulated
 * Depreciation) still fall out naturally via plain positive summation —
 * no interaction with the new signed-ref logic.
 */

import type { ManifestRow } from '@/data/manifests/types'
import type { YearKeyedSeries } from '@/types/financial'

export function deriveComputedRows(
  rows: readonly ManifestRow[],
  values: Readonly<Record<number, YearKeyedSeries>>,
  years: readonly number[],
): Record<number, YearKeyedSeries> {
  const out: Record<number, YearKeyedSeries> = {}

  for (const row of rows) {
    if (row.excelRow === undefined) continue
    if (!row.computedFrom || row.computedFrom.length === 0) continue

    const sum: YearKeyedSeries = {}
    for (const year of years) sum[year] = 0

    for (const ref of row.computedFrom) {
      const absRef = Math.abs(ref)
      const sign = ref < 0 ? -1 : 1
      const series = values[absRef] ?? out[absRef]
      if (!series) continue
      for (const year of years) {
        sum[year] = (sum[year] ?? 0) + sign * (series[year] ?? 0)
      }
    }

    out[row.excelRow] = sum
  }

  return out
}

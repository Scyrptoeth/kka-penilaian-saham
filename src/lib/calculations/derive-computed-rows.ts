/**
 * Compute subtotal/total rows declared via `ManifestRow.computedFrom`.
 *
 * Used by live-mode input forms to show read-only aggregations alongside
 * the user's editable leaf rows. Seed mode never calls this — Excel's own
 * computed cells are already baked into the fixture.
 *
 * Algorithm: single forward pass. For each row whose `computedFrom` is
 * set, sum the series of every referenced row, reading from the user's
 * leaf values first and then from prior computed results. This lets
 * subtotal-of-subtotals chains work (e.g. TOTAL ASSETS references Total
 * Current Assets + Total Non-Current Assets) as long as the manifest
 * keeps the natural top-down ordering Excel uses.
 *
 * Accounting sign conventions (negative stored values, like Accumulated
 * Depreciation) fall out naturally: the sum is plain `a + b`, so a
 * pre-signed negative leaf subtracts automatically.
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
      const series = values[ref] ?? out[ref]
      if (!series) continue
      for (const year of years) {
        sum[year] = (sum[year] ?? 0) + (series[year] ?? 0)
      }
    }

    out[row.excelRow] = sum
  }

  return out
}

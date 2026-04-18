/**
 * Derivation helpers — shared logic for Common Size + Growth YoY columns
 * across dynamic editors (Input BS, IS, FA).
 *
 * Extracted from DynamicBsEditor (Session 036 Task 2) so that the same
 * column-derivation pattern can be reused with different denominators
 * without copy-paste (LESSON-046 spirit for editor-side helpers).
 */

import type { ManifestRow } from '@/data/manifests/types'
import type { YearKeyedSeries } from '@/types/financial'
import { ratioOfBase, yoyChangeSafe } from './helpers'

/**
 * Compute Common Size ratios for each manifest row against a denominator row.
 *
 * @param rows Manifest rows (headers/separators without excelRow are skipped)
 * @param values All values (leaves + computed) keyed by excelRow
 * @param years Historical years (ascending)
 * @param denominatorRow excelRow of the row used as denominator (e.g. Total
 *   Assets for BS, Total Net Value FA for FA)
 * @returns Record keyed by excelRow → YearKeyedSeries of ratios (0..1).
 *   Returns empty object when the denominator row is missing entirely.
 *   Returns 0 for a given year when the denominator value is zero that year.
 */
export function computeCommonSize(
  rows: readonly ManifestRow[],
  values: Readonly<Record<number, YearKeyedSeries>>,
  years: readonly number[],
  denominatorRow: number,
): Record<number, YearKeyedSeries> {
  const denom = values[denominatorRow]
  if (!denom) return {}
  const out: Record<number, YearKeyedSeries> = {}
  for (const row of rows) {
    if (row.excelRow === undefined) continue
    const line = values[row.excelRow]
    if (!line) continue
    const series: YearKeyedSeries = {}
    for (const y of years) {
      series[y] = ratioOfBase(line[y] ?? 0, denom[y] ?? 0)
    }
    out[row.excelRow] = series
  }
  return out
}

/**
 * Compute year-over-year growth for each manifest row starting from
 * the second historical year.
 *
 * @param rows Manifest rows (headers/separators without excelRow are skipped)
 * @param values All values (leaves + computed) keyed by excelRow
 * @param years Historical years (ascending) — growth years = years.slice(1)
 * @returns Record keyed by excelRow → YearKeyedSeries of growth ratios.
 *   Returns empty object when years.length < 2 (no prior year reference).
 *   Uses yoyChangeSafe semantics: 0 when prev is 0 (IFERROR behavior).
 */
export function computeGrowthYoY(
  rows: readonly ManifestRow[],
  values: Readonly<Record<number, YearKeyedSeries>>,
  years: readonly number[],
): Record<number, YearKeyedSeries> {
  if (years.length < 2) return {}
  const out: Record<number, YearKeyedSeries> = {}
  for (const row of rows) {
    if (row.excelRow === undefined) continue
    const line = values[row.excelRow]
    if (!line) continue
    const series: YearKeyedSeries = {}
    for (let i = 1; i < years.length; i++) {
      series[years[i]] = yoyChangeSafe(line[years[i]] ?? 0, line[years[i - 1]] ?? 0)
    }
    out[row.excelRow] = series
  }
  return out
}

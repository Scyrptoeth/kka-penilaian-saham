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

/**
 * Compute the arithmetic mean of a numeric series with leading-zero /
 * leading-null skip semantics.
 *
 * Rules (Session 037 — per user spec):
 *   1. Trim leading entries that are null/undefined/0. Once the first
 *      non-null non-zero entry is found, all remaining entries count in
 *      both numerator and divisor.
 *   2. Within the trimmed window, null/undefined are treated as 0 (still
 *      counted in the divisor).
 *   3. If no valid entry exists (all null/undefined/0), return null.
 *
 * Examples:
 *   [null, 0.10, 0.05]  → (0.10 + 0.05) / 2 = 0.075
 *   [0.10, null, 0.05]  → (0.10 + 0 + 0.05) / 3 = 0.05
 *   [0.10, 0.05, null]  → (0.10 + 0.05 + 0) / 3 = 0.05
 *   [null, null, null]  → null
 */
export function computeAverage(
  values: readonly (number | null | undefined)[],
): number | null {
  let firstValid = -1
  for (let i = 0; i < values.length; i++) {
    const v = values[i]
    if (v != null && v !== 0) {
      firstValid = i
      break
    }
  }
  if (firstValid === -1) return null
  const relevant = values.slice(firstValid)
  let sum = 0
  for (const v of relevant) sum += v ?? 0
  return sum / relevant.length
}

/**
 * Convenience wrapper: compute arithmetic mean of a {@link YearKeyedSeries}
 * across the given years using {@link computeAverage} semantics. Missing
 * year entries collapse to null (then pass through the same leading-skip
 * logic).
 *
 *   averageSeries({ 2020: 0.1, 2021: 0.05 }, [2019, 2020, 2021])
 *   // leading null → (0.1 + 0.05) / 2 = 0.075
 */
export function averageSeries(
  series: YearKeyedSeries | undefined,
  years: readonly number[],
): number | null {
  if (!series) return null
  return computeAverage(years.map((y) => series[y] ?? null))
}

/**
 * Strict average of year-over-year growth observations derived from a
 * year-keyed value series across `historicalYears`.
 *
 * Rules (Session 051 — per user spec Q1=A):
 *   1. Iterate consecutive-year pairs in `historicalYears`.
 *   2. A pair is a "real observation" when BOTH values are defined
 *      (`!= null`) AND prev is non-zero AND prev is finite.
 *   3. If fewer than 2 real observations → return null (caller renders
 *      "—" and projects flat × 1.0).
 *   4. Else → arithmetic mean of the real YoY ratios (curr - prev)/prev.
 *
 * This is the canonical growth-average helper used by BOTH the INPUT
 * Balance Sheet "Average Growth YoY" column AND the Proy Balance Sheet
 * projection multiplier. Single source of truth guarantees the displayed
 * number always equals the projection driver (LESSON-139 driver-display
 * sync applied across INPUT ↔ projection pairing).
 *
 * Sparse-historical accounts (e.g. manual-entry rows where user only
 * filled 1-2 trailing years) now correctly produce null instead of
 * extrapolating from a single YoY observation.
 *
 * Examples:
 *   averageYoYStrict({ 2021: 81022 }, [2018, 2019, 2020, 2021])  → null (0 real obs)
 *   averageYoYStrict({ 2020: 48115, 2021: 81022 }, [...])        → null (1 real obs)
 *   averageYoYStrict({ 2019: 100, 2020: 200, 2021: 300 }, [...]) → 0.75 (2 real obs)
 */
export function averageYoYStrict(
  series: YearKeyedSeries | undefined,
  historicalYears: readonly number[],
): number | null {
  if (!series || historicalYears.length < 2) return null
  const realObs: number[] = []
  for (let i = 1; i < historicalYears.length; i++) {
    const prev = series[historicalYears[i - 1]!]
    const curr = series[historicalYears[i]!]
    if (prev == null || curr == null) continue
    if (prev === 0 || !isFinite(prev)) continue
    realObs.push((curr - prev) / prev)
  }
  if (realObs.length < 2) return null
  let sum = 0
  for (const v of realObs) sum += v
  return sum / realObs.length
}

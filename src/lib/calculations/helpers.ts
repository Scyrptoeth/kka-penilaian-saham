/**
 * Pure calculation primitives used across all financial sheets.
 * Each function mirrors an Excel formula pattern from kka-penilaian-saham.xlsx.
 */

import type { YearKeyedSeries } from '@/types/financial'

export type { YearKeyedSeries }

/** Four-year historical series — used by legacy Balance Sheet / Income Statement
 *  modules (Phase 1). Newer modules use {@link YearKeyedSeries} instead. */
export interface YearlySeries {
  y0: number
  y1: number
  y2: number
  y3: number
}

/**
 * Returns the years of a YearKeyedSeries as a sorted ascending array.
 *
 *   yearsOf({ 2021: 10, 2019: 5, 2020: 7 }) // → [2019, 2020, 2021]
 */
export function yearsOf(series: YearKeyedSeries): number[] {
  const keys = Object.keys(series)
  const years: number[] = new Array(keys.length)
  for (let i = 0; i < keys.length; i++) years[i] = Number(keys[i])
  years.sort((a, b) => a - b)
  return years
}

/**
 * Asserts that two series have the same set of year keys.
 * Throws a clear error naming the mismatched years otherwise.
 */
export function assertSameYears(
  label: string,
  primary: YearKeyedSeries,
  other: YearKeyedSeries,
): void {
  const a = yearsOf(primary)
  const b = yearsOf(other)
  if (a.length !== b.length) {
    throw new RangeError(
      `${label}: year count mismatch (primary has ${a.length}, other has ${b.length})`,
    )
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      throw new RangeError(
        `${label}: year set mismatch — primary [${a.join(',')}] vs other [${b.join(',')}]`,
      )
    }
  }
}

/**
 * Produces a new YearKeyedSeries with the same year set as `template`,
 * initialized to zero. Used as an accumulator starting point.
 */
export function emptySeriesLike(template: YearKeyedSeries): YearKeyedSeries {
  const out: YearKeyedSeries = {}
  for (const y of yearsOf(template)) out[y] = 0
  return out
}

/**
 * Maps each value in a YearKeyedSeries, preserving the year keys.
 *
 *   mapSeries({ 2019: 1, 2020: 2 }, (v) => v * 100)
 *   // → { 2019: 100, 2020: 200 }
 */
export function mapSeries(
  series: YearKeyedSeries,
  fn: (value: number, year: number) => number,
): YearKeyedSeries {
  const out: YearKeyedSeries = {}
  for (const y of yearsOf(series)) out[y] = fn(series[y], y)
  return out
}

/**
 * Interop: convert an ordered year list + matching value array into a
 * YearKeyedSeries. Throws if lengths differ.
 */
export function seriesFromArray(
  years: readonly number[],
  values: readonly number[],
): YearKeyedSeries {
  if (years.length !== values.length) {
    throw new RangeError(
      `seriesFromArray: years and values length mismatch (${years.length} vs ${values.length})`,
    )
  }
  const out: YearKeyedSeries = {}
  for (let i = 0; i < years.length; i++) out[years[i]] = values[i]
  return out
}

/**
 * Interop: materialize a series into a plain `number[]`, ordered ascending
 * by year. Useful when passing to libraries expecting dense arrays.
 */
export function seriesToArray(series: YearKeyedSeries): number[] {
  const years = yearsOf(series)
  const out: number[] = new Array(years.length)
  for (let i = 0; i < years.length; i++) out[i] = series[years[i]]
  return out
}

/**
 * Ratio of a value to a base. Mirrors Excel =VALUE/BASE.
 * Returns 0 if base is 0 (matches IFERROR behavior widely used in the workbook).
 */
export function ratioOfBase(value: number, base: number): number {
  if (base === 0) return 0
  return value / base
}

/**
 * Year-over-year change: (current - previous) / previous.
 * Mirrors Excel =(CURRENT-PREVIOUS)/PREVIOUS.
 * Throws on divide-by-zero — use {@link yoyChangeSafe} for IFERROR wrapping.
 */
export function yoyChange(current: number, previous: number): number {
  if (previous === 0) {
    throw new RangeError('yoyChange: previous value must be non-zero')
  }
  return (current - previous) / previous
}

/**
 * Year-over-year change with IFERROR fallback, matching Excel formula pattern:
 *   =IFERROR((CURRENT-PREVIOUS)/PREVIOUS, 0)
 */
export function yoyChangeSafe(current: number, previous: number): number {
  if (previous === 0) return 0
  return (current - previous) / previous
}

/**
 * Arithmetic mean of a series. Mirrors Excel =AVERAGE(range).
 * Throws on empty input (Excel returns #DIV/0!).
 */
export function average(values: readonly number[]): number {
  if (values.length === 0) {
    throw new RangeError('average: values array is empty')
  }
  let sum = 0
  for (const v of values) sum += v
  return sum / values.length
}

/**
 * Sum of a range. Mirrors Excel =SUM(range).
 */
export function sumRange(values: readonly number[]): number {
  let total = 0
  for (const v of values) total += v
  return total
}

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

/**
 * Compute average YoY growth rate from a year-keyed series.
 * Mirrors Excel =AVERAGE(growth_1, growth_2, ..., growth_n) pattern
 * used in column Q / K of historical sheets.
 *
 * Skips periods where the base value is 0 (division undefined).
 * Returns 0 for single-year or empty series.
 */
/**
 * Excel ROUNDUP(value, digits) — always rounds AWAY from zero.
 *
 * digits > 0 → round to N decimal places upward in magnitude
 * digits = 0 → round to nearest integer upward in magnitude
 * digits < 0 → round to 10^|digits| upward in magnitude (e.g. -3 → nearest 1000)
 *
 * Examples matching Excel:
 *   roundUp(62200595681013.445, -3) → 62200595682000
 *   roundUp(9102540956.415, -3)     → 9102541000
 *   roundUp(-1234, -2)              → -1300
 */
export function roundUp(value: number, digits: number): number {
  if (value === 0) return 0
  const factor = Math.pow(10, digits)
  return value > 0
    ? Math.ceil(value * factor) / factor
    : Math.floor(value * factor) / factor
}

export function computeAvgGrowth(series: YearKeyedSeries): number {
  const years = Object.keys(series).map(Number).sort((a, b) => a - b)
  if (years.length < 2) return 0
  const growths: number[] = []
  for (let i = 1; i < years.length; i++) {
    const prev = series[years[i - 1]!]!
    const curr = series[years[i]!]!
    if (prev !== 0 && isFinite(prev)) {
      growths.push((curr - prev) / prev)
    }
  }
  return growths.length > 0 ? growths.reduce((a, b) => a + b, 0) / growths.length : 0
}

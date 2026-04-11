/**
 * Pure calculation primitives used across all financial sheets.
 * Each function mirrors an Excel formula pattern from kka-penilaian-saham.xlsx.
 */

/** Four-year historical series — shared across all historical sheets. */
export interface YearlySeries {
  y0: number
  y1: number
  y2: number
  y3: number
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

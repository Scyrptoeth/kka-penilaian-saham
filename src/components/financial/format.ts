/**
 * Pure formatting helpers for financial cell values. No React deps, no
 * locale side-effects outside of Intl.NumberFormat. Used by <FinancialTable>
 * and its sub-components.
 *
 * Indonesian locale convention — thousand separator is ".", decimal is ",".
 * Negative numbers are rendered in accounting style (parentheses) with
 * colour applied by the component layer.
 */

const IDR_INT = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 0,
})

const PERCENT = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/** True if value is strictly less than zero (not NaN, not -0). */
export function isNegative(value: number): boolean {
  return value < 0
}

/**
 * Format a currency value with thousand separators, wrapping negatives in
 * parentheses for accounting style:
 *
 *   formatIdr(1234567)   // → '1.234.567'
 *   formatIdr(-500)      // → '(500)'
 *   formatIdr(0)         // → '-'
 */
export function formatIdr(value: number): string {
  if (!Number.isFinite(value)) return '—'
  if (value === 0) return '-'
  const abs = Math.abs(Math.round(value))
  const rendered = IDR_INT.format(abs)
  return isNegative(value) ? `(${rendered})` : rendered
}

/**
 * Format a ratio (0..1..) as a percentage with one decimal place. Negatives
 * also get parentheses treatment to match the workbook convention.
 *
 *   formatPercent(0.2345) // → '23,5%'
 *   formatPercent(-0.05)  // → '(5,0%)'
 */
export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '—'
  if (value === 0) return '-'
  const pct = value * 100
  const rendered = `${PERCENT.format(Math.abs(pct))}%`
  return isNegative(value) ? `(${rendered})` : rendered
}

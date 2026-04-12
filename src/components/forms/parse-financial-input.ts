/**
 * Parse a human-typed or pasted financial amount into a plain number.
 *
 * Handles the conventions Indonesian penilai DJP typically use when
 * copying data from Excel, Word tables, or scanned reports:
 *
 *   "1.234.567"          → 1234567          (dot as thousand separator)
 *   "Rp 14.216.370.131"  → 14216370131      (Rp prefix + thousands)
 *   "-3.182.342.447"     → -3182342447      (explicit negative)
 *   "(750.000)"          → -750000          (accounting parentheses)
 *   "1234567,89"         → 1234567.89       (comma as decimal)
 *   ""                   → 0                (empty)
 *   "abc"                → 0                (garbage)
 *
 * Kept in its own module so the RowInputGrid paste handler and any
 * future smart-paste feature can share it.
 */
export function parseFinancialInput(raw: string): number {
  let cleaned = raw.trim()
  if (cleaned === '') return 0

  // Accounting parentheses: "(123)" → negative
  let sign = 1
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    sign = -1
    cleaned = cleaned.slice(1, -1).trim()
  }

  // Strip currency prefix, whitespace, and Indonesian thousand separators
  cleaned = cleaned.replace(/Rp/gi, '').replace(/\s/g, '').replace(/\./g, '')

  // Comma is decimal separator in Indonesian locale
  cleaned = cleaned.replace(/,/g, '.')

  const num = Number(cleaned)
  if (!Number.isFinite(num)) return 0
  return sign * num
}

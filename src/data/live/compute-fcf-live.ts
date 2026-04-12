/**
 * FCF (Free Cash Flow) live compute adapter.
 *
 * Maps pre-computed upstream data (NOPLAT, FA, CFS) into FCF manifest
 * leaf rows. Caller feeds the result into `deriveComputedRows` with
 * the FCF manifest to produce subtotals (rows 9, 18, 20).
 *
 * FCF row sources:
 *   row 7:  NOPLAT value        = NOPLAT row 19
 *   row 8:  Depreciation addback = FA row 51 × −1 (pre-signed)
 *   row 12: Δ Current Assets    = CFS row 8
 *   row 13: Δ Current Liabilities = CFS row 9
 *   row 14: Δ Working Capital   = CFS row 10
 *   row 16: Capital Expenditure = FA row 23 × −1 (pre-signed)
 */

import type { YearKeyedSeries } from '@/types/financial'

/**
 * @param noplatRows Pre-computed NOPLAT rows (need row 19)
 * @param faComputedRows Pre-computed FA rows from deriveComputedRows (need rows 23, 51)
 * @param cfsRows Pre-computed CFS rows — both leaf and computed (need rows 8, 9, 10)
 * @param years FCF year span (typically 3 years)
 */
export function computeFcfLiveRows(
  noplatRows: Record<number, YearKeyedSeries>,
  faComputedRows: Record<number, YearKeyedSeries> | null,
  cfsRows: Record<number, YearKeyedSeries>,
  years: readonly number[],
): Record<number, YearKeyedSeries> {
  const out: Record<number, YearKeyedSeries> = {}
  const set = (row: number, year: number, value: number) => {
    if (!out[row]) out[row] = {}
    out[row][year] = value
  }

  for (const year of years) {
    // Row 7: NOPLAT = NOPLAT row 19
    set(7, year, noplatRows[19]?.[year] ?? 0)

    // Row 8: Depreciation addback = FA row 51 (Total Additions Dep) × -1
    // Workbook: ='FIXED ASSET'!C51*-1
    set(8, year, -(faComputedRows?.[51]?.[year] ?? 0))

    // Row 12: Δ Current Assets = CFS row 8
    set(12, year, cfsRows[8]?.[year] ?? 0)

    // Row 13: Δ Current Liabilities = CFS row 9
    set(13, year, cfsRows[9]?.[year] ?? 0)

    // Row 14: Δ Working Capital = CFS row 10
    set(14, year, cfsRows[10]?.[year] ?? 0)

    // Row 16: Capital Expenditure = FA row 23 (Total Additions Acq) × -1
    // Workbook: ='FIXED ASSET'!C23*-1
    set(16, year, -(faComputedRows?.[23]?.[year] ?? 0))
  }

  return out
}

/**
 * Compute NOPLAT live-mode leaf rows from Income Statement user input.
 *
 * Approach B from the Session 011 plan: we bypass the existing
 * `toNoplatInput` + `computeNoplat` adapter/calc pair because that
 * pipeline expects workbook-signed values (expenses negative), while
 * the IS store slice holds natural positive user input. Translating
 * positive → workbook-signed just to re-translate back via the adapter
 * is fragile and wastes test surface. Instead this adapter produces the
 * NOPLAT sheet's own leaf rows (7, 8, 9, 10, 13, 14, 15, 16) in the
 * user-positive convention, and lets the NOPLAT manifest's
 * `computedFrom` declarations (rows 11 EBIT, 17 Total Taxes, 19 NOPLAT)
 * handle the rest via `deriveComputedRows` downstream.
 *
 * Formula mapping — expenses-negative world (matching Excel convention):
 *
 *   row 7  PBT               ← IS row 32 (computed PBT, positive)
 *   row 8  Add: IE           ← IS row 27 * -1  (IE is negative → negate to add back)
 *   row 9  Less: II          ← IS row 26 * -1  (II is positive → negate to subtract)
 *   row 10 Non-Op            ← IS row 30 * -1  (negate to isolate operating)
 *   row 13 Tax Provision     ← IS row 33 * -1  (Tax is negative → negate to positive)
 *   row 14 Tax Shield on IE  ← effectiveTaxRate * IS row 27 * -1
 *   row 15 Less: Tax on II   ← effectiveTaxRate * IS row 26 * -1
 *   row 16 Tax on Non-Op     ← effectiveTaxRate * IS row 30 * -1
 *
 * The effective tax rate is derived from user's IS data: abs(tax / PBT).
 * This ensures correct NOPLAT for companies with any tax profile.
 */

import type { YearKeyedSeries } from '@/types/financial'

export function computeNoplatLiveRows(
  isRows: Record<number, YearKeyedSeries>,
  years: readonly number[],
): Record<number, YearKeyedSeries> {
  // IS store now contains both leaf data AND pre-computed sentinel values
  // (rows 6,7,8,15,18,22,26,27,28,30,32,33,35) — read directly.
  const readIs = (row: number, year: number): number =>
    isRows[row]?.[year] ?? 0

  const out: Record<number, YearKeyedSeries> = {}
  const write = (row: number, compute: (year: number) => number) => {
    const series: YearKeyedSeries = {}
    for (const year of years) series[year] = compute(year)
    out[row] = series
  }

  // All IS values now follow expenses-negative convention (matching Excel).
  // NOPLAT mirrors Excel formulas: IS!row * -1 for rows 8/9/10/13.
  write(7, (y) => readIs(32, y))    // PBT (positive)
  write(8, (y) => -readIs(27, y))   // Add: IE — IS!D27*-1 (IE negative → positive add-back)
  write(9, (y) => -readIs(26, y))   // Less: II — IS!D26*-1 (II positive → negative subtract)
  write(10, (y) => -readIs(30, y))  // Non-Op — IS!D30*-1
  write(13, (y) => -readIs(33, y))  // Tax Provision — IS!D33*-1 (Tax negative → positive)

  // Tax adjustments: effectiveTaxRate per year = abs(tax / PBT)
  // Mirrors Excel pattern: IS!$B$33 * source * sign
  // For companies with non-zero tax rates, this correctly adjusts EBIT-level taxes.
  // Tax adjustments mirror Excel: rate * IS!row * -1
  write(14, (y) => {
    const pbt = readIs(32, y)
    const rate = pbt !== 0 ? Math.abs(readIs(33, y) / pbt) : 0
    return rate * -readIs(27, y) // Tax Shield on IE — IS!$B$33*IS!D27*-1
  })
  write(15, (y) => {
    const pbt = readIs(32, y)
    const rate = pbt !== 0 ? Math.abs(readIs(33, y) / pbt) : 0
    return rate * -readIs(26, y) // Tax on II — IS!$B$33*IS!D26*-1
  })
  write(16, (y) => {
    const pbt = readIs(32, y)
    const rate = pbt !== 0 ? Math.abs(readIs(33, y) / pbt) : 0
    return rate * -readIs(30, y) // Tax on Non-Op — IS!$B$33*IS!D30*-1
  })

  return out
}

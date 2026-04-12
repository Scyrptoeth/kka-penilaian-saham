/**
 * PROY NOPLAT — Projected NOPLAT computation.
 *
 * Historical column uses Income Statement values + IS tax rate (B33, typically 0).
 * Projected columns use PROY LR values + KEY DRIVERS tax rate (B37 = 0.22).
 *
 * Row mapping (matching proy-noplat.json fixture):
 *
 *   7: PBT              = [IS F32 | PROY LR row 36]
 *   8: Interest Expense  = [IS F27 | PROY LR row 31] * -1
 *   9: Interest Income   = [IS F26 | PROY LR row 29] * -1
 *  10: Non-Op Income     = [IS F30 | PROY LR row 34] * -1
 *  11: EBIT              = SUM(7:10)
 *
 *  13: Tax Provision       = [IS F33 | PROY LR row 37] * -1
 *  14: Tax Shield Int Exp  = taxRate * [IS F27 | PROY LR row 31] * -1
 *  15: Tax on Int Income   = taxRate * [IS F26 | PROY LR row 29] * -1
 *  16: Tax on Non-Op Inc   = taxRate * [IS F30 | PROY LR row 34] * -1
 *  17: Total Taxes on EBIT = SUM(13:16)
 *
 *  19: NOPLAT             = 11 - 17
 *
 * Sign convention: source stores interest expense/income/non-op/tax with
 * their natural signs. NOPLAT adapter negates them (* -1) as per Excel formulas.
 */

import type { YearKeyedSeries } from '@/types/financial'

export interface ProyNoplatInput {
  /** PROY LR computed rows for projected years — needs rows 29, 31, 34, 36, 37. */
  proyLrRows: Record<number, YearKeyedSeries>
  /** Corporate tax rate for projected years (PROY LR B37). Decimal, e.g. 0.22. */
  taxRate: number
  /** Historical IS values for column C. Keys match IS manifest rows. */
  isLastYear: {
    pbt: number             // IS F32 (positive)
    interestExpense: number // IS F27 (negative)
    interestIncome: number  // IS F26 (positive)
    nonOpIncome: number     // IS F30
    tax: number             // IS F33 (negative)
  }
  /** Historical tax rate from IS B33. Typically 0 in this workbook. */
  histTaxRate: number
}

export function computeProyNoplatLive(
  input: ProyNoplatInput,
  histYear: number,
  projYears: readonly number[],
): Record<number, YearKeyedSeries> {
  const out: Record<number, YearKeyedSeries> = {}

  const set = (row: number, year: number, value: number) => {
    if (!out[row]) out[row] = {}
    out[row][year] = value
  }

  const get = (row: number, year: number): number => out[row]?.[year] ?? 0

  const lr = (row: number, year: number): number => input.proyLrRows[row]?.[year] ?? 0

  // ── Historical column (from Income Statement) ──
  const h = input.isLastYear
  const hTax = input.histTaxRate

  set(7, histYear, h.pbt)
  set(8, histYear, h.interestExpense * -1)
  set(9, histYear, h.interestIncome * -1)
  set(10, histYear, h.nonOpIncome * -1)
  set(11, histYear, get(7, histYear) + get(8, histYear) + get(9, histYear) + get(10, histYear))

  set(13, histYear, h.tax * -1)
  set(14, histYear, hTax * h.interestExpense * -1)
  set(15, histYear, hTax * h.interestIncome * -1)
  set(16, histYear, hTax * h.nonOpIncome * -1)
  set(17, histYear, get(13, histYear) + get(14, histYear) + get(15, histYear) + get(16, histYear))
  set(19, histYear, get(11, histYear) - get(17, histYear))

  // ── Projected columns (from PROY LR) ──
  const { taxRate } = input

  for (const year of projYears) {
    set(7, year, lr(36, year))
    set(8, year, lr(31, year) * -1)
    set(9, year, lr(29, year) * -1)
    set(10, year, lr(34, year) * -1)
    set(11, year, get(7, year) + get(8, year) + get(9, year) + get(10, year))

    set(13, year, lr(37, year) * -1)
    set(14, year, taxRate * lr(31, year) * -1)
    set(15, year, taxRate * lr(29, year) * -1)
    set(16, year, taxRate * lr(34, year) * -1)
    set(17, year, get(13, year) + get(14, year) + get(15, year) + get(16, year))
    set(19, year, get(11, year) - get(17, year))
  }

  return out
}

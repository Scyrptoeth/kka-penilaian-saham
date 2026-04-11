/**
 * NOPLAT adapter — translates Income Statement raw data into `NoplatInput`.
 *
 * The Income Statement stores some line items pre-signed in ways that don't
 * always match NOPLAT's arithmetic convention. This adapter makes every sign
 * decision explicit and documented, so the pure calc function receives a
 * clean input shape and the UI caller doesn't have to remember Excel's
 * idiosyncrasies.
 *
 *   Excel semantics observed in the reference workbook:
 *
 *   IS row 26  "Interest Income"       stored as positive income value
 *   IS row 27  "Interest Expense"      stored as negative (an expense)
 *   IS row 30  "Non Operating Income"  stored as signed value (+ income / − loss)
 *   IS row 32  "Profit Before Tax"     stored as positive
 *   IS row 33  "Corporate Tax"         stored as negative (expense)
 *
 *   NOPLAT row 7..10 formula: `='INCOME STATEMENT'!D{row}*-1` for rows 26/27/30,
 *   i.e. the NOPLAT sheet FLIPS the sign of interest income, interest expense,
 *   and non-operating income when pulling them in.
 *
 *   NOPLAT row 13 formula: `='INCOME STATEMENT'!D33*-1` — also flips the sign
 *   of corporate tax to display it as a positive deduction.
 *
 * This adapter centralizes those flips: callers pass raw IS values, the
 * adapter hands a ready-to-compute NoplatInput to `computeNoplat`.
 */

import type { NoplatInput } from '../calculations/noplat'
import type { YearKeyedSeries } from '@/types/financial'
import { mapSeries } from '../calculations/helpers'

export interface IncomeStatementForNoplat {
  /** PBT as stored on IS row 32 (positive). */
  profitBeforeTax: YearKeyedSeries
  /** Interest expense as stored on IS row 27 (negative). */
  interestExpenseRawSigned: YearKeyedSeries
  /** Interest income as stored on IS row 26 (positive). */
  interestIncomeRawSigned: YearKeyedSeries
  /** Non-operating income as stored on IS row 30 (signed). */
  nonOperatingIncomeRawSigned: YearKeyedSeries
  /** Corporate tax as stored on IS row 33 (negative). */
  corporateTaxRawSigned: YearKeyedSeries
}

/**
 * Converts raw Income Statement series into a NOPLAT-ready input by
 * applying the `*-1` sign flips the reference workbook performs.
 */
export function toNoplatInput(raw: IncomeStatementForNoplat): NoplatInput {
  return {
    profitBeforeTax: { ...raw.profitBeforeTax },
    // NOPLAT sheet pulls these as `*-1`:
    interestExpense: mapSeries(raw.interestExpenseRawSigned, (v) => -v),
    interestIncome: mapSeries(raw.interestIncomeRawSigned, (v) => -v),
    nonOperatingIncome: mapSeries(raw.nonOperatingIncomeRawSigned, (v) => -v),
    // Tax provision pulled as `*-1`:
    taxProvision: mapSeries(raw.corporateTaxRawSigned, (v) => -v),
    // Tax adjustments default to zeros (workbook leaves them unused).
  }
}

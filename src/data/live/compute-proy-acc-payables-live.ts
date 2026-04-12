/**
 * PROY ACC PAYABLES — Projected Account Payables / Bank Loan Schedule.
 *
 * Hidden sheet, no visible page. Consumed by PROY CFS (row 21 = repayment).
 *
 * Row mapping (matching proy-acc-payables.json fixture):
 *
 * SHORT-TERM BANK LOAN:
 *  10: Beginning = prev Ending
 *  11: Addition  = 0 (manual input, literal)
 *  12: Repayment = 0 (manual input, literal)
 *  13: Ending    = SUM(10:12)
 *  15: Interest  = Ending * interestRateST * -1
 *
 * LONG-TERM BANK LOAN:
 *  19: Beginning = prev Ending
 *  20: Addition  = 0 (manual input, literal)
 *  21: Repayment = 0 (manual input, literal)
 *  22: Ending    = SUM(19:21)
 *  24: Interest  = Ending * interestRateLT * -1
 *
 * In the prototype, all loan balances are 0. Structure preserved for PROY CFS.
 */

import type { YearKeyedSeries } from '@/types/financial'

export interface ProyAccPayablesInput {
  /** Short-term interest rate. Default 0.14 (14%). */
  interestRateST: number
  /** Long-term interest rate. Default 0.13 (13%). */
  interestRateLT: number
  /** Historical ending balance for ST loan. Default 0. */
  stEnding: number
  /** Historical ending balance for LT loan. Default 0. */
  ltEnding: number
}

export function computeProyAccPayablesLive(
  input: ProyAccPayablesInput,
  histYear: number,
  projYears: readonly number[],
): Record<number, YearKeyedSeries> {
  const out: Record<number, YearKeyedSeries> = {}

  const set = (row: number, year: number, value: number) => {
    if (!out[row]) out[row] = {}
    out[row][year] = value
  }

  const get = (row: number, year: number): number => out[row]?.[year] ?? 0

  const { interestRateST, interestRateLT, stEnding, ltEnding } = input

  // Seed historical ending balances
  set(13, histYear, stEnding)
  set(22, histYear, ltEnding)

  for (const year of projYears) {
    const prev = year - 1

    // Short-term loan
    set(10, year, get(13, prev))     // Beginning = prev Ending
    set(11, year, 0)                 // Addition (literal 0)
    set(12, year, 0)                 // Repayment (literal 0)
    set(13, year, get(10, year) + get(11, year) + get(12, year)) // Ending
    set(15, year, get(13, year) * interestRateST * -1)           // Interest

    // Long-term loan
    set(19, year, get(22, prev))     // Beginning = prev Ending
    set(20, year, 0)                 // Addition (literal 0)
    set(21, year, 0)                 // Repayment (literal 0)
    set(22, year, get(19, year) + get(20, year) + get(21, year)) // Ending
    set(24, year, get(22, year) * interestRateLT * -1)           // Interest
  }

  return out
}

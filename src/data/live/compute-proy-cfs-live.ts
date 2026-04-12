/**
 * PROY CFS — Projected Cash Flow Statement computation.
 *
 * Row mapping (matching proy-cash-flow-statement.json fixture):
 *
 * CASH FLOW FROM OPERATIONS:
 *   5: EBITDA          = PROY LR row 19
 *   6: Corporate Tax   = PROY LR row 37 (already negative)
 *   8: Changes in CA   = -(sum of BS 13,15,17,19 current - prior) * -1
 *   9: Changes in CL   = BS row 45 current - BS row 45 prior
 *  10: Working Capital  = 8 + 9
 *  11: CFO             = SUM(5:9) = 5 + 6 + 8 + 9
 *
 * CASH FLOW FROM NON-OPERATIONS:
 *  13: CF Non-Op       = PROY LR row 34
 *
 * CASH FLOW FROM INVESTMENT:
 *  17: CFI (CapEx)     = PROY FA row 23 * -1
 *
 * CASH FLOW BEFORE FINANCING:
 *  19: CF before Fin   = 11 + 13 + 17
 *
 * FINANCING:
 *  22: Equity Injection = 0
 *  23: New Loan         = 0
 *  24: Interest Expense = PROY LR row 31 (already negative)
 *  25: Interest Income  = PROY LR row 29 (positive)
 *  26: Principal Repay  = PROY ACC PAYABLES row 21
 *  28: CF from Financing = SUM(22:26)
 *
 * NET CASH:
 *  30: Net Cash Flow   = 11 + 13 + 17 + 28
 *  32: Cash Beginning  = prev Cash Ending
 *  33: Cash Ending     = PROY BS row 9 + PROY BS row 11
 *  35: Cash in Bank    = PROY BS row 11
 *  36: Cash on Hand    = PROY BS row 9
 *
 * Sign conventions:
 *  - PROY LR row 37 (tax) is negative in store → direct to CFS row 6
 *  - Current Assets change: increase = cash outflow → multiply delta by -1
 *  - CapEx from PROY FA: positive in FA → negate for cash outflow
 *  - Interest Expense from PROY LR row 31: already negative → direct
 */

import type { YearKeyedSeries } from '@/types/financial'

export interface ProyCfsInput {
  /** PROY LR rows — needs 19 (EBITDA), 29, 31, 34, 37. */
  proyLrRows: Record<number, YearKeyedSeries>
  /** PROY BS rows — needs 9, 11, 13, 15, 17, 19, 45. */
  proyBsRows: Record<number, YearKeyedSeries>
  /** PROY FA rows — needs row 23 (Total Additions/CapEx). */
  proyFaRows: Record<number, YearKeyedSeries>
  /** PROY ACC PAYABLES rows — needs row 21 (LT Repayment). */
  proyApRows: Record<number, YearKeyedSeries>
  /** Historical Cash Ending from prior period (for CFS Cash Beginning row 32). */
  histCashEnding: number
}

export function computeProyCfsLive(
  input: ProyCfsInput,
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
  const bs = (row: number, year: number): number => input.proyBsRows[row]?.[year] ?? 0
  const fa = (row: number, year: number): number => input.proyFaRows[row]?.[year] ?? 0
  const ap = (row: number, year: number): number => input.proyApRows[row]?.[year] ?? 0

  // Seed historical cash ending for row 32 beginning calculation
  set(33, histYear, input.histCashEnding)

  for (const year of projYears) {
    const prev = year - 1

    // ── Cash Flow from Operations ──
    set(5, year, lr(19, year))   // EBITDA
    set(6, year, lr(37, year))   // Corporate Tax (already negative from PROY LR)

    // Changes in Current Assets: -(delta of AR+OtherRec+Inv+Others)
    const caCurr = bs(13, year) + bs(15, year) + bs(17, year) + bs(19, year)
    const caPrev = bs(13, prev) + bs(15, prev) + bs(17, prev) + bs(19, prev)
    set(8, year, -(caCurr - caPrev))

    // Changes in Current Liabilities: delta of Total CL
    set(9, year, bs(45, year) - bs(45, prev))

    // Working Capital
    set(10, year, get(8, year) + get(9, year))

    // CFO = EBITDA + Tax + CA changes + CL changes
    set(11, year, get(5, year) + get(6, year) + get(8, year) + get(9, year))

    // ── Cash Flow from Non-Operations ──
    set(13, year, lr(34, year))  // Non-operating income

    // ── Cash Flow from Investment ──
    set(17, year, fa(23, year) * -1)  // CapEx negated

    // ── Cash Flow before Financing ──
    set(19, year, get(11, year) + get(13, year) + get(17, year))

    // ── Financing ──
    set(22, year, 0)               // Equity Injection
    set(23, year, 0)               // New Loan
    set(24, year, lr(31, year))    // Interest Expense (already negative)
    set(25, year, lr(29, year))    // Interest Income (positive)
    set(26, year, ap(21, year))    // Principal Repayment

    // CF from Financing
    set(28, year, get(22, year) + get(23, year) + get(24, year) + get(25, year) + get(26, year))

    // ── Net Cash Flow ──
    set(30, year, get(11, year) + get(13, year) + get(17, year) + get(28, year))

    // Cash balances from PROY BS
    set(32, year, get(33, prev))                    // Beginning = prev Ending
    set(33, year, bs(9, year) + bs(11, year))       // Ending = Cash on Hand + Cash in Banks
    set(35, year, bs(11, year))                     // Cash in Bank
    set(36, year, bs(9, year))                      // Cash on Hand
  }

  return out
}

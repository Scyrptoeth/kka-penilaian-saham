/**
 * PROY CFS — Projected Cash Flow Statement computation (Session 039 rewrite).
 *
 * ════════════════════════════════════════════════════════════════════════
 * Session 039 — Account-driven Working Capital aggregation.
 * ════════════════════════════════════════════════════════════════════════
 *
 * Legacy behavior (pre-Session-039): hardcoded access to PROY BS template
 * rows 13/15/17/19 for ΔCA and row 45 for Total CL. This was coupled to
 * PT Raja Voltama prototipe template row numbering and broke silently for
 * dynamic catalog accounts (Session 036's `computeProyBsLive` outputs
 * user-excelRow-keyed data, not template-keyed).
 *
 * New behavior: ΔCA / ΔCL aggregate from `proyBsRows` using the same
 * account-driven pattern as historical CFS — iterate `bsAccounts` filtered
 * by section, skip exclusions. The exclusion list flows from the same
 * `changesInWorkingCapital` store slice used by historical CFS, so user's
 * scope choice propagates consistently across both timeframes.
 *
 * Row mapping:
 *   5  EBITDA          = PROY LR row 19
 *   6  Corporate Tax   = PROY LR row 37 (already negative)
 *   8  ΔCurrent Assets = -(ΣCA[year] − ΣCA[prev]) where ΣCA excludes user's exclusion list
 *   9  ΔCurrent Liab   = ΣCL[year] − ΣCL[prev] where ΣCL excludes user's exclusion list
 *  10  Working Capital = 8 + 9
 *  11  CFO             = 5 + 6 + 8 + 9
 *  13  CF Non-Op       = PROY LR row 34
 *  17  CFI (CapEx)     = PROY FA row 23 × -1
 *  19  CF before Fin   = 11 + 13 + 17
 *  22  Equity Injection = 0
 *  23  New Loan         = 0
 *  24  Interest Expense = PROY LR row 31 (already negative)
 *  25  Interest Income  = PROY LR row 29
 *  26  Principal Repay  = PROY ACC PAYABLES row 21
 *  28  CF from Financing = 22 + 23 + 24 + 25 + 26
 *  30  Net Cash Flow   = 11 + 13 + 17 + 28
 *  32  Cash Beginning  = prior year Cash Ending
 *  33  Cash Ending     = PROY BS row 8 + row 9 (user's standard Cash rows)
 *  35  Cash in Bank    = PROY BS row 9
 *  36  Cash on Hand    = PROY BS row 8
 *
 * Design priority: system correctness across hundreds of different company
 * structures > fixture-value parity with PT Raja Voltama prototipe (single
 * case study). See /memory/feedback_system_over_prototype.md.
 */

import type { YearKeyedSeries } from '@/types/financial'
import type { BsAccountEntry } from '@/data/catalogs/balance-sheet-catalog'

export interface ProyCfsInput {
  /** PROY LR rows — needs 19 (EBITDA), 29, 31, 34, 37. */
  proyLrRows: Record<number, YearKeyedSeries>
  /** PROY BS rows — keyed by USER excelRow per computeProyBsLive contract. */
  proyBsRows: Record<number, YearKeyedSeries>
  /** PROY FA rows — needs row 23 (Total Additions/CapEx). */
  proyFaRows: Record<number, YearKeyedSeries>
  /** PROY ACC PAYABLES rows — needs row 21 (LT Repayment). */
  proyApRows: Record<number, YearKeyedSeries>
  /** Historical Cash Ending from prior period (for CFS Cash Beginning row 32). */
  histCashEnding: number
  /**
   * Session 039 — BS account entries for account-driven WC aggregation.
   * Same list as historical CFS; defaults to empty (no CA/CL contribution)
   * to keep the function safe-to-call before accounts are wired.
   */
  bsAccounts?: readonly BsAccountEntry[]
  /** Session 039 — excelRows excluded from Operating WC (same as historical). */
  excludedCurrentAssets?: readonly number[]
  excludedCurrentLiabilities?: readonly number[]
}

function sumRows(
  data: Record<number, YearKeyedSeries>,
  rows: readonly number[],
  year: number,
): number {
  return rows.reduce((sum, r) => sum + (data[r]?.[year] ?? 0), 0)
}

export function computeProyCfsLive(
  input: ProyCfsInput,
  histYear: number,
  projYears: readonly number[],
): Record<number, YearKeyedSeries> {
  const {
    proyLrRows, proyBsRows, proyFaRows, proyApRows, histCashEnding,
    bsAccounts = [],
    excludedCurrentAssets = [],
    excludedCurrentLiabilities = [],
  } = input

  const out: Record<number, YearKeyedSeries> = {}

  const set = (row: number, year: number, value: number) => {
    if (!out[row]) out[row] = {}
    out[row][year] = value
  }

  const get = (row: number, year: number): number => out[row]?.[year] ?? 0

  const lr = (row: number, year: number): number => proyLrRows[row]?.[year] ?? 0
  const bs = (row: number, year: number): number => proyBsRows[row]?.[year] ?? 0
  const fa = (row: number, year: number): number => proyFaRows[row]?.[year] ?? 0
  const ap = (row: number, year: number): number => proyApRows[row]?.[year] ?? 0

  // Account-driven CA / CL row lists (same filter as historical CFS).
  const excludedCaSet = new Set(excludedCurrentAssets)
  const excludedClSet = new Set(excludedCurrentLiabilities)
  const caRows = bsAccounts
    .filter((a) => a.section === 'current_assets' && !excludedCaSet.has(a.excelRow))
    .map((a) => a.excelRow)
  const clRows = bsAccounts
    .filter((a) => a.section === 'current_liabilities' && !excludedClSet.has(a.excelRow))
    .map((a) => a.excelRow)

  // Seed historical cash ending for row 32 beginning calculation
  set(33, histYear, histCashEnding)

  for (const year of projYears) {
    const prev = year - 1

    // ── Cash Flow from Operations ──
    set(5, year, lr(19, year))   // EBITDA
    set(6, year, lr(37, year))   // Corporate Tax (already negative from PROY LR)

    // Changes in Current Assets: -(ΣCA[year] − ΣCA[prev]) across user-selected CA accounts
    const caCurr = sumRows(proyBsRows, caRows, year)
    const caPrev = sumRows(proyBsRows, caRows, prev)
    set(8, year, -(caCurr - caPrev))

    // Changes in Current Liabilities: ΣCL[year] − ΣCL[prev] across user-selected CL accounts
    const clCurr = sumRows(proyBsRows, clRows, year)
    const clPrev = sumRows(proyBsRows, clRows, prev)
    set(9, year, clCurr - clPrev)

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

    // ── Cash balances ──
    // Standard Cash rows (8 = Cash on Hand, 9 = Bank) consistent with historical CFS.
    set(32, year, get(33, prev))                // Beginning = prev Ending
    set(33, year, bs(8, year) + bs(9, year))    // Ending = Cash on Hand + Cash in Bank
    set(35, year, bs(9, year))                  // Cash in Bank
    set(36, year, bs(8, year))                  // Cash on Hand
  }

  return out
}

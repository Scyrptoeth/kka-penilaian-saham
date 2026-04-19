/**
 * Compute Financing section (CFS rows 22–26) — Session 056 Task 2.3.
 *
 * Scope-aware derivation: user curates which BS / IS / AP rows feed each of
 * the 5 CFS "Financing" rows via the `/input/financing` scope editor. This
 * helper replaces the hardcoded references that previously lived inside
 * `src/data/live/compute-cash-flow-live.ts`:
 *
 *   Legacy (hardcoded):
 *     row 23 (New Loan)           → apRows[10] + apRows[19]
 *     row 24 (Interest Payment)   → isLeaves[27]
 *     row 25 (Interest Income)    → isLeaves[26]
 *     row 26 (Principal Repay)    → apRows[20]
 *     row 22 (Equity Injection)   → 0 (no source at all)
 *
 *   New (scope-driven):
 *     equityInjection[Y]  = Σ(bsRows[r][Y]) − Σ(bsRows[r][priorY])
 *     newLoan[Y]          = Σ(apRows[r][Y])
 *     interestPayment[Y]  = Σ(isLeaves[r][Y])
 *     interestIncome[Y]   = Σ(isLeaves[r][Y])
 *     principalRepayment  = Σ(apRows[r][Y])
 *
 * Prior-year resolution for Equity Injection delta (same pattern as row 9 CL
 * delta in compute-cash-flow-live.ts):
 *   - i === 0 (first cfsYear): priorY = bsYears[0]
 *     (BS has 1 more historical year than CFS — LESSON-013)
 *   - i > 0:  priorY = cfsYears[i - 1]
 *
 * Sign conventions preserved — natural Excel convention (LESSON-055):
 *   - IS leaves: expenses already negative (e.g. interest payment = -300)
 *   - AP rows:   signed by user (principal repayment typically negative,
 *                new loan typically positive)
 *   - BS leaves: natural positive values (equity grows positive)
 *
 * When `financing === null` (pre-migration store / unconfirmed scope) all
 * five series are zeros for every cfsYear. Missing rows and missing years
 * default to 0 via the `?? 0` pattern — no errors thrown, no NaN propagation
 * (LESSON-108 defensive aggregation).
 */

import type { YearKeyedSeries } from '@/types/financial'
import type { FinancingState } from '@/lib/store/useKkaStore'

export type { FinancingState } // re-export for convenience

export interface FinancingResult {
  equityInjection: YearKeyedSeries
  newLoan: YearKeyedSeries
  interestPayment: YearKeyedSeries
  interestIncome: YearKeyedSeries
  principalRepayment: YearKeyedSeries
}

export interface ComputeFinancingInput {
  financing: FinancingState | null
  bsRows: Record<number, YearKeyedSeries>
  isLeaves: Record<number, YearKeyedSeries>
  apRows: Record<number, YearKeyedSeries>
  cfsYears: readonly number[]
  bsYears: readonly number[]
}

function sumRows(
  data: Record<number, YearKeyedSeries>,
  rows: readonly number[],
  year: number,
): number {
  let total = 0
  for (const r of rows) {
    total += data[r]?.[year] ?? 0
  }
  return total
}

function zerosFor(years: readonly number[]): YearKeyedSeries {
  const out: YearKeyedSeries = {}
  for (const y of years) out[y] = 0
  return out
}

function passThroughSum(
  rows: readonly number[],
  data: Record<number, YearKeyedSeries>,
  years: readonly number[],
): YearKeyedSeries {
  const out: YearKeyedSeries = {}
  for (const y of years) {
    out[y] = sumRows(data, rows, y)
  }
  return out
}

export function computeFinancing(input: ComputeFinancingInput): FinancingResult {
  const { financing, bsRows, isLeaves, apRows, cfsYears, bsYears } = input

  if (financing === null) {
    return {
      equityInjection: zerosFor(cfsYears),
      newLoan: zerosFor(cfsYears),
      interestPayment: zerosFor(cfsYears),
      interestIncome: zerosFor(cfsYears),
      principalRepayment: zerosFor(cfsYears),
    }
  }

  // Equity Injection: year-over-year BS delta.
  const equityInjection: YearKeyedSeries = {}
  for (let i = 0; i < cfsYears.length; i++) {
    const year = cfsYears[i]
    const priorYear = i === 0 ? bsYears[0] : cfsYears[i - 1]
    const curr = sumRows(bsRows, financing.equityInjection, year)
    const prior = sumRows(bsRows, financing.equityInjection, priorYear)
    equityInjection[year] = curr - prior
  }

  return {
    equityInjection,
    newLoan: passThroughSum(financing.newLoan, apRows, cfsYears),
    interestPayment: passThroughSum(
      financing.interestPayment,
      isLeaves,
      cfsYears,
    ),
    interestIncome: passThroughSum(
      financing.interestIncome,
      isLeaves,
      cfsYears,
    ),
    principalRepayment: passThroughSum(
      financing.principalRepayment,
      apRows,
      cfsYears,
    ),
  }
}

/**
 * Compute Cash Balance (Beginning / Ending rows for CFS) — Session 055 Task 4.
 *
 * Scope-aware derivation: user curates which Balance Sheet `current_assets`
 * rows count as "cash" via the Cash Balance scope editor; this helper rolls
 * those rows up into the two CFS rows:
 *
 *   ending[Y]    = Σ(scope.accounts.map(row => bsRows[row]?.[Y] ?? 0))
 *   beginning[Y] = Σ(scope.accounts.map(row => bsRows[row]?.[Y-1] ?? 0))
 *
 * The year-shift means `beginning[cfsYears[i]] === ending[cfsYears[i-1]]` for
 * every i>0 — the basic accounting identity Ending[Y-1] = Beginning[Y].
 *
 * Prior-year resolution for the first CFS year:
 *   1. If `bsYears` contains a year earlier than `cfsYears[0]`, use that BS
 *      value (typical case: BS has 1 more historical year than CFS).
 *   2. Otherwise fall back to `scope.preHistoryBeginning` (user entry for the
 *      pre-period cash balance), defaulting to 0 when absent.
 */

import type { YearKeyedSeries } from '@/types/financial'
import type { CashBalanceState } from '@/lib/store/useKkaStore'

export interface ComputeCashBalanceInput {
  scope: CashBalanceState
  bsRows: Record<number, YearKeyedSeries>
  cfsYears: readonly number[]
  bsYears: readonly number[]
}

export interface ComputeCashBalanceResult {
  ending: YearKeyedSeries
  beginning: YearKeyedSeries
}

function sumAccountsAt(
  accounts: readonly number[],
  bsRows: Record<number, YearKeyedSeries>,
  year: number,
): number {
  let total = 0
  for (const row of accounts) {
    total += bsRows[row]?.[year] ?? 0
  }
  return total
}

export function computeCashBalance(
  input: ComputeCashBalanceInput,
): ComputeCashBalanceResult {
  const { scope, bsRows, cfsYears, bsYears } = input
  const ending: YearKeyedSeries = {}
  const beginning: YearKeyedSeries = {}

  for (let i = 0; i < cfsYears.length; i++) {
    const year = cfsYears[i]
    ending[year] = sumAccountsAt(scope.accounts, bsRows, year)

    // Resolve prior year for Beginning[year]
    let priorYear: number | undefined
    if (i > 0) {
      priorYear = cfsYears[i - 1]
    } else {
      const firstCfsIdxInBs = bsYears.indexOf(year)
      if (firstCfsIdxInBs > 0) {
        priorYear = bsYears[firstCfsIdxInBs - 1]
      }
    }

    beginning[year] =
      priorYear !== undefined
        ? sumAccountsAt(scope.accounts, bsRows, priorYear)
        : (scope.preHistoryBeginning ?? 0)
  }

  return { ending, beginning }
}

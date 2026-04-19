/**
 * Compute Cash Account split (CFS rows 35 & 36) — Session 055 Task 5.
 *
 * Scope-aware derivation: user partitions Balance Sheet `current_assets`
 * rows into two disjoint buckets via the Cash Account scope editor:
 *
 *   bank[Y]       = Σ(scope.bank.map(row => bsRows[row]?.[Y] ?? 0))
 *   cashOnHand[Y] = Σ(scope.cashOnHand.map(row => bsRows[row]?.[Y] ?? 0))
 *
 * These feed the two CFS "Cash Ending" sub-rows for Bank vs On Hand display.
 * Missing rows/years default to 0 (no NaN propagation). Mutual exclusion
 * (bank ∩ cashOnHand = ∅) is enforced upstream by the store setters; this
 * helper sums each bucket independently.
 */

import type { YearKeyedSeries } from '@/types/financial'
import type { CashAccountState } from '@/lib/store/useKkaStore'

export interface ComputeCashAccountInput {
  scope: CashAccountState
  bsRows: Record<number, YearKeyedSeries>
  years: readonly number[]
}

export interface ComputeCashAccountResult {
  bank: YearKeyedSeries
  cashOnHand: YearKeyedSeries
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

function sumBucketAcrossYears(
  accounts: readonly number[],
  bsRows: Record<number, YearKeyedSeries>,
  years: readonly number[],
): YearKeyedSeries {
  const out: YearKeyedSeries = {}
  for (const year of years) {
    out[year] = sumAccountsAt(accounts, bsRows, year)
  }
  return out
}

export function computeCashAccount(
  input: ComputeCashAccountInput,
): ComputeCashAccountResult {
  const { scope, bsRows, years } = input
  return {
    bank: sumBucketAcrossYears(scope.bank, bsRows, years),
    cashOnHand: sumBucketAcrossYears(scope.cashOnHand, bsRows, years),
  }
}

/**
 * Cash Flow Statement live compute adapter — account-driven (Session 039 + 055).
 *
 * Maps upstream data (BS accounts + BS / IS / FA / AP row values) into CFS
 * manifest leaf rows. The caller feeds the result into `deriveComputedRows`
 * with the CFS manifest to produce subtotals (rows 10, 11, 19, 28, 30).
 *
 * ═══════════════════════════════════════════════════════════════════════
 * Session 039 rewrite: Working Capital is account-driven, not hardcoded.
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Legacy behavior (pre-Session-039): hardcoded `BS_CA_ROWS=[10,11,12,14]`
 * and `BS_CL_ROWS=[31,32,33,34]` — these static row numbers matched the PT
 * Raja Voltama prototipe formula but MISSED accounts at excelRow ≥ 100
 * (catalog extended) and ≥ 1000 (user custom/manual) in dynamic catalog
 * mode. Result: Δ CA / Δ CL rendered 0 for every user who used extended
 * or custom accounts (most of them).
 *
 * New behavior: Current Asset / Current Liability aggregation iterates
 * `bsAccounts.filter(a => a.section === 'current_assets')` minus accounts
 * whose excelRow appears in `excludedCurrentAssets` (same for CL). Users
 * control exactly which accounts count as Operating Working Capital via
 * the `/input/changes-in-working-capital` page.
 *
 * Design priority: correctness of generalized calculation across hundreds
 * of different company structures > fixture-value parity with single
 * PT Raja Voltama case study. See /memory/feedback_system_over_prototype.md.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * Session 055 rewrite: Cash rows 32/33/35/36 are scope-driven.
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Legacy behavior (pre-Session-055): hardcoded `BS_CASH_ROWS=[8, 9]` —
 * rows 32/33 summed BS rows 8+9 at current/prior year, rows 35/36 read
 * BS row 9 / row 8 directly. Same brittleness as WC: broke for extended
 * or custom BS structures.
 *
 * New behavior: caller passes pre-computed `cashBalanceResult` (from
 * `computeCashBalance` against user-curated Cash Balance scope) and
 * `cashAccountResult` (from `computeCashAccount` against user-curated
 * bank / cashOnHand partition). When either is absent, the affected
 * rows fall back to 0 — callers that still want the legacy "sum rows
 * 8+9" behavior must pre-compute it themselves and pass the result.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * Session 056 rewrite: Financing rows 22/23/24/25/26 are scope-driven.
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Legacy behavior (pre-Session-056):
 *   - row 22 (Equity Injection)   → 0 (no input source at all)
 *   - row 23 (New Loan)           → apRows[10] + apRows[19]   (hardcoded)
 *   - row 24 (Interest Payment)   → isLeaves[27]              (hardcoded)
 *   - row 25 (Interest Income)    → isLeaves[26]              (hardcoded)
 *   - row 26 (Principal Repay)    → apRows[20]                (hardcoded)
 * Same brittleness pattern as WC / Cash: broke for extended or custom
 * BS / IS / AP structures, and row 22 always rendered 0 regardless of
 * equity movements in the BS.
 *
 * New behavior: caller passes pre-computed `financingResult` (from
 * `computeFinancing` against user-curated Financing scope). The 5
 * financing rows read directly from `financingResult.{equityInjection,
 * newLoan, interestPayment, interestIncome, principalRepayment}`. When
 * `financingResult` is absent (legacy callers / unconfirmed scope), all
 * five rows fall back to 0 — callers that want the legacy AP/IS
 * reconstruction must pre-compute it themselves via `computeFinancing`
 * with an equivalent scope and pass the result.
 *
 * Sign conventions (unchanged):
 *   - IS leaves: natural sign (expenses negative per Excel convention)
 *   - BS leaves: natural values (positive)
 *   - FA leaves: natural values (positive)
 *   - AP rows: natural values (nullable, defaults to 0)
 *
 * Column offset note (LESSON-013):
 *   BS uses 4 years (cols C-F); CFS uses 3 years (cols C-E).
 *   CFS row 9 (CL delta) year 1 needs BS prior year (bsYears[0]).
 *
 * Row 8 asymmetry (workbook design choice, preserved):
 *   Year 1: -(absolute CA level)  — no prior-year subtraction
 *   Year 2+: -(CA delta)          — standard YoY change
 *   Row 9 uses delta for ALL years including year 1.
 */

import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { FIXED_ASSET_MANIFEST } from '@/data/manifests/fixed-asset'
import type { BsAccountEntry } from '@/data/catalogs/balance-sheet-catalog'
import type { YearKeyedSeries } from '@/types/financial'
import type { FinancingResult } from '@/lib/calculations/compute-financing'

function sumRows(
  data: Record<number, YearKeyedSeries>,
  rows: readonly number[],
  year: number,
): number {
  return rows.reduce((sum, r) => sum + (data[r]?.[year] ?? 0), 0)
}

/**
 * Resolve the active excelRow list for a BS section, minus user exclusions.
 *
 * Exported so downstream consumers (projection CFS, inspection UIs) can
 * share the exact same filter without re-implementing it.
 */
export function resolveWcRows(
  bsAccounts: readonly BsAccountEntry[],
  section: 'current_assets' | 'current_liabilities',
  excluded: readonly number[],
): number[] {
  const excludedSet = new Set(excluded)
  return bsAccounts
    .filter((a) => a.section === section && !excludedSet.has(a.excelRow))
    .map((a) => a.excelRow)
}

/**
 * Compute CFS leaf/pseudo-leaf rows from upstream data.
 *
 * Returns all CFS manifest rows EXCEPT those with `computedFrom`
 * (rows 10, 11, 19, 28, 30 — handled by `deriveComputedRows`).
 *
 * @param bsAccounts              BS account entries (from store `balanceSheet.accounts`)
 * @param bsRows                  BS leaf values (natural sign, keyed by BS excelRow)
 * @param isLeaves                IS leaf values (Excel convention: expenses negative)
 * @param faLeaves                FA leaf values (natural sign, nullable if FA not entered)
 * @param apRows                  ACC PAYABLES leaf values (nullable). No longer consumed
 *                                after Session 056 — financing rows now read from
 *                                `financingResult`. Kept in signature for backward-compat
 *                                with existing callers; may be removed in a future cleanup.
 * @param cfsYears                CFS year span, e.g. [2019, 2020, 2021]
 * @param bsYears                 BS year span, e.g. [2018, 2019, 2020, 2021] — first entry
 *                                is the prior year for CL delta and Cash Beginning
 * @param excludedCurrentAssets   BS excelRows to exclude from CA aggregation (user scope)
 * @param excludedCurrentLiab     BS excelRows to exclude from CL aggregation (user scope)
 * @param cashBalanceResult       Session 055 — pre-computed Cash Beginning / Ending series
 *                                (from `computeCashBalance`). Feeds rows 32/33. When absent,
 *                                rows 32/33 default to 0.
 * @param cashAccountResult       Session 055 — pre-computed Bank / CashOnHand split
 *                                (from `computeCashAccount`). Feeds rows 35/36. When absent,
 *                                rows 35/36 default to 0.
 * @param financingResult         Session 056 — pre-computed 5 Financing series
 *                                (from `computeFinancing` against user-curated Financing
 *                                scope). Feeds rows 22/23/24/25/26. When absent, those
 *                                rows default to 0 (legacy-null behavior preserved).
 */
export function computeCashFlowLiveRows(
  bsAccounts: readonly BsAccountEntry[],
  bsRows: Record<number, YearKeyedSeries>,
  isLeaves: Record<number, YearKeyedSeries>,
  faLeaves: Record<number, YearKeyedSeries> | null,
  apRows: Record<number, YearKeyedSeries> | null,
  cfsYears: readonly number[],
  bsYears: readonly number[],
  excludedCurrentAssets: readonly number[] = [],
  excludedCurrentLiab: readonly number[] = [],
  cashBalanceResult?: { ending: YearKeyedSeries; beginning: YearKeyedSeries },
  cashAccountResult?: { bank: YearKeyedSeries; cashOnHand: YearKeyedSeries },
  financingResult?: FinancingResult,
): Record<number, YearKeyedSeries> {
  // Compute FA subtotals — need Total Additions (row 23) for CapEx.
  // Sentinel subtotals in store override re-derived values (include extended accounts).
  const faRecomputed = faLeaves
    ? deriveComputedRows(FIXED_ASSET_MANIFEST.rows, faLeaves, cfsYears)
    : null
  const faComputed = faRecomputed ? { ...faRecomputed, ...faLeaves } : null

  // Resolve active CA + CL row lists (respecting user exclusions).
  const caRows = resolveWcRows(bsAccounts, 'current_assets', excludedCurrentAssets)
  const clRows = resolveWcRows(bsAccounts, 'current_liabilities', excludedCurrentLiab)

  const out: Record<number, YearKeyedSeries> = {}
  const set = (row: number, year: number, value: number) => {
    if (!out[row]) out[row] = {}
    out[row][year] = value
  }

  for (let i = 0; i < cfsYears.length; i++) {
    const year = cfsYears[i]
    const isFirstYear = i === 0

    // ── OPERATIONS ──

    // Row 5: EBITDA = IS row 18 (sentinel, positive for profit)
    set(5, year, isLeaves[18]?.[year] ?? 0)

    // Row 6: Corporate Tax = IS row 33 (direct — already negative per Excel convention)
    set(6, year, isLeaves[33]?.[year] ?? 0)

    // Row 8: Current Assets change (account-driven, respects exclusions)
    // Year 1: -(absolute CA level)
    // Year 2+: -(CA delta)
    const caThisYear = sumRows(bsRows, caRows, year)
    if (isFirstYear) {
      set(8, year, -caThisYear)
    } else {
      const caPriorYear = sumRows(bsRows, caRows, cfsYears[i - 1])
      set(8, year, -(caThisYear - caPriorYear))
    }

    // Row 9: Current Liabilities change (account-driven, respects exclusions)
    // Delta ALL years. Year 1 prior = bsYears[0]; Year 2+ prior = cfsYears[i-1].
    const clThisYear = sumRows(bsRows, clRows, year)
    const clPriorYear = sumRows(
      bsRows,
      clRows,
      isFirstYear ? bsYears[0] : cfsYears[i - 1],
    )
    set(9, year, clThisYear - clPriorYear)

    // ── NON-OPERATING ──

    // Row 13: Non-operating = IS row 30 (user-signed, direct)
    set(13, year, isLeaves[30]?.[year] ?? 0)

    // ── INVESTMENT ──

    // Row 17: CapEx = FA row 23 (Total Additions) × -1
    set(17, year, -(faComputed?.[23]?.[year] ?? 0))

    // ── FINANCING — scope-driven via Financing slice (Session 056) ──

    // Row 22: Equity Injection (YoY delta on user-picked equity accounts)
    set(22, year, financingResult?.equityInjection?.[year] ?? 0)

    // Row 23: New Loan (sum user-picked AP Add-band rows)
    set(23, year, financingResult?.newLoan?.[year] ?? 0)

    // Row 24: Interest Payment (sum user-picked IS interest_expense accounts —
    // IS convention preserved: expenses already negative per LESSON-011)
    set(24, year, financingResult?.interestPayment?.[year] ?? 0)

    // Row 25: Interest Income (sum user-picked IS interest_income accounts)
    set(25, year, financingResult?.interestIncome?.[year] ?? 0)

    // Row 26: Principal Repayment (sum user-picked AP rows)
    set(26, year, financingResult?.principalRepayment?.[year] ?? 0)

    // ── CASH BALANCES (Session 055 — scope-driven via Cash Balance / Cash Account) ──

    // Row 32: Cash Beginning — from `cashBalanceResult.beginning` (defaults 0).
    set(32, year, cashBalanceResult?.beginning?.[year] ?? 0)

    // Row 33: Cash Ending — from `cashBalanceResult.ending` (defaults 0).
    set(33, year, cashBalanceResult?.ending?.[year] ?? 0)

    // Row 35: Cash in Bank — from `cashAccountResult.bank` (defaults 0).
    set(35, year, cashAccountResult?.bank?.[year] ?? 0)

    // Row 36: Cash on Hand — from `cashAccountResult.cashOnHand` (defaults 0).
    set(36, year, cashAccountResult?.cashOnHand?.[year] ?? 0)
  }

  return out
}

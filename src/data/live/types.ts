/**
 * Live data mode — user-input state shapes for financial sheets.
 *
 * Each input-state holds only the rows that are directly editable by the
 * user (leaf line items). Subtotals/totals are computed downstream at
 * render time and never stored here. `rows` is keyed by Excel row number
 * from the corresponding manifest; values are {@link YearKeyedSeries}.
 *
 * These types are consumed by:
 *   - `useKkaStore` slices (`balanceSheet`, `incomeStatement`, `fixedAsset`)
 *   - `buildLiveCellMap` adapter in `./build-cell-map.ts`
 *   - `/input/<sheet>` form pages
 *
 * Added in Session 010 as the foundation for Phase 3 live data mode.
 */

import type { YearKeyedSeries } from '@/types/financial'
import type { BsAccountEntry } from '@/data/catalogs/balance-sheet-catalog'
import type { FaAccountEntry } from '@/data/catalogs/fixed-asset-catalog'
import type { IsAccountEntry } from '@/data/catalogs/income-statement-catalog'

export interface BalanceSheetInputState {
  /** User-selected accounts — ordered as displayed. Added Session 020. */
  accounts: BsAccountEntry[]
  /** Number of historical years to display (minimum 1 = Y-1 only). */
  yearCount: number
  /** Display language for account labels: 'en' | 'id'. */
  language: 'en' | 'id'
  /** excelRow → { year → value }. BACKWARD-COMPATIBLE — shape unchanged. */
  rows: Record<number, YearKeyedSeries>
}

export interface IncomeStatementInputState {
  /** User-selected accounts — ordered as displayed. Added Session 019. */
  accounts: IsAccountEntry[]
  /** Number of historical years to display (default 4). */
  yearCount: number
  /** Display language for account labels: 'en' | 'id'. */
  language: 'en' | 'id'
  /**
   * excelRow → { year → value }. Contains BOTH:
   * - Leaf data at extended rows (100+, 200+, etc.)
   * - Pre-computed sentinel values at original positions (6, 7, 8, 15, etc.)
   *   for downstream backward compatibility.
   */
  rows: Record<number, YearKeyedSeries>
}

export interface FixedAssetInputState {
  /** User-selected accounts — ordered as displayed. Added Session 019. */
  accounts: FaAccountEntry[]
  /** Number of historical years to display (default 3). */
  yearCount: number
  /** Display language for account labels: 'en' | 'id'. */
  language: 'en' | 'id'
  /** excelRow → { year → value }. Keys use FA_OFFSET multipliers. */
  rows: Record<number, YearKeyedSeries>
}

/**
 * Acc Payables — bank loan schedules (dynamic catalog as of Session 042).
 *
 * Session 042 Task 4 promoted this slice to full dynamic catalog treatment
 * (Opsi B + 5a=A + 5b=A + 5c=A):
 *   - 2 fixed sections: short-term bank loans + long-term bank loans
 *   - Each section holds an ordered list of schedules; default seeds 1 per
 *   - 3 bands per schedule: Beginning (computed), Addition (signed leaf),
 *     Ending (computed Beg + Addition)
 *   - Repayment is expressed as negative Addition (LESSON-055 convention)
 *
 * Row encoding (template baseline + synthetic extensions):
 *   ST_BEG  baseline: 9     extended: 100-139  (slot 1..40)
 *   ST_ADD  baseline: 10    extended: 140-179
 *   ST_END  baseline: 12    extended: 180-219  (computed band)
 *   LT_BEG  baseline: 18    extended: 220-259
 *   LT_ADD  baseline: 19    extended: 260-299
 *   LT_END  baseline: 21    extended: 300-339  (computed band)
 *
 * slotIndex 0 = baseline template rows; slotIndex N≥1 = synthetic extended.
 */
export type ApSection = 'st_bank_loans' | 'lt_bank_loans'

export interface ApSchedule {
  /** Stable id (e.g. 'st_default_1', 'ap_<timestamp>') */
  id: string
  section: ApSection
  /** 0 = baseline template schedule, 1+ = user-added (uses synthetic rows) */
  slotIndex: number
  /** User rename overrides the default "Short-Term Bank Loan N" label */
  customLabel?: string
}

export interface AccPayablesInputState {
  schedules: ApSchedule[]
  rows: Record<number, YearKeyedSeries>
}

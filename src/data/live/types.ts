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
 * Acc Payables — hidden worksheet dependency for CFS financing section.
 * Rows 10 + 19 → New Loan; Row 20 → Principal Repayment.
 * Session 012 adds the slice; dedicated input page deferred (YAGNI —
 * prototype values are all zero, CFS defaults financing to 0 when null).
 */
export interface AccPayablesInputState {
  rows: Record<number, YearKeyedSeries>
}

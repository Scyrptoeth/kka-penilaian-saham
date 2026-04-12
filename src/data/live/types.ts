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

export interface BalanceSheetInputState {
  /** excelRow → { year → value }. Only editable leaf rows stored. */
  rows: Record<number, YearKeyedSeries>
}

export interface IncomeStatementInputState {
  rows: Record<number, YearKeyedSeries>
}

export interface FixedAssetInputState {
  rows: Record<number, YearKeyedSeries>
}

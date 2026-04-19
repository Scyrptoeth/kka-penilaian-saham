import type ExcelJS from 'exceljs'
import type { ExportableState } from '@/lib/export/export-xlsx'

/**
 * Store slices that a SheetBuilder may depend on. A sheet is considered
 * "populated" iff every slice in its `upstream` array resolves to a
 * non-empty value in the provided ExportableState. Otherwise the sheet
 * is blanked via clearSheetCompletely().
 */
export type UpstreamSlice =
  | 'home'
  | 'balanceSheet'
  | 'incomeStatement'
  | 'fixedAsset'
  | 'accPayables'
  | 'keyDrivers'
  | 'wacc'
  | 'discountRate'
  | 'dlom'
  | 'dloc'
  | 'borrowingCapInput'
  | 'aamAdjustments'
  | 'interestBearingDebt'
  | 'changesInWorkingCapital'
  | 'growthRevenue'
  | 'investedCapital'
  | 'cashBalance'
  | 'cashAccount'
  | 'financing'

/**
 * One SheetBuilder per exported Excel sheet. build() is only called when
 * isPopulated(upstream, state) returns true; otherwise the worksheet is
 * cleared to a blank shell.
 */
export interface SheetBuilder {
  readonly sheetName: string
  readonly upstream: readonly UpstreamSlice[]
  build(workbook: ExcelJS.Workbook, state: ExportableState): void
}

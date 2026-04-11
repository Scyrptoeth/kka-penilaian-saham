/**
 * Sheet manifest types — structured row descriptors used to render Excel
 * sheets via <FinancialTable> without hand-wiring every cell per page.
 *
 * A manifest:
 *   - names the sheet (slug + title + years)
 *   - maps each year to its Excel column letter for each column group
 *     (values / commonSize / growth)
 *   - lists each row to render, pointing to an Excel row number, an optional
 *     indent level, a type (normal/subtotal/total/header/separator), and an
 *     optional human-readable formula description used by the tooltip layer
 *
 * The builder in `./build.ts` takes a manifest + a loaded cell map and
 * produces `FinancialRow[]` ready for <FinancialTable>.
 */

export type RowType =
  | 'normal'
  | 'subtotal'
  | 'total'
  | 'header'
  | 'separator'

export interface ManifestFormulaDescriptions {
  /** Description for the raw values column — usually omitted for input rows. */
  values?: string
  /** Description for the common-size column. Used with showCommonSize. */
  commonSize?: string
  /** Description for the growth column. Used with showGrowth. */
  growth?: string
}

export interface ManifestRow {
  /**
   * Excel row number that holds this line's values. Omit for synthesized
   * rows (e.g. pure 'separator' or 'header' rows with no data).
   */
  excelRow?: number
  /** Human-readable label shown in the first table column. */
  label: string
  /** Indentation level, 0 = parent, 1 = child, 2 = grandchild. */
  indent?: 0 | 1 | 2
  /** Row visual treatment. Defaults to 'normal' when `excelRow` is set. */
  type?: RowType
  /** Optional formula descriptions for tooltip layer. */
  formula?: ManifestFormulaDescriptions
}

export interface SheetManifest {
  /** Sheet display title shown in the table caption. */
  title: string
  /** Short sheet identifier used for fixture lookup + keys. */
  slug:
    | 'balance-sheet'
    | 'income-statement'
    | 'financial-ratio'
    | 'fcf'
    | 'cash-flow-statement'
    | 'fixed-asset'
  /** The full list of years shown in the raw-value columns. */
  years: number[]
  /** Excel column letter per year for the values block. */
  columns: Record<number, string>
  /**
   * Subset of years that also have common-size columns, mapped to their
   * Excel column letters. Typically years.slice(1).
   */
  commonSizeColumns?: Record<number, string>
  /** Subset of years with growth columns, mapped to Excel column letters. */
  growthColumns?: Record<number, string>
  /**
   * Excel row that holds the Total Assets / denominator line for common-size.
   * Only used when commonSize is derived via the calc engine rather than
   * read directly from a fixture cell.
   */
  totalAssetsRow?: number
  /** Ordered list of rows to render. */
  rows: ManifestRow[]
  /** Optional disclaimer shown in the table caption (seed data marker). */
  disclaimer?: string
}

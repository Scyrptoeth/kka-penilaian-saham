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
 *   - optionally declares a `derivations` array — a list of declarative
 *     primitives (commonSize, marginVsAnchor, yoyGrowth) that are
 *     interpreted by `buildRowsFromManifest` to produce common-size and
 *     growth column groups. Pages never need sheet-specific helpers.
 *
 * The builder in `./build.ts` takes a manifest + a loaded cell map and
 * produces `FinancialRow[]` ready for <FinancialTable>.
 */

import type { YearKeyedSeries } from '@/types/financial'

export type RowType =
  | 'normal'
  | 'subtotal'
  | 'total'
  | 'header'
  | 'separator'
  | 'cross-ref'
  | 'add-button'

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
  /**
   * Formatting mode for the values column of this row. Defaults to 'idr'.
   * Use 'percent' for rows like margins and ratios that are stored as
   * fractions, 'ratio' for dimensionless multiples like Current Ratio.
   */
  valueKind?: 'idr' | 'percent' | 'ratio'
  /** Optional formula descriptions for tooltip layer. */
  formula?: ManifestFormulaDescriptions
  /**
   * Excel rows this row aggregates. Only meaningful for `subtotal` and
   * `total` rows rendered in live data-entry mode — the RowInputGrid reads
   * this to show computed values without letting the user overtype them.
   *
   * Seed mode ignores this entirely (the fixture holds Excel's own
   * computed values). Declaring aggregation as data in the manifest keeps
   * the input form fully manifest-driven and avoids sheet-specific sum
   * helpers in page files.
   *
   *   // row 16 = sum of current-asset leaves
   *   computedFrom: [8, 9, 10, 11, 12, 13, 14]
   *
   *   // row 25 can reference a prior subtotal + an additional leaf
   *   computedFrom: [22, 24]
   */
  computedFrom?: readonly number[]
  /** For 'add-button' rows: which BS section this button adds accounts to. */
  section?: import('@/data/catalogs/balance-sheet-catalog').BsSection
  /** For 'add-button' rows: button label text. */
  buttonLabel?: string
  /** For 'normal' leaf rows: catalog ID for remove functionality. */
  catalogId?: string
}

/**
 * Derived column-groups keyed by Excel row number. Shape matches
 * `DerivedColumnMap` in `./build.ts` — kept inline here to avoid a
 * circular import between types.ts and build.ts.
 */
export interface ManifestDerivedColumnMap {
  commonSize?: Record<number, YearKeyedSeries>
  growth?: Record<number, YearKeyedSeries>
}

/* ────────────────────────── Declarative derivations ─────────────────────
 *
 * `derivations: DerivationSpec[]` on a manifest replaces hand-written
 * sheet-specific derive functions. The builder interprets each spec using
 * generic primitives (ratioOfBase, yoyChangeSafe) so adding a new sheet
 * becomes pure data authoring — zero new code.
 *
 * Current primitives (add more only when a real sheet needs them — YAGNI):
 *   • commonSize        — ratio of each row against a denominator row
 *                         (e.g. Total Assets for Balance Sheet)
 *   • marginVsAnchor    — ratio of each row against an anchor row
 *                         (e.g. Revenue for Income Statement)
 *   • yoyGrowth         — year-over-year growth, IFERROR-safe by default
 */

/** Ratio of each row / denominator row for derived years. */
export interface CommonSizeDeriveSpec {
  type: 'commonSize'
  /**
   * Excel row of the denominator. Falls back to `manifest.totalAssetsRow`
   * if omitted — Balance Sheet convention uses row 27 (TOTAL ASSETS).
   */
  denominatorRow?: number
}

/** Margin-style ratio of each row / anchor row for derived years. */
export interface MarginVsAnchorDeriveSpec {
  type: 'marginVsAnchor'
  /**
   * Excel row of the anchor line. Falls back to `manifest.anchorRow`
   * if omitted — Income Statement convention uses row 6 (Revenue).
   */
  anchorRow?: number
}

/** Year-over-year growth for the values series of each row. */
export interface YoyGrowthDeriveSpec {
  type: 'yoyGrowth'
  /**
   * If true (default), use the IFERROR-safe variant that returns 0 when
   * the previous-year value is zero. Set false to allow the raw variant.
   */
  safe?: boolean
}

export type DerivationSpec =
  | CommonSizeDeriveSpec
  | MarginVsAnchorDeriveSpec
  | YoyGrowthDeriveSpec

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
    | 'noplat'
    | 'growth-revenue'
    | 'roic'
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
   * read directly from a fixture cell. Balance Sheet: row 27.
   */
  totalAssetsRow?: number
  /**
   * Excel row that holds the anchor line for sheet-specific derivations —
   * e.g. Income Statement's Revenue (row 6) is the denominator for margin
   * calculations. Prefer this over hardcoding row numbers in page files.
   */
  anchorRow?: number
  /** Ordered list of rows to render. */
  rows: ManifestRow[]
  /** Optional disclaimer shown in the table caption (seed data marker). */
  disclaimer?: string
  /**
   * Number of historical years this sheet covers in live mode.
   *
   * Seed mode reads `years` directly from the manifest (hard-coded to the
   * prototype workbook's 2018–2021 or 2019–2021 window). Live mode derives
   * the window from `tahunTransaksi − historicalYearCount..tahunTransaksi − 1`
   * via `computeHistoricalYears`, so the same manifest can render any
   * 3- or 4-year run the user asks for.
   *
   *   4 → BS / IS (four historical years in the source workbook)
   *   3 → CFS / FA / FR / FCF / NOPLAT / Growth / ROIC
   */
  historicalYearCount?: number
  /**
   * Declarative derivation specs. Each entry produces either a common-size
   * or growth column-group via the generic primitives in `./build.ts`.
   * Interpret order does not matter.
   *
   *   derivations: [
   *     { type: 'commonSize', denominatorRow: 27 },
   *     { type: 'yoyGrowth', safe: true },
   *   ]
   */
  derivations?: DerivationSpec[]
}

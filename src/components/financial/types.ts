/**
 * Public types for <FinancialTable>. Kept in a dedicated file so both the
 * server-side builder (src/data/manifests/build.ts) and the client tooltip
 * island can import without pulling the component tree.
 */

import type { YearKeyedSeries } from '@/types/financial'
import type { RowType } from '@/data/manifests/types'

/**
 * Per-cell formula metadata attached to a row-group (values/commonSize/growth).
 * The description is shared across all years in that group; the raw Excel
 * formula string is per year, auto-pulled from the fixture by the builder.
 */
export interface FormulaMeta {
  description: string
  excelByYear?: Record<number, string>
}

/** How the values-column should be formatted per row. */
export type ValueKind = 'idr' | 'percent' | 'ratio'

export interface FinancialRow {
  /** Row label shown in the first (sticky) column. */
  label: string
  /** Raw value per year. Always present — use empty object for separator/header. */
  values: YearKeyedSeries
  /** Formatting mode for the values column. Defaults to 'idr'. */
  valueKind?: ValueKind
  /** Indent level, 0 = parent (default), 1 = child, 2 = grandchild. */
  indent?: 0 | 1 | 2
  /** Visual treatment — mirrors manifest RowType. */
  type?: RowType
  /** Optional common-size ratio per year (as a fraction, not a percent). */
  commonSize?: YearKeyedSeries
  /** Optional year-over-year growth ratio per year. */
  growth?: YearKeyedSeries
  /** Optional formula metadata per column group, for the tooltip layer. */
  formula?: {
    values?: FormulaMeta
    commonSize?: FormulaMeta
    growth?: FormulaMeta
  }
}

export interface FinancialTableProps {
  /** Caption heading shown above the table. */
  title: string
  /** Full year list for the raw-value columns, ascending. */
  years: number[]
  /** Pre-built rows, typically produced by buildRowsFromManifest. */
  rows: FinancialRow[]
  /** Render common-size columns when true. */
  showCommonSize?: boolean
  /** Render growth columns when true. */
  showGrowth?: boolean
  /**
   * Render a flat "Average" column at the end of the value-columns group.
   * Uses per-row `valueKind` so ratio rows display as e.g. 0.38, percent
   * rows as e.g. 38,8 %, IDR rows as Rupiah. Hidden when years.length < 2.
   */
  showValueAverage?: boolean
  /**
   * Render an "Average" sub-column at the end of the Common Size group.
   * Hidden when commonSizeYears.length < 2.
   */
  showCommonSizeAverage?: boolean
  /**
   * Render an "Average" sub-column at the end of the Growth YoY group.
   * Hidden when growthYears.length < 1 or years.length < 2.
   */
  showGrowthAverage?: boolean
  /** Currency code shown in the caption, default "IDR". */
  currency?: string
  /** Optional disclaimer shown below the title. */
  disclaimer?: string
}

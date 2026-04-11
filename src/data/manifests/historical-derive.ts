/**
 * Helpers that wrap the Phase 1 Balance Sheet / Income Statement calc
 * engine for use on the Historis pages. These bridge the legacy
 * {@link YearlySeries} 4-year shape into the year-keyed shape that
 * <FinancialTable> expects.
 */

import type { YearKeyedSeries } from '@/types/financial'
import type {
  CommonSizeAnalysis,
  GrowthAnalysis,
} from '@/lib/calculations/balance-sheet'
import {
  commonSizeBalanceSheet,
  growthBalanceSheet,
} from '@/lib/calculations/balance-sheet'
import { yoyChangeSafe, type YearlySeries } from '@/lib/calculations/helpers'
import { type CellMap, numOpt } from '@/data/seed/loader'
import type { DerivedColumnMap } from './build'
import type { SheetManifest } from './types'

/**
 * Reads the 4-year {@link YearlySeries} for a given Excel row from the
 * manifest's column map. Missing cells default to 0 — mirrors Excel where
 * blank cells participate in arithmetic as zero.
 */
export function readYearlySeries(
  cells: CellMap,
  manifest: SheetManifest,
  excelRow: number,
): YearlySeries {
  const y0Col = manifest.columns[manifest.years[0]]
  const y1Col = manifest.columns[manifest.years[1]]
  const y2Col = manifest.columns[manifest.years[2]]
  const y3Col = manifest.columns[manifest.years[3]]
  return {
    y0: numOpt(cells, `${y0Col}${excelRow}`) ?? 0,
    y1: numOpt(cells, `${y1Col}${excelRow}`) ?? 0,
    y2: numOpt(cells, `${y2Col}${excelRow}`) ?? 0,
    y3: numOpt(cells, `${y3Col}${excelRow}`) ?? 0,
  }
}

function commonSizeToSeries(
  manifest: SheetManifest,
  cs: CommonSizeAnalysis,
): YearKeyedSeries {
  // commonSizeBalanceSheet yields values for years y1..y3 — the last three.
  const [, y1, y2, y3] = manifest.years
  return { [y1]: cs.y1, [y2]: cs.y2, [y3]: cs.y3 }
}

function growthToSeries(
  manifest: SheetManifest,
  g: GrowthAnalysis,
): YearKeyedSeries {
  // growthBalanceSheet yields 3 YoY deltas, keyed to years[1..3].
  const [, y1, y2, y3] = manifest.years
  return { [y1]: g.y0toY1, [y2]: g.y1toY2, [y3]: g.y2toY3 }
}

/**
 * Build the full {@link DerivedColumnMap} for the Balance Sheet manifest:
 * for every row that carries an Excel row number, compute common-size
 * (line / TOTAL ASSETS) and YoY growth via the calc engine.
 */
export function deriveBalanceSheetColumns(
  cells: CellMap,
  manifest: SheetManifest,
): DerivedColumnMap {
  if (manifest.totalAssetsRow === undefined) {
    throw new Error(
      'deriveBalanceSheetColumns: manifest.totalAssetsRow is required',
    )
  }
  const totalAssets = readYearlySeries(cells, manifest, manifest.totalAssetsRow)
  const commonSize: Record<number, YearKeyedSeries> = {}
  const growth: Record<number, YearKeyedSeries> = {}
  for (const row of manifest.rows) {
    if (row.excelRow === undefined) continue
    const line = readYearlySeries(cells, manifest, row.excelRow)
    commonSize[row.excelRow] = commonSizeToSeries(
      manifest,
      commonSizeBalanceSheet(line, totalAssets),
    )
    growth[row.excelRow] = growthToSeries(
      manifest,
      growthBalanceSheet(line),
    )
  }
  return { commonSize, growth }
}

/**
 * Derive the common-size column for Income Statement (margin = line / revenue)
 * and the YoY growth column. Revenue row is declared via `manifest.anchorRow`.
 */
export function deriveIncomeStatementColumns(
  cells: CellMap,
  manifest: SheetManifest,
): DerivedColumnMap {
  if (manifest.anchorRow === undefined) {
    throw new Error(
      'deriveIncomeStatementColumns: manifest.anchorRow is required (revenue row)',
    )
  }
  const revenue = readYearlySeries(cells, manifest, manifest.anchorRow)
  const commonSize: Record<number, YearKeyedSeries> = {}
  const growth: Record<number, YearKeyedSeries> = {}
  const [, y1, y2, y3] = manifest.years

  for (const row of manifest.rows) {
    if (row.excelRow === undefined) continue
    const line = readYearlySeries(cells, manifest, row.excelRow)

    // Margin = line / revenue for each year (skip baseline year to match
    // commonSizeColumns which start at y1).
    commonSize[row.excelRow] = {
      [y1]: revenue.y1 === 0 ? 0 : line.y1 / revenue.y1,
      [y2]: revenue.y2 === 0 ? 0 : line.y2 / revenue.y2,
      [y3]: revenue.y3 === 0 ? 0 : line.y3 / revenue.y3,
    }

    // Use IFERROR-safe growth for non-revenue lines that can legally be zero.
    growth[row.excelRow] = {
      [y1]: yoyChangeSafe(line.y1, line.y0),
      [y2]: yoyChangeSafe(line.y2, line.y1),
      [y3]: yoyChangeSafe(line.y3, line.y2),
    }
  }
  return { commonSize, growth }
}

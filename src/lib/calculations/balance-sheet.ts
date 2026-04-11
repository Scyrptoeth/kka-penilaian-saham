/**
 * Balance Sheet calculations.
 *
 * Mirrors formulas from the `BALANCE SHEET` worksheet in kka-penilaian-saham.xlsx.
 *
 * Two analyses on historical 4-year data:
 * 1. Common Size (vertical) — row / total assets for that same year.
 *    Excel example:  H8 = D8/D$27
 * 2. Growth Rate (horizontal, YoY) with IFERROR — (current-prior)/prior.
 *    Excel example:  N8 = IFERROR((D8-C8)/C8, 0)
 */

import { average, ratioOfBase, yoyChangeSafe, type YearlySeries } from './helpers'

export interface CommonSizeAnalysis {
  y1: number
  y2: number
  y3: number
  avg: number
}

export interface GrowthAnalysis {
  y0toY1: number
  y1toY2: number
  y2toY3: number
  avg: number
}

/**
 * Three years of common-size ratios + their average. The workbook computes
 * common size only for years y1..y3 (D,E,F columns), skipping the baseline year.
 *
 * Mirrors columns H..K of BALANCE SHEET for a given row:
 *   H = rowValue_y1 / totalAssets_y1
 *   I = rowValue_y2 / totalAssets_y2
 *   J = rowValue_y3 / totalAssets_y3
 *   K = AVERAGE(H:J)
 */
export function commonSizeBalanceSheet(
  line: YearlySeries,
  totalAssets: YearlySeries,
): CommonSizeAnalysis {
  const y1 = ratioOfBase(line.y1, totalAssets.y1)
  const y2 = ratioOfBase(line.y2, totalAssets.y2)
  const y3 = ratioOfBase(line.y3, totalAssets.y3)
  return { y1, y2, y3, avg: average([y1, y2, y3]) }
}

/**
 * Year-over-year growth with IFERROR=0 fallback, plus the average.
 *
 * Mirrors columns N..Q of BALANCE SHEET for a given row:
 *   N = IFERROR((D-C)/C, 0)
 *   O = IFERROR((E-D)/D, 0)
 *   P = IFERROR((F-E)/E, 0)
 *   Q = AVERAGE(N:P)
 */
export function growthBalanceSheet(line: YearlySeries): GrowthAnalysis {
  const y0toY1 = yoyChangeSafe(line.y1, line.y0)
  const y1toY2 = yoyChangeSafe(line.y2, line.y1)
  const y2toY3 = yoyChangeSafe(line.y3, line.y2)
  return { y0toY1, y1toY2, y2toY3, avg: average([y0toY1, y1toY2, y2toY3]) }
}

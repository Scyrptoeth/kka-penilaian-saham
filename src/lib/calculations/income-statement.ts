/**
 * Income Statement calculations.
 *
 * Mirrors formulas from the `INCOME STATEMENT` worksheet in kka-penilaian-saham.xlsx.
 *
 * In this workbook, the columns labeled "COMMON SIZE" (H..J) on Income Statement
 * actually compute **year-over-year growth** — the formula is (current-prior)/prior,
 * not value/revenue. We preserve Excel's actual behavior rather than the label.
 *
 *   H6 = (D6-C6)/C6   -> y0→y1 growth
 *   I6 = (E6-D6)/D6   -> y1→y2 growth
 *   J6 = (F6-E6)/E6   -> y2→y3 growth
 *   K6 = AVERAGE(H6:J6)
 *
 * Separately, `marginRatio` implements a traditional margin = line / revenue.
 */

import { average, ratioOfBase, yoyChange, type YearlySeries } from './helpers'

export interface YoySeries {
  y0toY1: number
  y1toY2: number
  y2toY3: number
  avg: number
}

/**
 * Year-over-year growth for a 4-year line. Matches the H..K "COMMON SIZE" columns
 * in the Income Statement sheet (non-IFERROR variant — revenue is never 0).
 */
export function yoyGrowthIncomeStatement(line: YearlySeries): YoySeries {
  const y0toY1 = yoyChange(line.y1, line.y0)
  const y1toY2 = yoyChange(line.y2, line.y1)
  const y2toY3 = yoyChange(line.y3, line.y2)
  return { y0toY1, y1toY2, y2toY3, avg: average([y0toY1, y1toY2, y2toY3]) }
}

/**
 * Margin ratio: line / revenue. Used for gross margin, operating margin, net margin, etc.
 * Safe against zero revenue (returns 0, matching IFERROR pattern).
 */
export function marginRatio(line: number, revenue: number): number {
  return ratioOfBase(line, revenue)
}

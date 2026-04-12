/**
 * PROY LR (Projected Income Statement) live compute adapter.
 *
 * Projects P&L from KEY DRIVERS assumptions + IS historical + PROY FA depreciation.
 *
 * Row mapping (matching proy-lr.json fixture):
 *   8:  Revenue = prev * (1 + revenueGrowth)
 *   9:  Revenue Growth (display only)
 *   10: COGS = Revenue * (-cogsRatio)            [ROUNDUP to 3 decimals]
 *   11: Gross Profit = Revenue + COGS
 *   12: GP Margin (display only)
 *   15: Selling/Others = Revenue * (-sellingRatio)
 *   16: G&A = Revenue * (-gaRatio)
 *   17: Total OpEx = Selling + G&A
 *   19: EBITDA = Gross Profit + OpEx
 *   20: EBITDA Margin (display only)
 *   22: Depreciation = -PROY_FA row 51 (total depreciation additions)
 *   25: EBIT = EBITDA + Depreciation
 *   26: EBIT Margin (display only)
 *   29: Interest Income = prev * (1 + IS!K26 growth)
 *   31: Interest Expense = prev * (1 + IS!K27 growth)
 *   33: Other Income Total = Interest Income + Interest Expense
 *   34: Non-Operating Income = prev * (1 + IS!K30 growth)
 *   36: PBT = EBIT + Other Income + Non-Op Income
 *   37: Tax = PBT * (-taxRate)
 *   39: Net Profit = PBT + Tax
 *   40: NPM (display only)
 *
 * Sign convention: KEY DRIVERS store ratios are POSITIVE.
 * This adapter negates them for costs: Revenue * ratio * -1.
 * ROUNDUP(..., 3) applied to COGS per Excel formula.
 */

import type { YearKeyedSeries } from '@/types/financial'
import type { KeyDriversState } from '@/lib/store/useKkaStore'

/** Excel ROUNDUP(value, 3) — round away from zero to 3 decimal places. */
function roundUp3(value: number): number {
  if (value >= 0) {
    return Math.ceil(value * 1000) / 1000
  }
  return Math.floor(value * 1000) / 1000
}

export interface ProyLrInput {
  /** KEY DRIVERS store (positive ratios) */
  keyDrivers: KeyDriversState
  /** IS revenue growth = IS!K6 */
  revenueGrowth: number
  /** IS interest income growth = IS!K26 */
  interestIncomeGrowth: number
  /** IS interest expense growth = IS!K27 */
  interestExpenseGrowth: number
  /** IS non-operating income growth = IS!K30 */
  nonOpIncomeGrowth: number
  /** Last historical year IS values (for column C seeding) */
  isLastYear: {
    revenue: number       // IS F6
    cogs: number          // IS F7
    grossProfit: number   // IS F8
    sellingOpex: number   // IS F12
    gaOpex: number        // IS F13
    depreciation: number  // FA E51 * -1
    interestIncome: number // IS F26
    interestExpense: number // IS F27
    nonOpIncome: number   // IS F30
    tax: number           // IS F33
  }
  /** PROY FA depreciation additions total per projection year (row 51) */
  proyFaDepreciation: YearKeyedSeries
}

export function computeProyLrLive(
  input: ProyLrInput,
  histYear: number,
  projYears: readonly number[],
): Record<number, YearKeyedSeries> {
  const out: Record<number, YearKeyedSeries> = {}
  const set = (row: number, year: number, value: number) => {
    if (!out[row]) out[row] = {}
    out[row][year] = value
  }

  const kd = input.keyDrivers
  const taxRate = kd.financialDrivers.corporateTaxRate

  // --- Column C (historical) ---
  const h = input.isLastYear
  set(8, histYear, h.revenue)
  set(10, histYear, h.cogs)
  set(11, histYear, h.grossProfit)
  set(15, histYear, h.sellingOpex)
  set(16, histYear, h.gaOpex)
  const histOpex = h.sellingOpex + h.gaOpex
  set(17, histYear, histOpex)
  const histEbitda = h.grossProfit + histOpex
  set(19, histYear, histEbitda)
  set(22, histYear, h.depreciation)
  const histEbit = histEbitda + h.depreciation
  set(25, histYear, histEbit)
  set(29, histYear, h.interestIncome)
  set(31, histYear, h.interestExpense)
  set(33, histYear, h.interestIncome + h.interestExpense)
  set(34, histYear, h.nonOpIncome)
  const histPbt = histEbit + (h.interestIncome + h.interestExpense) + h.nonOpIncome
  set(36, histYear, histPbt)
  set(37, histYear, h.tax)
  set(39, histYear, histPbt + h.tax)

  // Margin rows for historical
  if (h.revenue !== 0) {
    set(9, histYear, input.revenueGrowth)
    set(12, histYear, h.grossProfit / h.revenue)
    set(20, histYear, histEbitda / h.revenue)
    set(26, histYear, histEbit / h.revenue)
    set(40, histYear, (histPbt + h.tax) / h.revenue)
  }

  // --- Projected columns ---
  const allYears = [histYear, ...projYears]
  for (let yi = 0; yi < projYears.length; yi++) {
    const year = projYears[yi]
    const prevYear = allYears[yi]

    // Revenue = prev * (1 + revenueGrowth)
    const prevRevenue = out[8]?.[prevYear] ?? 0
    const revenue = prevRevenue * (1 + input.revenueGrowth)
    set(8, year, revenue)
    set(9, year, revenue !== 0 && prevRevenue !== 0 ? (revenue - prevRevenue) / prevRevenue : 0)

    // COGS = Revenue * (-cogsRatio), ROUNDUP to 3 decimals
    const cogs = roundUp3(-kd.operationalDrivers.cogsRatio * revenue)
    set(10, year, cogs)

    // Gross Profit
    const gp = revenue + cogs
    set(11, year, gp)
    set(12, year, revenue !== 0 ? gp / revenue : 0)

    // Selling/Others OpEx = Revenue * (-sellingRatio)
    const selling = revenue * (-kd.operationalDrivers.sellingExpenseRatio)
    set(15, year, selling)

    // G&A = Revenue * (-gaRatio)
    const ga = revenue * (-kd.operationalDrivers.gaExpenseRatio)
    set(16, year, ga)

    // Total OpEx
    const opex = selling + ga
    set(17, year, opex)

    // EBITDA
    const ebitda = gp + opex
    set(19, year, ebitda)
    set(20, year, revenue !== 0 ? ebitda / revenue : 0)

    // Depreciation = PROY FA row 51 * -1
    const depr = -(input.proyFaDepreciation[year] ?? 0)
    set(22, year, depr)

    // EBIT
    const ebit = ebitda + depr
    set(25, year, ebit)
    set(26, year, revenue !== 0 ? ebit / revenue : 0)

    // Interest Income = prev * (1 + growth)
    const prevII = out[29]?.[prevYear] ?? 0
    const intIncome = prevII * (1 + input.interestIncomeGrowth)
    set(29, year, intIncome)

    // Interest Expense = prev * (1 + growth)
    const prevIE = out[31]?.[prevYear] ?? 0
    const intExpense = prevIE * (1 + input.interestExpenseGrowth)
    set(31, year, intExpense)

    // Other Income Total
    set(33, year, intIncome + intExpense)

    // Non-Operating Income
    const prevNonOp = out[34]?.[prevYear] ?? 0
    const nonOp = prevNonOp * (1 + input.nonOpIncomeGrowth)
    set(34, year, nonOp)

    // PBT
    const pbt = ebit + (intIncome + intExpense) + nonOp
    set(36, year, pbt)

    // Tax = PBT * taxRate * -1
    const tax = taxRate * pbt * -1
    set(37, year, tax)

    // Net Profit
    const np = pbt + tax
    set(39, year, np)
    set(40, year, revenue !== 0 ? np / revenue : 0)
  }

  return out
}

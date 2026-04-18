/**
 * PROY LR (Projected Income Statement) live compute adapter.
 *
 * Session 049 refactor: all projection drivers for COGS / OpEx / Interest
 * Income / Interest Expense / Non-Op Income now use `Revenue × average
 * historical common size` — a single uniform pattern. Previously COGS used
 * `Key Drivers cogsRatio + ROUNDUP(3)`, OpEx was Selling+G&A split via two
 * KD ratios, and II/IE/NOI used `prev × (1 + avg YoY growth)`. The new
 * pattern is driver-transparent (UI shows the same value that drives
 * compute) and eliminates 2 dead KD ratios from the LR chain.
 *
 * Row mapping:
 *   8:  Revenue = prev * (1 + revenueGrowth)
 *   9:  Revenue Growth (display only, returned for UI info)
 *   10: COGS = Revenue * commonSize.cogs
 *   11: Gross Profit = Revenue + COGS
 *   12: GP Margin (display only)
 *   15: [DROPPED — Selling/Others OpEx removed in Session 049]
 *   16: [DROPPED — General & Admin removed in Session 049]
 *   17: Total OpEx = Revenue * commonSize.totalOpEx
 *       (historical column = isLastYear.totalOpEx from IS!15 sentinel)
 *   19: EBITDA = Gross Profit + Total OpEx
 *   20: EBITDA Margin (display only)
 *   22: Depreciation = -PROY FA row 51 (total depreciation additions)
 *   25: EBIT = EBITDA + Depreciation
 *   26: EBIT Margin (display only)
 *   29: Interest Income = Revenue * commonSize.interestIncome
 *   31: Interest Expense = Revenue * commonSize.interestExpense
 *   33: Other Income Total = Interest Income + Interest Expense
 *   34: Non-Operating Income = Revenue * commonSize.nonOpIncome
 *   36: PBT = EBIT + Other Income + Non-Op Income
 *   37: Tax = -taxRate * PBT
 *   39: Net Profit = PBT + Tax
 *   40: NPM (display only)
 *
 * Sign convention (LESSON-055): Expenses stored negative in IS. Common size
 * of a negative expense / positive revenue = negative ratio. Projection
 * revenue × negative ratio = negative expense — consistent with IS plain
 * addition convention.
 */

import type { YearKeyedSeries } from '@/types/financial'
import type { KeyDriversState } from '@/lib/store/useKkaStore'

/**
 * PROY LR semantic row constants — re-exported so consumers (Dashboard,
 * DCF breakdown, RESUME page) reference names instead of raw integers
 * that drift silently when the projection model evolves.
 *
 * Session 049: SELLING and GA constants removed as these rows no longer
 * exist in the projection output.
 */
export const PROY_LR_ROW = {
  REVENUE: 8,
  REVENUE_GROWTH: 9,
  COGS: 10,
  GROSS_PROFIT: 11,
  TOTAL_OPEX: 17,
  EBITDA: 19,
  DEPRECIATION: 22,
  EBIT: 25,
  INTEREST_INCOME: 29,
  INTEREST_EXPENSE: 31,
  OTHER_INCOME_TOTAL: 33,
  NON_OP_INCOME: 34,
  PBT: 36,
  TAX: 37,
  NET_PROFIT: 39,
  NPM: 40,
} as const

/**
 * Common-size projection drivers. Each value is the average historical
 * ratio of the named IS row to Revenue (IS!6). Signs are preserved from
 * source data — expenses negative in IS produce negative common size
 * values here, which propagate naturally to negative projected expenses.
 */
export interface ProyLrCommonSize {
  /** avg (IS.7 / IS.6) historical — typically negative (COGS stored negative) */
  cogs: number
  /** avg (IS.15 / IS.6) historical — typically negative (OpEx stored negative) */
  totalOpEx: number
  /** avg (IS.26 / IS.6) historical — typically positive */
  interestIncome: number
  /** avg (IS.27 / IS.6) historical — typically negative */
  interestExpense: number
  /** avg (IS.30 / IS.6) historical — sign varies */
  nonOpIncome: number
}

export interface ProyLrInput {
  /** KEY DRIVERS store — only `corporateTaxRate` is consumed here. */
  keyDrivers: KeyDriversState
  /** IS revenue historical avg YoY growth. Revenue[t] = Revenue[t-1] × (1 + this). */
  revenueGrowth: number
  /** Common-size avg ratios (historical) that drive projected leaves. */
  commonSize: ProyLrCommonSize
  /** Last historical year IS values (for column C seeding). */
  isLastYear: {
    revenue: number          // IS F6
    cogs: number             // IS F7
    grossProfit: number      // IS F8
    totalOpEx: number        // IS F15 (sentinel row, dynamic subtotal)
    depreciation: number     // FA last hist year × -1
    interestIncome: number   // IS F26
    interestExpense: number  // IS F27
    nonOpIncome: number      // IS F30
    tax: number              // IS F33
  }
  /** PROY FA depreciation additions total per projection year (row 51). */
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
  const cs = input.commonSize

  // --- Column C (historical) ---
  const h = input.isLastYear
  set(PROY_LR_ROW.REVENUE, histYear, h.revenue)
  set(PROY_LR_ROW.COGS, histYear, h.cogs)
  set(PROY_LR_ROW.GROSS_PROFIT, histYear, h.grossProfit)
  set(PROY_LR_ROW.TOTAL_OPEX, histYear, h.totalOpEx)
  const histEbitda = h.grossProfit + h.totalOpEx
  set(PROY_LR_ROW.EBITDA, histYear, histEbitda)
  set(PROY_LR_ROW.DEPRECIATION, histYear, h.depreciation)
  const histEbit = histEbitda + h.depreciation
  set(PROY_LR_ROW.EBIT, histYear, histEbit)
  set(PROY_LR_ROW.INTEREST_INCOME, histYear, h.interestIncome)
  set(PROY_LR_ROW.INTEREST_EXPENSE, histYear, h.interestExpense)
  set(PROY_LR_ROW.OTHER_INCOME_TOTAL, histYear, h.interestIncome + h.interestExpense)
  set(PROY_LR_ROW.NON_OP_INCOME, histYear, h.nonOpIncome)
  const histPbt = histEbit + (h.interestIncome + h.interestExpense) + h.nonOpIncome
  set(PROY_LR_ROW.PBT, histYear, histPbt)
  set(PROY_LR_ROW.TAX, histYear, h.tax)
  set(PROY_LR_ROW.NET_PROFIT, histYear, histPbt + h.tax)

  // Margin + growth display rows at historical column
  if (h.revenue !== 0) {
    set(PROY_LR_ROW.REVENUE_GROWTH, histYear, input.revenueGrowth)
    set(12, histYear, h.grossProfit / h.revenue) // GP Margin
    set(20, histYear, histEbitda / h.revenue)    // EBITDA Margin
    set(26, histYear, histEbit / h.revenue)      // EBIT Margin
    set(PROY_LR_ROW.NPM, histYear, (histPbt + h.tax) / h.revenue)
  }

  // --- Projected columns ---
  const allYears = [histYear, ...projYears]
  for (let yi = 0; yi < projYears.length; yi++) {
    const year = projYears[yi]
    const prevYear = allYears[yi]

    // Revenue = prev × (1 + revenueGrowth)
    const prevRevenue = out[PROY_LR_ROW.REVENUE]?.[prevYear] ?? 0
    const revenue = prevRevenue * (1 + input.revenueGrowth)
    set(PROY_LR_ROW.REVENUE, year, revenue)
    set(
      PROY_LR_ROW.REVENUE_GROWTH,
      year,
      revenue !== 0 && prevRevenue !== 0 ? (revenue - prevRevenue) / prevRevenue : 0,
    )

    // COGS = Revenue × commonSize.cogs (no ROUNDUP; sign via negative cs)
    const cogs = revenue * cs.cogs
    set(PROY_LR_ROW.COGS, year, cogs)

    // Gross Profit
    const gp = revenue + cogs
    set(PROY_LR_ROW.GROSS_PROFIT, year, gp)
    set(12, year, revenue !== 0 ? gp / revenue : 0)

    // Total OpEx = Revenue × commonSize.totalOpEx
    const opex = revenue * cs.totalOpEx
    set(PROY_LR_ROW.TOTAL_OPEX, year, opex)

    // EBITDA
    const ebitda = gp + opex
    set(PROY_LR_ROW.EBITDA, year, ebitda)
    set(20, year, revenue !== 0 ? ebitda / revenue : 0)

    // Depreciation = PROY FA row 51 × -1
    const depr = -(input.proyFaDepreciation[year] ?? 0)
    set(PROY_LR_ROW.DEPRECIATION, year, depr)

    // EBIT
    const ebit = ebitda + depr
    set(PROY_LR_ROW.EBIT, year, ebit)
    set(26, year, revenue !== 0 ? ebit / revenue : 0)

    // Interest Income / Expense / Non-Op Income — all common-size driven
    const intIncome = revenue * cs.interestIncome
    set(PROY_LR_ROW.INTEREST_INCOME, year, intIncome)

    const intExpense = revenue * cs.interestExpense
    set(PROY_LR_ROW.INTEREST_EXPENSE, year, intExpense)

    set(PROY_LR_ROW.OTHER_INCOME_TOTAL, year, intIncome + intExpense)

    const nonOp = revenue * cs.nonOpIncome
    set(PROY_LR_ROW.NON_OP_INCOME, year, nonOp)

    // PBT = EBIT + Other Income + Non-Op
    const pbt = ebit + (intIncome + intExpense) + nonOp
    set(PROY_LR_ROW.PBT, year, pbt)

    // Tax = -taxRate × PBT
    const tax = -taxRate * pbt
    set(PROY_LR_ROW.TAX, year, tax)

    // Net Profit
    const np = pbt + tax
    set(PROY_LR_ROW.NET_PROFIT, year, np)
    set(PROY_LR_ROW.NPM, year, revenue !== 0 ? np / revenue : 0)
  }

  return out
}

/**
 * PROY BALANCE SHEET — Projected Balance Sheet computation.
 *
 * Row mapping (matching proy-balance-sheet.json fixture):
 *
 * CURRENT ASSETS:
 *   9: Cash on Hands            10: growth
 *  11: Cash in Banks (literal 0) 12: growth
 *  13: Account Receivable        14: growth  [minus arAdjustments]
 *  15: Other Receivable           16: growth
 *  17: Inventory                  18: growth
 *  19: Others                     20: growth
 *  21: Total Current Assets = 9+11+13+15+17+19
 *
 * NON-CURRENT ASSETS:
 *  25: FA Beginning = PROY FA row 32 (Total Ending)
 *  26: Accum Dep   = PROY FA row 60 * -1
 *  27: Accum Dep Growth
 *  28: Fixed Assets Net = 25 + 26
 *  29: Other Non-Current (carry forward)
 *  30: Intangible Assets = prev * (1 + intangibleGrowth)
 *  31: Total Non-Current = 28 + 29 + 30
 *  33: TOTAL ASSETS = 21 + 31
 *
 * CURRENT LIABILITIES:
 *  37: Bank Loan-ST   38: growth
 *  39: Account Payables 40: growth
 *  41: Tax Payable      42: growth
 *  43: Others           44: growth
 *  45: Total CL = SUM(37:43) — Excel includes growth rows in this SUM
 *
 * NON-CURRENT LIABILITIES:
 *  48: Bank Loan-LT (IFERROR)  49: growth (IFERROR)
 *  50: Other NCL               51: growth
 *  52: Total NCL = 48 + 50
 *
 * EQUITY:
 *  55: Paid-Up Capital (carry forward)
 *  57: Surplus (carry forward)
 *  58: Current Profit = prev + PROY LR Net Profit
 *  59: Retained Earnings = 57 + 58
 *  60: Shareholders' Equity = 55 + 59
 *  62: Total L&E = 45 + 52 + 60
 *  63: Balance Control = 33 - 62
 *
 * Sign convention: store positive, adapter negates where needed.
 * Accum Dep (row 26) stored negative (PROY FA row 60 * -1).
 */

import type { YearKeyedSeries } from '@/types/financial'

// Re-export computeAvgGrowth from shared helpers for backward compatibility.
// Canonical location: @/lib/calculations/helpers
export { computeAvgGrowth } from '@/lib/calculations/helpers'

export interface ProyBsInput {
  /** BS last historical year values, keyed by BS manifest row number. */
  bsLastYear: Record<number, number>
  /** BS average historical growth rates, keyed by BS manifest row number (from column Q). */
  bsAvgGrowth: Record<number, number>
  /** PROY Fixed Assets computed rows (needs rows 32 and 60). */
  proyFaRows: Record<number, YearKeyedSeries>
  /** PROY LR Net Profit per projection year (row 39). */
  proyLrNetProfit: YearKeyedSeries
  /** Manual AR adjustments per year — row 64 "copas". Default empty = no adjustment. */
  arAdjustments?: YearKeyedSeries
  /** BS historical growth for intangible assets (BS Q24). */
  intangibleGrowth: number
}

/**
 * Map from PROY BS value row → BS manifest row number for seeding.
 * Current assets + liabilities rows that follow prev*(1+growth) pattern.
 */
const BS_SEED_MAP: [proyRow: number, bsRow: number][] = [
  [9, 8],    // Cash on Hands
  [11, 9],   // Cash in Banks
  [13, 10],  // Account Receivable
  [15, 11],  // Other Receivable
  [17, 12],  // Inventory
  [19, 14],  // Others (Prepaid)
  [37, 31],  // Bank Loan-ST
  [39, 32],  // Account Payables
  [41, 33],  // Tax Payable
  [43, 34],  // Others CL
  [48, 38],  // Bank Loan-LT
  [50, 39],  // Other Non-Current Liabilities
]

/** Growth row for each value row that uses prev*(1+growth) pattern. */
const GROWTH_ROW: Record<number, number> = {
  9: 10, 11: 12, 13: 14, 15: 16, 17: 18, 19: 20,
  37: 38, 39: 40, 41: 42, 43: 44,
  48: 49, 50: 51,
}

/** Rows that follow simple prev*(1+growth) projection. */
const SIMPLE_GROWTH_ROWS = [9, 15, 17, 19, 37, 39, 41, 43] as const

export function computeProyBsLive(
  input: ProyBsInput,
  histYear: number,
  projYears: readonly number[],
): Record<number, YearKeyedSeries> {
  const out: Record<number, YearKeyedSeries> = {}

  const set = (row: number, year: number, value: number) => {
    if (!out[row]) out[row] = {}
    out[row][year] = value
  }

  const get = (row: number, year: number): number => out[row]?.[year] ?? 0

  const { bsLastYear, bsAvgGrowth, proyFaRows, proyLrNetProfit, intangibleGrowth } = input
  const arAdj = input.arAdjustments ?? {}

  const bsVal = (bsRow: number) => bsLastYear[bsRow] ?? 0
  const bsGr = (bsRow: number) => bsAvgGrowth[bsRow] ?? 0

  // ── Seed historical year (Column C) ──────────────────────────

  // Value + growth rows from BS
  for (const [proyRow, bsRow] of BS_SEED_MAP) {
    set(proyRow, histYear, bsVal(bsRow))
    const gr = GROWTH_ROW[proyRow]
    if (gr !== undefined) set(gr, histYear, bsGr(bsRow))
  }

  // Non-current assets
  set(25, histYear, bsVal(20)) // FA Beginning
  set(26, histYear, bsVal(21)) // Accum Dep (already negative in BS)
  set(29, histYear, bsVal(23)) // Other Non-Current
  set(30, histYear, bsVal(24)) // Intangible Assets

  // Equity
  set(55, histYear, bsVal(43)) // Paid-Up Capital
  set(57, histYear, bsVal(46)) // Surplus
  set(58, histYear, bsVal(47)) // Current Profit

  // Historical totals
  set(21, histYear, get(9, histYear) + get(11, histYear) + get(13, histYear) + get(15, histYear) + get(17, histYear) + get(19, histYear))
  set(28, histYear, get(25, histYear) + get(26, histYear))
  set(31, histYear, get(28, histYear) + get(29, histYear) + get(30, histYear))
  set(33, histYear, get(21, histYear) + get(31, histYear))

  // Row 45: SUM(37:43) — includes growth rows 38,40,42,44
  set(45, histYear, get(37, histYear) + get(38, histYear) + get(39, histYear) + get(40, histYear) + get(41, histYear) + get(42, histYear) + get(43, histYear))
  set(52, histYear, get(48, histYear) + get(50, histYear))

  set(59, histYear, get(57, histYear) + get(58, histYear))
  set(60, histYear, get(55, histYear) + get(59, histYear))
  set(62, histYear, get(45, histYear) + get(52, histYear) + get(60, histYear))
  set(63, histYear, get(33, histYear) - get(62, histYear))

  // Historical Accum Dep Growth (row 27) — display only, doesn't affect projections
  // Approximate from Q21 avg growth if available
  set(27, histYear, bsGr(21))

  // ── Project each year (Columns D-F) ──────────────────────────

  for (const year of projYears) {
    const prev = year - 1

    // Simple growth rows: value = prev*(1+prevGrowth), growth = (new-old)/old
    for (const r of SIMPLE_GROWTH_ROWS) {
      const gr = GROWTH_ROW[r]!
      const prevVal = get(r, prev)
      const prevGrowth = get(gr, prev)
      const newVal = prevVal * (1 + prevGrowth)
      set(r, year, newVal)
      set(gr, year, prevVal !== 0 ? (newVal - prevVal) / prevVal : 0)
    }

    // Row 11: Cash in Banks = literal 0
    set(11, year, 0)
    const prevCIB = get(11, prev)
    set(12, year, prevCIB !== 0 ? (0 - prevCIB) / prevCIB : 0)

    // Row 13: Account Receivable = prev*(1+growth) - arAdjustment
    const arPrev = get(13, prev)
    const arGrPrev = get(14, prev)
    const adjustment = arAdj[year] ?? 0
    const arNew = arPrev * (1 + arGrPrev) - adjustment
    set(13, year, arNew)
    set(14, year, arPrev !== 0 ? (arNew - arPrev) / arPrev : 0)

    // Rows 48/49: Bank Loan-LT with IFERROR
    const ltPrev = get(48, prev)
    const ltGrPrev = get(49, prev)
    const ltRaw = ltPrev * (1 + ltGrPrev)
    set(48, year, isFinite(ltRaw) ? ltRaw : 0)
    const ltGr = ltPrev !== 0 ? (get(48, year) - ltPrev) / ltPrev : 0
    set(49, year, isFinite(ltGr) ? ltGr : 0)

    // Rows 50/51: Other NCL — no IFERROR in Excel but use safe pattern
    const nclPrev = get(50, prev)
    const nclGrPrev = get(51, prev)
    const nclRaw = nclPrev * (1 + nclGrPrev)
    set(50, year, isFinite(nclRaw) ? nclRaw : 0)
    const nclGr = nclPrev !== 0 ? (get(50, year) - nclPrev) / nclPrev : 0
    set(51, year, isFinite(nclGr) ? nclGr : 0)

    // Row 21: Total Current Assets
    set(21, year, get(9, year) + get(11, year) + get(13, year) + get(15, year) + get(17, year) + get(19, year))

    // Non-current assets
    set(25, year, proyFaRows[32]?.[year] ?? 0)
    set(26, year, -(proyFaRows[60]?.[year] ?? 0))
    const depPrev = get(26, prev)
    set(27, year, depPrev !== 0 ? (get(26, year) - depPrev) / depPrev : 0)
    set(28, year, get(25, year) + get(26, year))
    set(29, year, get(29, prev))
    set(30, year, get(30, prev) * (1 + intangibleGrowth))
    set(31, year, get(28, year) + get(29, year) + get(30, year))
    set(33, year, get(21, year) + get(31, year))

    // Row 45: SUM(37:43) INCLUDING growth rows
    set(45, year, get(37, year) + get(38, year) + get(39, year) + get(40, year) + get(41, year) + get(42, year) + get(43, year))
    set(52, year, get(48, year) + get(50, year))

    // Equity
    set(55, year, get(55, prev))
    set(57, year, get(57, prev))
    set(58, year, get(58, prev) + (proyLrNetProfit[year] ?? 0))
    set(59, year, get(57, year) + get(58, year))
    set(60, year, get(55, year) + get(59, year))
    set(62, year, get(45, year) + get(52, year) + get(60, year))
    set(63, year, get(33, year) - get(62, year))
  }

  return out
}


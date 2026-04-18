import { describe, expect, it } from 'vitest'
import { computeProyLrLive, type ProyLrInput } from '@/data/live/compute-proy-lr-live'
import type { KeyDriversState } from '@/lib/store/useKkaStore'

/**
 * Session 049 rewrite: compute is exact (no ROUNDUP), so we can assert at
 * 6 decimals. Fixtures are synthetic to exercise each branch of the new
 * common-size-driven compute.
 */
const PRECISION = 6

const KEY_DRIVERS: KeyDriversState = {
  financialDrivers: {
    interestRateShortTerm: 0.14,
    interestRateLongTerm: 0.12,
    bankDepositRate: 0.09,
    corporateTaxRate: 0.22,
  },
  operationalDrivers: {
    salesVolumeBase: 1_000_000,
    salesPriceBase: 100_000,
    salesVolumeIncrements: [0.05, 0.10, 0.10, 0.10, 0.10, 0.10],
    salesPriceIncrements: [0.05, 0.05, 0.05, 0.05, 0.05, 0.05],
    // Retained but unused by new compute (dead fields per user Q2).
    cogsRatio: 0.55,
    sellingExpenseRatio: 0.21,
    gaExpenseRatio: 0.12,
  },
  bsDrivers: {
    accReceivableDays: [35, 35, 35, 35, 35, 35, 35],
    inventoryDays: [50, 50, 50, 50, 50, 50, 50],
    accPayableDays: [90, 90, 90, 90, 90, 90, 90],
  },
  additionalCapex: {
    land: [0, 0, 0, 0, 0, 0, 0],
    building: [0, 0, 0, 0, 0, 0, 0],
    equipment: [1000, 1000, 1000, 1000, 1000, 1000, 1000],
    others: [500, 500, 500, 500, 500, 500, 500],
  },
}

/**
 * Synthetic input: clean round numbers so hand-verification is trivial.
 * Revenue avg YoY growth = 0.10 (10% per year).
 * Common-size averages capture the desired driver behavior.
 */
const INPUT: ProyLrInput = {
  keyDrivers: KEY_DRIVERS,
  revenueGrowth: 0.10,
  commonSize: {
    cogs: -0.60,              // COGS at 60% of Revenue (stored negative)
    totalOpEx: -0.20,         // Total OpEx at 20% of Revenue (stored negative)
    interestIncome: 0.01,     // II at 1% of Revenue
    interestExpense: -0.02,   // IE at 2% of Revenue (stored negative)
    nonOpIncome: 0.005,       // NOI at 0.5% of Revenue
  },
  isLastYear: {
    revenue: 100_000_000,
    cogs: -60_000_000,
    grossProfit: 40_000_000,
    totalOpEx: -20_000_000,  // IS!15 sentinel historical value
    depreciation: -1_000_000,
    interestIncome: 1_000_000,
    interestExpense: -2_000_000,
    nonOpIncome: 500_000,
    tax: -3_000_000,
  },
  proyFaDepreciation: {
    2022: 1_500_000,
    2023: 2_000_000,
    2024: 2_500_000,
  },
}

const HIST_YEAR = 2021
const PROJ_YEARS = [2022, 2023, 2024] as const

describe('computeProyLrLive — Session 049 common-size drivers', () => {
  const result = computeProyLrLive(INPUT, HIST_YEAR, PROJ_YEARS)

  // ── Rows 15 + 16 must be absent from output ──
  it('row 15 (old Selling/Others OpEx) is NOT in output', () => {
    expect(result[15]).toBeUndefined()
  })
  it('row 16 (old General & Admin) is NOT in output', () => {
    expect(result[16]).toBeUndefined()
  })

  // ── Historical column (2021) ──
  it('row 8 Revenue at histYear = isLastYear.revenue', () => {
    expect(result[8]?.[2021]).toBe(100_000_000)
  })
  it('row 10 COGS at histYear = isLastYear.cogs', () => {
    expect(result[10]?.[2021]).toBe(-60_000_000)
  })
  it('row 17 Total OpEx at histYear = isLastYear.totalOpEx (NEW behavior)', () => {
    expect(result[17]?.[2021]).toBe(-20_000_000)
  })
  it('row 19 EBITDA at histYear = GP + Total OpEx', () => {
    expect(result[19]?.[2021]).toBe(40_000_000 - 20_000_000)
  })
  it('row 29 Interest Income at histYear', () => {
    expect(result[29]?.[2021]).toBe(1_000_000)
  })
  it('row 31 Interest Expense at histYear', () => {
    expect(result[31]?.[2021]).toBe(-2_000_000)
  })
  it('row 33 Other Income at histYear = II + IE', () => {
    expect(result[33]?.[2021]).toBe(-1_000_000)
  })
  it('row 34 Non-Op Income at histYear', () => {
    expect(result[34]?.[2021]).toBe(500_000)
  })
  it('row 9 Revenue Growth at histYear = revenueGrowth (display info)', () => {
    expect(result[9]?.[2021]).toBe(0.10)
  })

  // ── Projected year 2022 ──
  const REV_2022 = 100_000_000 * 1.10
  it('row 8 Revenue at 2022 = prev × 1.10', () => {
    expect(result[8]?.[2022]).toBeCloseTo(REV_2022, PRECISION)
  })
  it('row 9 Revenue Growth at 2022 = 10% YoY', () => {
    expect(result[9]?.[2022]).toBeCloseTo(0.10, PRECISION)
  })
  it('row 10 COGS at 2022 = Revenue × commonSize.cogs (negative)', () => {
    expect(result[10]?.[2022]).toBeCloseTo(REV_2022 * -0.60, PRECISION)
  })
  it('row 11 Gross Profit at 2022 = Revenue + COGS', () => {
    expect(result[11]?.[2022]).toBeCloseTo(REV_2022 + REV_2022 * -0.60, PRECISION)
  })
  it('row 12 GP Margin at 2022 = 40% (revenue + cogs = 40% of revenue)', () => {
    expect(result[12]?.[2022]).toBeCloseTo(0.40, PRECISION)
  })
  it('row 17 Total OpEx at 2022 = Revenue × commonSize.totalOpEx', () => {
    expect(result[17]?.[2022]).toBeCloseTo(REV_2022 * -0.20, PRECISION)
  })
  it('row 19 EBITDA at 2022 = GP + OpEx (= Revenue × 0.20)', () => {
    expect(result[19]?.[2022]).toBeCloseTo(REV_2022 * 0.20, PRECISION)
  })
  it('row 22 Depreciation at 2022 = -1,500,000', () => {
    expect(result[22]?.[2022]).toBe(-1_500_000)
  })
  it('row 25 EBIT at 2022 = EBITDA + Depreciation', () => {
    expect(result[25]?.[2022]).toBeCloseTo(REV_2022 * 0.20 + -1_500_000, PRECISION)
  })
  it('row 29 Interest Income at 2022 = Revenue × commonSize.interestIncome', () => {
    expect(result[29]?.[2022]).toBeCloseTo(REV_2022 * 0.01, PRECISION)
  })
  it('row 31 Interest Expense at 2022 = Revenue × commonSize.interestExpense (negative)', () => {
    expect(result[31]?.[2022]).toBeCloseTo(REV_2022 * -0.02, PRECISION)
  })
  it('row 33 Other Income at 2022 = II + IE', () => {
    expect(result[33]?.[2022]).toBeCloseTo(REV_2022 * 0.01 + REV_2022 * -0.02, PRECISION)
  })
  it('row 34 Non-Op Income at 2022 = Revenue × commonSize.nonOpIncome', () => {
    expect(result[34]?.[2022]).toBeCloseTo(REV_2022 * 0.005, PRECISION)
  })

  it('row 36 PBT at 2022 = EBIT + Other Income + Non-Op Income', () => {
    const ebit = REV_2022 * 0.20 - 1_500_000
    const other = REV_2022 * (0.01 - 0.02)
    const nonop = REV_2022 * 0.005
    expect(result[36]?.[2022]).toBeCloseTo(ebit + other + nonop, PRECISION)
  })

  it('row 37 Tax at 2022 = -22% × PBT', () => {
    const ebit = REV_2022 * 0.20 - 1_500_000
    const other = REV_2022 * (0.01 - 0.02)
    const nonop = REV_2022 * 0.005
    const pbt = ebit + other + nonop
    expect(result[37]?.[2022]).toBeCloseTo(-0.22 * pbt, PRECISION)
  })

  it('row 39 Net Profit at 2022 = PBT + Tax (1 − taxRate) × PBT', () => {
    const ebit = REV_2022 * 0.20 - 1_500_000
    const other = REV_2022 * (0.01 - 0.02)
    const nonop = REV_2022 * 0.005
    const pbt = ebit + other + nonop
    expect(result[39]?.[2022]).toBeCloseTo(pbt * (1 - 0.22), PRECISION)
  })

  // ── Year chain: verify projection compounding ──
  it('row 8 Revenue at 2023 = prev × 1.10', () => {
    expect(result[8]?.[2023]).toBeCloseTo(REV_2022 * 1.10, PRECISION)
  })
  it('row 8 Revenue at 2024 = prev × 1.10', () => {
    expect(result[8]?.[2024]).toBeCloseTo(REV_2022 * 1.10 * 1.10, PRECISION)
  })

  // ── Common-size drivers consistent across all projection years ──
  it('row 17 Total OpEx at 2023 and 2024 follow the same driver', () => {
    const rev23 = REV_2022 * 1.10
    const rev24 = rev23 * 1.10
    expect(result[17]?.[2023]).toBeCloseTo(rev23 * -0.20, PRECISION)
    expect(result[17]?.[2024]).toBeCloseTo(rev24 * -0.20, PRECISION)
  })

  // ── Sanity: no ROUNDUP side-effect ──
  it('COGS at 2023 is exact (no ROUNDUP rounding)', () => {
    const rev23 = REV_2022 * 1.10
    const exact = rev23 * -0.60
    expect(result[10]?.[2023]).toBe(exact)
  })
})

import { describe, expect, it } from 'vitest'
import { buildKdAutoValues } from '@/lib/calculations/kd-auto-values'
import { FA_OFFSET } from '@/data/catalogs/fixed-asset-catalog'
import type { FaAccountEntry } from '@/data/catalogs/fixed-asset-catalog'
import type { YearKeyedSeries } from '@/types/financial'

const PRECISION = 6

const HIST_YEARS = [2019, 2020, 2021] as const
const PROJ_YEARS_7 = [2022, 2023, 2024, 2025, 2026, 2027, 2028] as const

const makeIsRows = (revenue: YearKeyedSeries, cogs: YearKeyedSeries, opex: YearKeyedSeries) => ({
  6: revenue,   // Revenue
  7: cogs,      // Total Cost of Goods Sold (negative convention)
  15: opex,     // Total Operating Expenses excl. Depreciation (negative convention)
})

describe('buildKdAutoValues — ratios from IS avg common size', () => {
  it('computes cogsRatio as avg |COGS / Revenue| across historical years', () => {
    const result = buildKdAutoValues({
      isRows: makeIsRows(
        { 2019: 100, 2020: 200, 2021: 300 },
        { 2019: -60, 2020: -120, 2021: -180 },  // 60% each year
        { 2019: -10, 2020: -20, 2021: -30 },    // 10% each year
      ),
      isHistYears: HIST_YEARS,
      faHistYears: HIST_YEARS,
      faAccounts: [],
      faRows: {},
      projYears: PROJ_YEARS_7,
    })
    expect(result.cogsRatio).toBeCloseTo(0.6, PRECISION)
  })

  it('splits totalOpEx avg ratio equally between sellingExpenseRatio and gaExpenseRatio (half each)', () => {
    const result = buildKdAutoValues({
      isRows: makeIsRows(
        { 2019: 100, 2020: 100, 2021: 100 },
        { 2019: -50, 2020: -50, 2021: -50 },    // cogs 50%
        { 2019: -14.2, 2020: -14.2, 2021: -14.2 }, // opex 14.2%
      ),
      isHistYears: HIST_YEARS,
      faHistYears: HIST_YEARS,
      faAccounts: [],
      faRows: {},
      projYears: PROJ_YEARS_7,
    })
    // avg totalOpEx / Revenue = 0.142
    expect(result.sellingExpenseRatio).toBeCloseTo(0.071, PRECISION)
    expect(result.gaExpenseRatio).toBeCloseTo(0.071, PRECISION)
    expect(result.sellingExpenseRatio).toBeCloseTo(result.gaExpenseRatio, PRECISION)
  })

  it('returns 0 ratios when IS rows are missing entirely', () => {
    const result = buildKdAutoValues({
      isRows: {},
      isHistYears: HIST_YEARS,
      faHistYears: HIST_YEARS,
      faAccounts: [],
      faRows: {},
      projYears: PROJ_YEARS_7,
    })
    expect(result.cogsRatio).toBe(0)
    expect(result.sellingExpenseRatio).toBe(0)
    expect(result.gaExpenseRatio).toBe(0)
  })

  it('handles Revenue = 0 in some years via IFERROR-safe ratioOfBase', () => {
    const result = buildKdAutoValues({
      isRows: makeIsRows(
        { 2019: 0, 2020: 100, 2021: 200 },
        { 2019: -50, 2020: -60, 2021: -120 },  // y1 zero-revenue → 0, y2 60%, y3 60%
        { 2019: 0, 2020: -10, 2021: -20 },
      ),
      isHistYears: HIST_YEARS,
      faHistYears: HIST_YEARS,
      faAccounts: [],
      faRows: {},
      projYears: PROJ_YEARS_7,
    })
    // averageSeries skips leading zeros; window = [0.6, 0.6] → 0.6
    expect(result.cogsRatio).toBeCloseTo(0.6, PRECISION)
  })

  it('single historical year → ratios based on that year only', () => {
    const result = buildKdAutoValues({
      isRows: makeIsRows(
        { 2021: 1000 },
        { 2021: -700 },
        { 2021: -100 },
      ),
      isHistYears: [2021],
      faHistYears: [2021],
      faAccounts: [],
      faRows: {},
      projYears: PROJ_YEARS_7,
    })
    expect(result.cogsRatio).toBeCloseTo(0.7, PRECISION)
    expect(result.sellingExpenseRatio).toBeCloseTo(0.05, PRECISION)
    expect(result.gaExpenseRatio).toBeCloseTo(0.05, PRECISION)
  })

  it('stores positive ratios (sign reconciliation happens at export boundary)', () => {
    const result = buildKdAutoValues({
      isRows: makeIsRows(
        { 2019: 100, 2020: 100, 2021: 100 },
        { 2019: -70, 2020: -70, 2021: -70 },
        { 2019: -10, 2020: -10, 2021: -10 },
      ),
      isHistYears: HIST_YEARS,
      faHistYears: HIST_YEARS,
      faAccounts: [],
      faRows: {},
      projYears: PROJ_YEARS_7,
    })
    expect(result.cogsRatio).toBeGreaterThan(0)
    expect(result.sellingExpenseRatio).toBeGreaterThan(0)
    expect(result.gaExpenseRatio).toBeGreaterThan(0)
  })
})

describe('buildKdAutoValues — additionalCapexByAccount from Proy FA', () => {
  const ACCT: FaAccountEntry = { catalogId: 'land', excelRow: 8, section: 'original' }

  it('returns empty additionalCapexByAccount when no FA accounts provided', () => {
    const result = buildKdAutoValues({
      isRows: makeIsRows({ 2021: 1 }, { 2021: 0 }, { 2021: 0 }),
      isHistYears: [2021],
      faHistYears: [2021],
      faAccounts: [],
      faRows: {},
      projYears: PROJ_YEARS_7,
    })
    expect(result.additionalCapexByAccount).toEqual({})
  })

  it('populates ADDITIONS band per account for 7 projection years', () => {
    // Historical Acq Additions pattern: 100, 110, 121 → ~10% YoY growth
    const faRows: Record<number, YearKeyedSeries> = {
      [ACCT.excelRow + FA_OFFSET.ACQ_BEGINNING]: { 2019: 1000, 2020: 1100, 2021: 1210 },
      [ACCT.excelRow + FA_OFFSET.ACQ_ADDITIONS]: { 2019: 100, 2020: 110, 2021: 121 },
      [ACCT.excelRow + FA_OFFSET.ACQ_ENDING]:    { 2019: 1100, 2020: 1210, 2021: 1331 },
      [ACCT.excelRow + FA_OFFSET.DEP_BEGINNING]: { 2019: 0, 2020: 0, 2021: 0 },
      [ACCT.excelRow + FA_OFFSET.DEP_ADDITIONS]: { 2019: 0, 2020: 0, 2021: 0 },
      [ACCT.excelRow + FA_OFFSET.DEP_ENDING]:    { 2019: 0, 2020: 0, 2021: 0 },
      [ACCT.excelRow + FA_OFFSET.NET_VALUE]:     { 2019: 1100, 2020: 1210, 2021: 1331 },
    }
    const result = buildKdAutoValues({
      isRows: makeIsRows({ 2021: 1 }, { 2021: 0 }, { 2021: 0 }),
      isHistYears: [2019, 2020, 2021],
      faHistYears: [2019, 2020, 2021],
      faAccounts: [ACCT],
      faRows,
      projYears: PROJ_YEARS_7,
    })
    const adds = result.additionalCapexByAccount[ACCT.excelRow]
    expect(adds).toBeDefined()
    // All 7 projection years present
    for (const year of PROJ_YEARS_7) {
      expect(adds![year]).toBeDefined()
    }
    // First projection year ≈ 121 × (1 + 0.1) = 133.1
    expect(adds![2022]).toBeCloseTo(133.1, PRECISION)
    // Chain grows at 10%
    expect(adds![2023]).toBeCloseTo(146.41, PRECISION)
    expect(adds![2028]).toBeCloseTo(121 * 1.1 ** 7, PRECISION)
  })

  it('supports extended-catalog accounts (excelRow ≥ 100)', () => {
    const EXT_ACCT: FaAccountEntry = { catalogId: 'custom_a', excelRow: 105, section: 'original' }
    const faRows: Record<number, YearKeyedSeries> = {
      [EXT_ACCT.excelRow + FA_OFFSET.ACQ_BEGINNING]: { 2019: 500, 2020: 500, 2021: 500 },
      [EXT_ACCT.excelRow + FA_OFFSET.ACQ_ADDITIONS]: { 2019: 50, 2020: 50, 2021: 50 },
      [EXT_ACCT.excelRow + FA_OFFSET.ACQ_ENDING]:    { 2019: 550, 2020: 550, 2021: 550 },
      [EXT_ACCT.excelRow + FA_OFFSET.DEP_BEGINNING]: { 2019: 0, 2020: 0, 2021: 0 },
      [EXT_ACCT.excelRow + FA_OFFSET.DEP_ADDITIONS]: { 2019: 0, 2020: 0, 2021: 0 },
      [EXT_ACCT.excelRow + FA_OFFSET.DEP_ENDING]:    { 2019: 0, 2020: 0, 2021: 0 },
      [EXT_ACCT.excelRow + FA_OFFSET.NET_VALUE]:     { 2019: 550, 2020: 550, 2021: 550 },
    }
    const result = buildKdAutoValues({
      isRows: makeIsRows({ 2021: 1 }, { 2021: 0 }, { 2021: 0 }),
      isHistYears: [2019, 2020, 2021],
      faHistYears: [2019, 2020, 2021],
      faAccounts: [EXT_ACCT],
      faRows,
      projYears: PROJ_YEARS_7,
    })
    const adds = result.additionalCapexByAccount[EXT_ACCT.excelRow]
    expect(adds).toBeDefined()
    // Zero growth → flat 50 across all projection years
    expect(adds![2022]).toBeCloseTo(50, PRECISION)
    expect(adds![2028]).toBeCloseTo(50, PRECISION)
  })

  it('respects Session 046 stopping rule when Net Value ≤ 0 (halts but still reports Acq Additions)', () => {
    // Asset fully depreciated historically → Net = 0 → Dep halts → Net stays 0,
    // but Acq Additions still grow per acqGrowth (LESSON-137 clamp is on Net not Adds)
    const faRows: Record<number, YearKeyedSeries> = {
      [ACCT.excelRow + FA_OFFSET.ACQ_BEGINNING]: { 2019: 100, 2020: 100, 2021: 100 },
      [ACCT.excelRow + FA_OFFSET.ACQ_ADDITIONS]: { 2019: 10, 2020: 10, 2021: 10 },
      [ACCT.excelRow + FA_OFFSET.ACQ_ENDING]:    { 2019: 110, 2020: 110, 2021: 110 },
      [ACCT.excelRow + FA_OFFSET.DEP_BEGINNING]: { 2019: 100, 2020: 100, 2021: 100 },
      [ACCT.excelRow + FA_OFFSET.DEP_ADDITIONS]: { 2019: 10, 2020: 10, 2021: 10 },
      [ACCT.excelRow + FA_OFFSET.DEP_ENDING]:    { 2019: 110, 2020: 110, 2021: 110 },
      [ACCT.excelRow + FA_OFFSET.NET_VALUE]:     { 2019: 0, 2020: 0, 2021: 0 },
    }
    const result = buildKdAutoValues({
      isRows: makeIsRows({ 2021: 1 }, { 2021: 0 }, { 2021: 0 }),
      isHistYears: [2019, 2020, 2021],
      faHistYears: [2019, 2020, 2021],
      faAccounts: [ACCT],
      faRows,
      projYears: PROJ_YEARS_7,
    })
    const adds = result.additionalCapexByAccount[ACCT.excelRow]
    expect(adds).toBeDefined()
    // Acq Additions: zero historical growth → flat 10
    expect(adds![2022]).toBeCloseTo(10, PRECISION)
    expect(adds![2028]).toBeCloseTo(10, PRECISION)
  })
})

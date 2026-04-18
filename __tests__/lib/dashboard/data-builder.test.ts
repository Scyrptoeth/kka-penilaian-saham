import { describe, expect, it } from 'vitest'
import {
  aggregateBsBySection,
  buildBsCompositionSeries,
  buildRevenueNetIncomeSeries,
  buildFcfSeries,
} from '@/lib/dashboard/data-builder'
import { BS_SUBTOTAL } from '@/data/catalogs/balance-sheet-catalog'
import { IS_SENTINEL } from '@/data/catalogs/income-statement-catalog'
import { PROY_LR_ROW } from '@/data/live/compute-proy-lr-live'
import { FCF_ROW } from '@/data/manifests/fcf'
import type { BsAccountEntry } from '@/data/catalogs/balance-sheet-catalog'

/**
 * Session 043 Task 4 — Dashboard account-driven data builders.
 *
 * User report: KOMPOSISI NERACA chart kosong (all bars zero) meski Neraca
 * sudah terisi lengkap. Root cause: page used hardcoded literals 26/40/48
 * which were wrong (actual sentinel rows are 27/41/49 per BS_SUBTOTAL).
 *
 * Fix: Dashboard now uses account-driven aggregation as the PRIMARY path
 * (never trusts magic row numbers) and IS/PROY LR/FCF use semantic
 * constants (IS_SENTINEL, PROY_LR_ROW, FCF_ROW) instead of literals.
 */

describe('aggregateBsBySection', () => {
  it('sums accounts by section for a given year', () => {
    const accounts: BsAccountEntry[] = [
      { catalogId: 'cash', excelRow: 8, section: 'current_assets' },
      { catalogId: 'ar', excelRow: 9, section: 'current_assets' },
      { catalogId: 'inv', excelRow: 110, section: 'intangible_assets' }, // extended
      { catalogId: 'ap', excelRow: 31, section: 'current_liabilities' },
      { catalogId: 'lt_loan', excelRow: 41, section: 'non_current_liabilities' },
      { catalogId: 'equity_paid', excelRow: 44, section: 'equity' },
    ]
    const allBs = {
      8: { 2021: 500 },
      9: { 2021: 300 },
      110: { 2021: 50 },
      31: { 2021: 200 },
      41: { 2021: 400 },
      44: { 2021: 1000 },
      // Fixed Asset Net (row 22) — cross-ref
      22: { 2021: 800 },
    }

    const result = aggregateBsBySection({ accounts, allBs, year: 2021 })
    expect(result).toEqual({
      assets: 500 + 300 + 50 + 800, // CA + IA + FA Net
      liabilities: 200 + 400,
      equity: 1000,
    })
  })

  it('handles empty accounts gracefully (all zeros)', () => {
    const result = aggregateBsBySection({ accounts: [], allBs: {}, year: 2021 })
    expect(result).toEqual({ assets: 0, liabilities: 0, equity: 0 })
  })

  it('picks up FA Net cross-ref even when not in accounts array', () => {
    // Fixed Asset Net sits at BS row 22 via FA cross-ref (LESSON-058) — not in
    // balanceSheet.accounts but present in allBs. Must contribute to assets.
    const result = aggregateBsBySection({
      accounts: [],
      allBs: { [BS_SUBTOTAL.FIXED_ASSETS_NET]: { 2021: 750 } },
      year: 2021,
    })
    expect(result.assets).toBe(750)
  })

  it('ignores non-balance-sheet sections for non-current_assets fallback', () => {
    // other_non_current_assets rows are aggregated separately from intangibles
    const accounts: BsAccountEntry[] = [
      { catalogId: 'other', excelRow: 20, section: 'other_non_current_assets' },
    ]
    const allBs = { 20: { 2021: 300 }, 22: { 2021: 0 } }
    const result = aggregateBsBySection({ accounts, allBs, year: 2021 })
    expect(result.assets).toBe(300)
  })

  it('missing year keys fall back to 0 (not NaN)', () => {
    const accounts: BsAccountEntry[] = [
      { catalogId: 'cash', excelRow: 8, section: 'current_assets' },
    ]
    const allBs = { 8: { 2020: 500 } }
    const result = aggregateBsBySection({ accounts, allBs, year: 2021 })
    expect(result.assets).toBe(0)
  })
})

describe('buildBsCompositionSeries', () => {
  it('returns one point per historical year', () => {
    const accounts: BsAccountEntry[] = [
      { catalogId: 'cash', excelRow: 8, section: 'current_assets' },
    ]
    const allBs = { 8: { 2019: 100, 2020: 200, 2021: 300 } }
    const histYears = [2019, 2020, 2021]
    const series = buildBsCompositionSeries({ accounts, allBs, histYears })
    expect(series).toHaveLength(3)
    expect(series.map(p => p.assets)).toEqual([100, 200, 300])
  })

  it('KOMPOSISI NERACA works with extended catalog (user bug report regression)', () => {
    // Simulate user whose custom catalog assigns TOTAL ASSETS to NON-27 row
    // or has no subtotal sentinel written. Account-driven aggregation still
    // produces correct totals.
    const accounts: BsAccountEntry[] = [
      { catalogId: 'cash', excelRow: 105, section: 'current_assets' }, // extended row
      { catalogId: 'ap', excelRow: 135, section: 'current_liabilities' },
      { catalogId: 'eq', excelRow: 170, section: 'equity' },
    ]
    const allBs = {
      105: { 2021: 10_000 },
      135: { 2021: 3_000 },
      170: { 2021: 7_000 },
      22: { 2021: 0 },
      // No row 27/41/49 sentinel — user never triggered sentinel persist.
    }
    const series = buildBsCompositionSeries({ accounts, allBs, histYears: [2021] })
    expect(series[0]).toEqual({
      year: '2021',
      assets: 10_000,
      liabilities: 3_000,
      equity: 7_000,
    })
  })
})

describe('buildRevenueNetIncomeSeries', () => {
  it('reads historical IS via IS_SENTINEL (rows 6 + 35)', () => {
    const isRows = {
      [IS_SENTINEL.REVENUE]: { 2020: 5_000_000, 2021: 6_000_000 },
      [IS_SENTINEL.NET_PROFIT]: { 2020: 500_000, 2021: 700_000 },
    }
    const series = buildRevenueNetIncomeSeries({
      incomeStatementRows: isRows,
      histYears: [2020, 2021],
    })
    expect(series).toEqual([
      { year: '2020', revenue: 5_000_000, netIncome: 500_000, type: 'hist' },
      { year: '2021', revenue: 6_000_000, netIncome: 700_000, type: 'hist' },
    ])
  })

  it('reads projection via PROY_LR_ROW (rows 8 + 39, NOT 6 + 35)', () => {
    const isRows = {
      [IS_SENTINEL.REVENUE]: { 2021: 6_000_000 },
      [IS_SENTINEL.NET_PROFIT]: { 2021: 700_000 },
    }
    const proyLrRows = {
      [PROY_LR_ROW.REVENUE]: { 2022: 7_000_000, 2023: 8_000_000 },
      [PROY_LR_ROW.NET_PROFIT]: { 2022: 900_000, 2023: 1_100_000 },
    }
    const series = buildRevenueNetIncomeSeries({
      incomeStatementRows: isRows,
      histYears: [2021],
      projection: { proyLrRows, projYears: [2022, 2023] },
    })
    expect(series).toHaveLength(3)
    expect(series[1]).toEqual({ year: '2022', revenue: 7_000_000, netIncome: 900_000, type: 'proj' })
    expect(series[2]).toEqual({ year: '2023', revenue: 8_000_000, netIncome: 1_100_000, type: 'proj' })
  })

  it('does not accidentally read proyLrRows row 6 or 35 (regression guard)', () => {
    // Regression test: old dashboard used proyLrRows[6] which would fall back
    // to 0 because PROY LR stores revenue at row 8. Verify new code doesn't.
    const proyLrRows = {
      6: { 2022: 999_999 }, // stale data that should be IGNORED
      [PROY_LR_ROW.REVENUE]: { 2022: 7_000_000 },
      [PROY_LR_ROW.NET_PROFIT]: { 2022: 900_000 },
    }
    const series = buildRevenueNetIncomeSeries({
      incomeStatementRows: {},
      histYears: [],
      projection: { proyLrRows, projYears: [2022] },
    })
    expect(series[0].revenue).toBe(7_000_000) // from row 8 — NOT 999_999
  })
})

describe('buildFcfSeries', () => {
  it('reads FCF_ROW.FREE_CASH_FLOW (row 20)', () => {
    const allFcf = {
      [FCF_ROW.FREE_CASH_FLOW]: { 2019: 1_000, 2020: 1_500, 2021: 2_000 },
    }
    const series = buildFcfSeries({ allFcf, histYears: [2019, 2020, 2021] })
    expect(series).toEqual([
      { year: '2019', fcf: 1_000, type: 'hist' },
      { year: '2020', fcf: 1_500, type: 'hist' },
      { year: '2021', fcf: 2_000, type: 'hist' },
    ])
  })
})

describe('Named-constant contract (LESSON-108 prevention)', () => {
  it('BS_SUBTOTAL values match documented positions', () => {
    // Regression lock — if template shifts these, failure here surfaces before
    // a silent dashboard-empty bug reappears.
    expect(BS_SUBTOTAL.TOTAL_ASSETS).toBe(27)
    expect(BS_SUBTOTAL.TOTAL_LIABILITIES).toBe(41)
    expect(BS_SUBTOTAL.TOTAL_EQUITY).toBe(49)
    expect(BS_SUBTOTAL.FIXED_ASSETS_NET).toBe(22)
  })

  it('PROY_LR_ROW differs from IS_SENTINEL (template slot layout divergence)', () => {
    expect(PROY_LR_ROW.REVENUE).toBe(8)
    expect(IS_SENTINEL.REVENUE).toBe(6)
    expect(PROY_LR_ROW.NET_PROFIT).toBe(39)
    expect(IS_SENTINEL.NET_PROFIT).toBe(35)
  })

  it('FCF_ROW.FREE_CASH_FLOW = 20', () => {
    expect(FCF_ROW.FREE_CASH_FLOW).toBe(20)
  })
})

import { describe, expect, it } from 'vitest'
import { computeProyBsLive, computeAvgGrowth, type ProyBsInput } from '@/data/live/compute-proy-bs-live'

const PRECISION = 3

/**
 * Fixture values from proy-balance-sheet.json + balance-sheet.json + proy-fixed-assets.json + proy-lr.json.
 *
 * BS F column = last historical year values, keyed by BS manifest row number.
 * BS Q column = average historical growth rates.
 */
const BS_LAST_YEAR: Record<number, number> = {
  8: 6_635_142_218,        // Cash on Hands
  9: 9_652_447_673,        // Cash in Banks
  10: 3_382_100_694,       // Account Receivable
  11: 1_000_000_000,       // Other Receivable
  12: 1_423_637_783,       // Inventory
  14: 2_347_809_320,       // Others (Prepaid)
  20: 6_989_653_544,       // Fixed Assets Beginning
  21: -725_313_599,        // Accumulated Depreciation (negative)
  23: 0,                   // Other Non-Current
  24: 0,                   // Intangible Assets
  31: 1_000_000_000,       // Bank Loan-ST
  32: 1_096_222_695,       // Account Payables
  33: 480_490_835,         // Tax Payable
  34: 1_692_923_000,       // Others CL
  38: 0,                   // Bank Loan-LT
  39: 0,                   // Other NCL
  43: 2_000_000_000,       // Paid-Up Capital
  46: 5_805_826_735,       // Surplus
  47: 21_560_655_469,      // Current Profit
}

const BS_AVG_GROWTH: Record<number, number> = {
  8: -0.011856554782641285,   // Cash on Hands
  9: 4.908192657557944,       // Cash in Banks
  10: 0.516745588727442,      // Account Receivable
  11: 0,                      // Other Receivable
  12: 0.27178474892239707,    // Inventory
  14: -0.13867777075023247,   // Others
  21: 0.47930381215132156,    // Accum Dep Growth (for display)
  31: -0.3333333333333333,    // Bank Loan-ST
  32: -0.20163782576567327,   // Account Payables
  33: 0.21236465553292364,    // Tax Payable
  34: -0.1567869128440281,    // Others CL
  38: 0,                      // Bank Loan-LT
  39: 0,                      // Other NCL
}

/** PROY FA fixture values for rows 32 (Total Ending) and 60 (Total Accum Dep). */
const PROY_FA_ROWS: Record<number, Record<number, number>> = {
  32: { 2022: 593_454_381_423.3119, 2023: 598_877_258_000.2345, 2024: 620_110_313_569.9087 },
  60: { 2022: 993_022_541.3690057, 2023: 1_636_832_796.5207, 2024: 3_455_907_441.531417 },
}

/** PROY LR Net Profit (row 39). */
const PROY_LR_NET_PROFIT: Record<number, number> = {
  2022: 6_632_543_589.150246,
  2023: 7_900_486_394.848385,
  2024: 8_904_862_972.536745,
}

/** Row 64 "copas number only atu-atu" — manual AR adjustments. */
const AR_ADJUSTMENTS: Record<number, number> = {
  2022: -39_411_326_238.19922,
  2023: -94_754_819_494.02197,
  2024: -92_891_524_708.56348,
}

const INPUT: ProyBsInput = {
  bsLastYear: BS_LAST_YEAR,
  bsAvgGrowth: BS_AVG_GROWTH,
  proyFaRows: PROY_FA_ROWS,
  proyLrNetProfit: PROY_LR_NET_PROFIT,
  arAdjustments: AR_ADJUSTMENTS,
  intangibleGrowth: 0, // BS Q24 = 0
}

const HIST_YEAR = 2021
const PROJ_YEARS = [2022, 2023, 2024] as const

describe('computeProyBsLive — matches proy-balance-sheet.json fixture', () => {
  const result = computeProyBsLive(INPUT, HIST_YEAR, PROJ_YEARS)

  // ── Historical seed (Column C) ──

  it('C9 Cash on Hands seeds from BS', () => {
    expect(result[9]?.[2021]).toBe(6_635_142_218)
  })

  it('C21 Total CA = sum of components', () => {
    expect(result[21]?.[2021]).toBeCloseTo(24_441_137_688, PRECISION)
  })

  // ── CURRENT ASSETS (D column) ──

  it('D9 Cash on Hands', () => {
    expect(result[9]?.[2022]).toBeCloseTo(6_556_472_290.801667, PRECISION)
  })

  it('D11 Cash in Banks = 0', () => {
    expect(result[11]?.[2022]).toBe(0)
  })

  it('D12 Cash in Banks growth = -1', () => {
    expect(result[12]?.[2022]).toBeCloseTo(-1, PRECISION)
  })

  it('D13 Account Receivable (with copas adjustment)', () => {
    expect(result[13]?.[2022]).toBeCloseTo(44_541_112_546.45574, PRECISION)
  })

  it('D15 Other Receivable = 1B (0 growth)', () => {
    expect(result[15]?.[2022]).toBeCloseTo(1_000_000_000, PRECISION)
  })

  it('D17 Inventory', () => {
    expect(result[17]?.[2022]).toBeCloseTo(1_810_560_820.409093, PRECISION)
  })

  it('D19 Others', () => {
    expect(result[19]?.[2022]).toBeCloseTo(2_022_220_357.355781, PRECISION)
  })

  it('D21 Total Current Assets', () => {
    expect(result[21]?.[2022]).toBeCloseTo(55_930_366_015.02228, PRECISION)
  })

  // ── NON-CURRENT ASSETS ──

  it('D25 FA Beginning from PROY FA row 32', () => {
    expect(result[25]?.[2022]).toBeCloseTo(593_454_381_423.3119, PRECISION)
  })

  it('D26 Accum Dep = PROY FA row 60 * -1', () => {
    expect(result[26]?.[2022]).toBeCloseTo(-993_022_541.3690057, PRECISION)
  })

  it('D28 Fixed Assets Net = 25 + 26', () => {
    expect(result[28]?.[2022]).toBeCloseTo(592_461_358_881.9429, PRECISION)
  })

  it('D31 Total Non-Current Assets', () => {
    expect(result[31]?.[2022]).toBeCloseTo(592_461_358_881.9429, PRECISION)
  })

  it('D33 TOTAL ASSETS', () => {
    expect(result[33]?.[2022]).toBeCloseTo(648_391_724_896.9652, PRECISION)
  })

  // ── LIABILITIES ──

  it('D37 Bank Loan-ST', () => {
    expect(result[37]?.[2022]).toBeCloseTo(666_666_666.6666667, PRECISION)
  })

  it('D39 Account Payables', () => {
    expect(result[39]?.[2022]).toBeCloseTo(875_182_734.2252133, PRECISION)
  })

  it('D45 Total CL (includes growth rows)', () => {
    expect(result[45]?.[2022]).toBeCloseTo(3_551_874_335.3781247, PRECISION)
  })

  it('D48 Bank Loan-LT = 0 (IFERROR)', () => {
    expect(result[48]?.[2022]).toBe(0)
  })

  it('D52 Total NCL', () => {
    expect(result[52]?.[2022]).toBe(0)
  })

  // ── EQUITY ──

  it('D55 Paid-Up Capital (carry forward)', () => {
    expect(result[55]?.[2022]).toBe(2_000_000_000)
  })

  it('D58 Current Profit = prev + PROY LR net profit', () => {
    expect(result[58]?.[2022]).toBeCloseTo(28_193_199_058.150246, PRECISION)
  })

  it('D60 Shareholders Equity', () => {
    expect(result[60]?.[2022]).toBeCloseTo(35_999_025_793.150246, PRECISION)
  })

  it('D62 Total L&E', () => {
    expect(result[62]?.[2022]).toBeCloseTo(39_550_900_128.52837, PRECISION)
  })

  it('D63 Balance Control = Assets - L&E', () => {
    expect(result[63]?.[2022]).toBeCloseTo(608_840_824_768.4369, PRECISION)
  })

  // ── Year 2 (E column) spot checks ──

  it('E9 Cash on Hands year 2', () => {
    expect(result[9]?.[2023]).toBeCloseTo(6_478_735_117.904908, PRECISION)
  })

  it('E58 Current Profit accumulates', () => {
    expect(result[58]?.[2023]).toBeCloseTo(36_093_685_452.99863, PRECISION)
  })

  // ── Year 3 (F column) spot checks ──

  it('F17 Inventory year 3', () => {
    expect(result[17]?.[2024]).toBeCloseTo(2_928_467_061.511024, PRECISION)
  })

  it('F58 Current Profit year 3', () => {
    expect(result[58]?.[2024]).toBeCloseTo(44_998_548_425.53537, PRECISION)
  })
})

describe('computeAvgGrowth', () => {
  it('computes average YoY growth', () => {
    const series = { 2018: 100, 2019: 110, 2020: 121, 2021: 133.1 }
    // growth: 0.1, 0.1, 0.1 → avg = 0.1
    expect(computeAvgGrowth(series)).toBeCloseTo(0.1, 10)
  })

  it('returns 0 for single year', () => {
    expect(computeAvgGrowth({ 2021: 100 })).toBe(0)
  })

  it('skips zero-base years', () => {
    const series = { 2018: 0, 2019: 100, 2020: 200 }
    // growth from 0→100 skipped, 100→200 = 1.0
    expect(computeAvgGrowth(series)).toBeCloseTo(1.0, 10)
  })
})

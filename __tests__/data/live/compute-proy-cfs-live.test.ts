import { describe, expect, it } from 'vitest'
import { computeProyCfsLive, type ProyCfsInput } from '@/data/live/compute-proy-cfs-live'
import type { BsAccountEntry } from '@/data/catalogs/balance-sheet-catalog'

const PRECISION = 3

/**
 * Session 039 rewrite: PROY CFS is account-driven — ΔCA / ΔCL iterate
 * `bsAccounts` filtered by section minus exclusions. The fixture below
 * reproduces PT Raja Voltama prototipe: user accounts at rows 8-14 (CA)
 * and 31-34 (CL), with excludedCA = [8, 9, 13] mirroring the workbook's
 * formula `(BS D13+D15+D17+D19)*-1` (template rows 13/15/17/19 map to
 * user input rows 10/11/12/14 after Session 036 translation — but PROY BS
 * outputs are keyed by USER excelRow, not template).
 *
 * Numerical parity with the original prototipe is achieved via the
 * exclusion list, not by hardcoded row numbers.
 */

// PROY BS rows keyed by USER excelRow per Session 036 contract.
const PROY_BS_ROWS: Record<number, Record<number, number>> = {
  8: { 2021: 6_635_142_218, 2022: 6_556_472_290.801667, 2023: 6_478_735_117.904908, 2024: 6_401_919_640.057247 },
  9: { 2021: 9_652_447_673, 2022: 0, 2023: 0, 2024: 0 },
  10: { 2021: 3_382_100_694, 2022: 44_541_112_546.45574, 2023: 681_346_079_297.6064, 2024: 10_515_452_912_011.863 },
  11: { 2021: 1_000_000_000, 2022: 1_000_000_000, 2023: 1_000_000_000, 2024: 1_000_000_000 },
  12: { 2021: 1_423_637_783, 2022: 1_810_560_820.409093, 2023: 2_302_643_638.3927073, 2024: 2_928_467_061.511024 },
  13: { 2021: 500_000_000, 2022: 500_000_000, 2023: 500_000_000, 2024: 500_000_000 },
  14: { 2021: 2_347_809_320, 2022: 2_022_220_357.355781, 2023: 1_741_783_346.2319427, 2024: 1_500_236_714.6466165 },
  // Current Liabilities — sum across rows ≈ prior row 45 total
  31: { 2021: 100_000_000, 2022: 50_000_000, 2023: 30_000_000, 2024: 20_000_000 },
  32: { 2021: 3_000_000_000, 2022: 2_500_000_000, 2023: 2_000_000_000, 2024: 1_700_000_000 },
  33: { 2021: 1_069_636_529.677393, 2022: 901_874_335.3781247, 2023: 823_078_467.3426094, 2024: 905_301_939.03074 },
  34: { 2021: 100_000_000, 2022: 100_000_000, 2023: 200_000_000, 2024: 100_000_000 },
}

const PROY_LR_ROWS: Record<number, Record<number, number>> = {
  19: { 2022: 8_685_100_649.744667, 2023: 10_686_616_923.124352, 2024: 13_149_390_648.105576 },
  29: { 2022: 105_347_465.88305867, 2023: 105_494_917.86216997, 2024: 105_642_576.22580093 },
  31: { 2022: -19_478_161.527636457, 2023: -19_472_874.490744554, 2024: -19_467_588.888934657 },
  34: { 2022: 0, 2023: 0, 2024: 0 },
  37: { 2022: -1_870_717_422.5808384, 2023: -2_228_342_316.4956985, 2024: -2_511_628_017.8949795 },
}

const PROY_FA_ROWS: Record<number, Record<number, number>> = {
  23: { 2022: 1_423_817_993.311922, 2023: 5_422_876_576.922622, 2024: 21_233_055_569.6742 },
}

const PROY_AP_ROWS: Record<number, Record<number, number>> = {
  21: { 2022: 0, 2023: 0, 2024: 0 },
}

const PT_RAJA_ACCOUNTS: BsAccountEntry[] = [
  { catalogId: 'cash', excelRow: 8, section: 'current_assets' },
  { catalogId: 'cash_bank', excelRow: 9, section: 'current_assets' },
  { catalogId: 'account_receivable', excelRow: 10, section: 'current_assets' },
  { catalogId: 'other_receivable', excelRow: 11, section: 'current_assets' },
  { catalogId: 'inventory', excelRow: 12, section: 'current_assets' },
  { catalogId: 'prepaid_expenses', excelRow: 13, section: 'current_assets' },
  { catalogId: 'other_current_assets', excelRow: 14, section: 'current_assets' },
  { catalogId: 'short_term_debt', excelRow: 31, section: 'current_liabilities' },
  { catalogId: 'account_payable', excelRow: 32, section: 'current_liabilities' },
  { catalogId: 'tax_payable', excelRow: 33, section: 'current_liabilities' },
  { catalogId: 'other_current_liab', excelRow: 34, section: 'current_liabilities' },
]

const HIST_CASH_ENDING = 6_635_142_218 + 9_652_447_673 // BS F8 + F9

const INPUT: ProyCfsInput = {
  proyLrRows: PROY_LR_ROWS,
  proyBsRows: PROY_BS_ROWS,
  proyFaRows: PROY_FA_ROWS,
  proyApRows: PROY_AP_ROWS,
  histCashEnding: HIST_CASH_ENDING,
  bsAccounts: PT_RAJA_ACCOUNTS,
  excludedCurrentAssets: [8, 9, 13], // User excludes Cash + Bank + Prepaid from Operating WC
  excludedCurrentLiabilities: [],
}

const HIST_YEAR = 2021
const PROJ_YEARS = [2022, 2023, 2024] as const

describe('computeProyCfsLive — account-driven WC aggregation', () => {
  const result = computeProyCfsLive(INPUT, HIST_YEAR, PROJ_YEARS)

  it('D5 EBITDA = PROY LR row 19', () => {
    expect(result[5]?.[2022]).toBeCloseTo(8_685_100_649.744667, PRECISION)
  })

  it('D6 Tax (negative)', () => {
    expect(result[6]?.[2022]).toBeCloseTo(-1_870_717_422.5808384, PRECISION)
  })

  it('D8 ΔCA — aggregates account-driven CA rows minus exclusions', () => {
    // Remaining CA after excluding [8, 9, 13]: rows 10, 11, 12, 14
    const ca2022 = 44_541_112_546.45574 + 1_000_000_000 + 1_810_560_820.409093 + 2_022_220_357.355781
    const ca2021 = 3_382_100_694 + 1_000_000_000 + 1_423_637_783 + 2_347_809_320
    expect(result[8]?.[2022]).toBeCloseTo(-(ca2022 - ca2021), PRECISION)
  })

  it('D9 ΔCL — aggregates all CL rows (no exclusions)', () => {
    // All CL rows 31,32,33,34 included
    const cl2022 = 50_000_000 + 2_500_000_000 + 901_874_335.3781247 + 100_000_000
    const cl2021 = 100_000_000 + 3_000_000_000 + 1_069_636_529.677393 + 100_000_000
    expect(result[9]?.[2022]).toBeCloseTo(cl2022 - cl2021, PRECISION)
  })

  it('D10 Working Capital = 8 + 9', () => {
    expect(result[10]?.[2022]).toBeCloseTo(
      (result[8]?.[2022] ?? 0) + (result[9]?.[2022] ?? 0),
      PRECISION,
    )
  })

  it('D17 CapEx negated', () => {
    expect(result[17]?.[2022]).toBeCloseTo(-1_423_817_993.311922, PRECISION)
  })

  it('D19 CF before Financing = CFO + NonOp + CFI', () => {
    const expected = (result[11]?.[2022] ?? 0) + (result[13]?.[2022] ?? 0) + (result[17]?.[2022] ?? 0)
    expect(result[19]?.[2022]).toBeCloseTo(expected, PRECISION)
  })

  it('D24 Interest Expense (already negative from LR)', () => {
    expect(result[24]?.[2022]).toBeCloseTo(-19_478_161.527636457, PRECISION)
  })

  it('D25 Interest Income', () => {
    expect(result[25]?.[2022]).toBeCloseTo(105_347_465.88305867, PRECISION)
  })

  it('D32 Cash Beginning = hist Cash Ending', () => {
    expect(result[32]?.[2022]).toBeCloseTo(HIST_CASH_ENDING, PRECISION)
  })

  it('D33 Cash Ending = PROY BS row 8 + row 9 (user standard)', () => {
    // User's Cash rows 8 + 9: 6_556_472_290.801667 + 0 = 6_556_472_290.801667
    expect(result[33]?.[2022]).toBeCloseTo(6_556_472_290.801667, PRECISION)
  })

  it('E32 Cash Beginning = D33', () => {
    expect(result[32]?.[2023]).toBeCloseTo(result[33]?.[2022] ?? 0, PRECISION)
  })

  it('F5 EBITDA year 3', () => {
    expect(result[5]?.[2024]).toBeCloseTo(13_149_390_648.105576, PRECISION)
  })

  it('empty bsAccounts → ΔCA and ΔCL are 0 (safe no-op)', () => {
    const emptyInput: ProyCfsInput = { ...INPUT, bsAccounts: [] }
    const r = computeProyCfsLive(emptyInput, HIST_YEAR, PROJ_YEARS)
    expect((r[8]?.[2022] ?? 0) + 0).toBe(0)
    expect((r[9]?.[2022] ?? 0) + 0).toBe(0)
  })

  it('respects excludedCurrentLiabilities (e.g. user excludes IBD row 31)', () => {
    const ibdExcluded: ProyCfsInput = {
      ...INPUT,
      excludedCurrentLiabilities: [31],
    }
    const r = computeProyCfsLive(ibdExcluded, HIST_YEAR, PROJ_YEARS)
    // Rows 32, 33, 34 only
    const cl2022 = 2_500_000_000 + 901_874_335.3781247 + 100_000_000
    const cl2021 = 3_000_000_000 + 1_069_636_529.677393 + 100_000_000
    expect(r[9]?.[2022]).toBeCloseTo(cl2022 - cl2021, PRECISION)
  })
})

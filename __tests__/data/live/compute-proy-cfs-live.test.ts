import { describe, expect, it } from 'vitest'
import { computeProyCfsLive, type ProyCfsInput } from '@/data/live/compute-proy-cfs-live'

const PRECISION = 3

/**
 * Fixture values from proy-cash-flow-statement.json.
 * Uses known PROY LR, PROY BS, PROY FA, PROY AP outputs.
 */

/** PROY LR rows — values from proy-lr.json fixture. */
const PROY_LR_ROWS: Record<number, Record<number, number>> = {
  19: { 2022: 8_685_100_649.744667, 2023: 10_686_616_923.124352, 2024: 13_149_390_648.105576 },
  29: { 2022: 105_347_465.88305867, 2023: 105_494_917.86216997, 2024: 105_642_576.22580093 },
  31: { 2022: -19_478_161.527636457, 2023: -19_472_874.490744554, 2024: -19_467_588.888934657 },
  34: { 2022: 0, 2023: 0, 2024: 0 },
  37: { 2022: -1_870_717_422.5808384, 2023: -2_228_342_316.4956985, 2024: -2_511_628_017.8949795 },
}

/** PROY BS rows consumed by CFS — working capital and cash rows. */
const PROY_BS_ROWS: Record<number, Record<number, number>> = {
  9: { 2021: 6_635_142_218, 2022: 6_556_472_290.801667, 2023: 6_478_735_117.904908, 2024: 6_401_919_640.057247 },
  11: { 2021: 9_652_447_673, 2022: 0, 2023: 0, 2024: 0 },
  13: { 2021: 3_382_100_694, 2022: 44_541_112_546.45574, 2023: 681_346_079_297.6064, 2024: 10_515_452_912_011.863 },
  15: { 2021: 1_000_000_000, 2022: 1_000_000_000, 2023: 1_000_000_000, 2024: 1_000_000_000 },
  17: { 2021: 1_423_637_783, 2022: 1_810_560_820.409093, 2023: 2_302_643_638.3927073, 2024: 2_928_467_061.511024 },
  19: { 2021: 2_347_809_320, 2022: 2_022_220_357.355781, 2023: 1_741_783_346.2319427, 2024: 1_500_236_714.6466165 },
  45: { 2021: 4_269_636_529.677393, 2022: 3_551_874_335.3781247, 2023: 3_053_078_467.3426094, 2024: 2_725_301_939.03074 },
}

const PROY_FA_ROWS: Record<number, Record<number, number>> = {
  23: { 2022: 1_423_817_993.311922, 2023: 5_422_876_576.922622, 2024: 21_233_055_569.6742 },
}

const PROY_AP_ROWS: Record<number, Record<number, number>> = {
  21: { 2022: 0, 2023: 0, 2024: 0 },
}

/** Historical Cash Ending = BS F8 + BS F9 = Cash on Hands + Cash in Banks */
const HIST_CASH_ENDING = 6_635_142_218 + 9_652_447_673 // = 16287589891

const INPUT: ProyCfsInput = {
  proyLrRows: PROY_LR_ROWS,
  proyBsRows: PROY_BS_ROWS,
  proyFaRows: PROY_FA_ROWS,
  proyApRows: PROY_AP_ROWS,
  histCashEnding: HIST_CASH_ENDING,
}

const HIST_YEAR = 2021
const PROJ_YEARS = [2022, 2023, 2024] as const

describe('computeProyCfsLive — matches proy-cash-flow-statement.json fixture', () => {
  const result = computeProyCfsLive(INPUT, HIST_YEAR, PROJ_YEARS)

  // ── Row 5: EBITDA ──
  it('D5 EBITDA = PROY LR row 19', () => {
    expect(result[5]?.[2022]).toBeCloseTo(8_685_100_649.744667, PRECISION)
  })

  // ── Row 6: Corporate Tax ──
  it('D6 Tax (negative)', () => {
    expect(result[6]?.[2022]).toBeCloseTo(-1_870_717_422.5808384, PRECISION)
  })

  // ── Row 8: Changes in Current Assets ──
  it('D8 Working Capital — Current Assets change', () => {
    // -(sum of BS rows 13,15,17,19 for 2022 - same for 2021)
    const ca2022 = 44_541_112_546.45574 + 1_000_000_000 + 1_810_560_820.409093 + 2_022_220_357.355781
    const ca2021 = 3_382_100_694 + 1_000_000_000 + 1_423_637_783 + 2_347_809_320
    const expected = -(ca2022 - ca2021)
    expect(result[8]?.[2022]).toBeCloseTo(expected, PRECISION)
  })

  // ── Row 9: Changes in Current Liabilities ──
  it('D9 CL change', () => {
    const expected = 3_551_874_335.3781247 - 4_269_636_529.677393
    expect(result[9]?.[2022]).toBeCloseTo(expected, PRECISION)
  })

  // ── Row 10: Working Capital = 8 + 9 ──
  it('D10 Working Capital', () => {
    expect(result[10]?.[2022]).toBeCloseTo(
      (result[8]?.[2022] ?? 0) + (result[9]?.[2022] ?? 0),
      PRECISION,
    )
  })

  // ── Row 11: CFO ──
  it('D11 CFO = sum(5:9)', () => {
    const expected =
      (result[5]?.[2022] ?? 0) +
      (result[6]?.[2022] ?? 0) +
      (result[8]?.[2022] ?? 0) +
      (result[9]?.[2022] ?? 0)
    expect(result[11]?.[2022]).toBeCloseTo(expected, PRECISION)
  })

  // ── Row 17: CFI (CapEx) ──
  it('D17 CapEx negated', () => {
    expect(result[17]?.[2022]).toBeCloseTo(-1_423_817_993.311922, PRECISION)
  })

  // ── Row 19: CF before Financing ──
  it('D19 CF before Financing = CFO + NonOp + CFI', () => {
    const expected = (result[11]?.[2022] ?? 0) + (result[13]?.[2022] ?? 0) + (result[17]?.[2022] ?? 0)
    expect(result[19]?.[2022]).toBeCloseTo(expected, PRECISION)
  })

  // ── Financing ──
  it('D24 Interest Expense (already negative from LR)', () => {
    expect(result[24]?.[2022]).toBeCloseTo(-19_478_161.527636457, PRECISION)
  })

  it('D25 Interest Income', () => {
    expect(result[25]?.[2022]).toBeCloseTo(105_347_465.88305867, PRECISION)
  })

  it('D28 CF from Financing', () => {
    const expected = 0 + 0 + (-19_478_161.527636457) + 105_347_465.88305867 + 0
    expect(result[28]?.[2022]).toBeCloseTo(expected, PRECISION)
  })

  // ── Row 30: Net Cash Flow ──
  it('D30 Net Cash Flow = CFO + NonOp + CFI + CFF', () => {
    const expected =
      (result[11]?.[2022] ?? 0) +
      (result[13]?.[2022] ?? 0) +
      (result[17]?.[2022] ?? 0) +
      (result[28]?.[2022] ?? 0)
    expect(result[30]?.[2022]).toBeCloseTo(expected, PRECISION)
  })

  // ── Cash Balance ──
  it('D32 Cash Beginning = hist Cash Ending', () => {
    expect(result[32]?.[2022]).toBeCloseTo(HIST_CASH_ENDING, PRECISION)
  })

  it('D33 Cash Ending = BS row 9 + BS row 11', () => {
    expect(result[33]?.[2022]).toBeCloseTo(6_556_472_290.801667, PRECISION)
  })

  it('D36 Cash on Hand = BS row 9', () => {
    expect(result[36]?.[2022]).toBeCloseTo(6_556_472_290.801667, PRECISION)
  })

  // ── Year 2 + 3 spot checks ──
  it('E32 Cash Beginning = D33', () => {
    expect(result[32]?.[2023]).toBeCloseTo(result[33]?.[2022] ?? 0, PRECISION)
  })

  it('F5 EBITDA year 3', () => {
    expect(result[5]?.[2024]).toBeCloseTo(13_149_390_648.105576, PRECISION)
  })
})

import { describe, expect, it } from 'vitest'
import { computeProyNoplatLive, type ProyNoplatInput } from '@/data/live/compute-proy-noplat-live'

const PRECISION = 3

/**
 * Fixture values from proy-noplat.json + proy-lr.json + income-statement.json.
 *
 * IMPORTANT: PROY NOPLAT historical column uses IS values (not PROY LR).
 * PROY LR E/F column values differ from the PROY LR test's computed values
 * because the test approximates — always use raw fixture values here.
 */

/** PROY LR rows for PROJECTED years only. Values from proy-lr.json fixture. */
const PROY_LR_ROWS: Record<number, Record<number, number>> = {
  29: { 2022: 105_347_465.88305867, 2023: 105_494_917.86216997, 2024: 105_642_576.22580093 },
  31: { 2022: -19_478_161.527636457, 2023: -19_472_874.490744554, 2024: -19_467_588.888934657 },
  34: { 2022: 0, 2023: 0, 2024: 0 },
  36: { 2022: 8_503_261_011.731084, 2023: 10_128_828_711.344084, 2024: 11_416_490_990.431725 },
  37: { 2022: -1_870_717_422.5808384, 2023: -2_228_342_316.4956985, 2024: -2_511_628_017.8949795 },
}

const INPUT: ProyNoplatInput = {
  proyLrRows: PROY_LR_ROWS,
  taxRate: 0.22, // KEY DRIVERS corporateTaxRate
  isLastYear: {
    pbt: 7_419_191_015,           // IS F32
    interestExpense: -19_483_450, // IS F27 (negative)
    interestIncome: 105_200_220,  // IS F26 (positive)
    nonOpIncome: 0,               // IS F30
    tax: -1_613_364_280,          // IS F33 (negative)
  },
  histTaxRate: 0, // IS B33 = empty → 0
}

const HIST_YEAR = 2021
const PROJ_YEARS = [2022, 2023, 2024] as const

describe('computeProyNoplatLive — matches proy-noplat.json fixture', () => {
  const result = computeProyNoplatLive(INPUT, HIST_YEAR, PROJ_YEARS)

  // ── Historical column (C = 2021) from IS ──

  it('C7 PBT = IS F32', () => {
    expect(result[7]?.[2021]).toBe(7_419_191_015)
  })

  it('C8 Interest Expense negated', () => {
    expect(result[8]?.[2021]).toBe(19_483_450)
  })

  it('C11 EBIT historical', () => {
    // 7419191015 + 19483450 + (-105200220) + 0
    expect(result[11]?.[2021]).toBeCloseTo(7_333_474_245, PRECISION)
  })

  it('C14 Tax Shield = 0 (IS B33 = 0)', () => {
    expect(result[14]?.[2021]).toBe(0)
  })

  it('C19 NOPLAT historical', () => {
    // EBIT(7333474245) - TotalTax(1613364280 + 0 + 0 + 0)
    expect(result[19]?.[2021]).toBeCloseTo(5_720_109_965, PRECISION)
  })

  // ── Projected D column (2022) ──

  it('D7 PBT = PROY LR row 36', () => {
    expect(result[7]?.[2022]).toBeCloseTo(8_503_261_011.731084, PRECISION)
  })

  it('D8 Interest Expense negated', () => {
    expect(result[8]?.[2022]).toBeCloseTo(19_478_161.527636457, PRECISION)
  })

  it('D9 Interest Income negated', () => {
    expect(result[9]?.[2022]).toBeCloseTo(-105_347_465.88305867, PRECISION)
  })

  it('D11 EBIT', () => {
    expect(result[11]?.[2022]).toBeCloseTo(8_417_391_707.375662, PRECISION)
  })

  it('D13 Tax Provision negated', () => {
    expect(result[13]?.[2022]).toBeCloseTo(1_870_717_422.5808384, PRECISION)
  })

  it('D14 Tax Shield Interest Expense', () => {
    expect(result[14]?.[2022]).toBeCloseTo(4_285_195.536080020, PRECISION)
  })

  it('D15 Tax on Interest Income', () => {
    expect(result[15]?.[2022]).toBeCloseTo(-23_176_442.49427291, PRECISION)
  })

  it('D19 NOPLAT year 1', () => {
    expect(result[19]?.[2022]).toBeCloseTo(6_565_565_531.753016, PRECISION)
  })

  // ── E column (2023) ──

  it('E11 EBIT year 2', () => {
    expect(result[11]?.[2023]).toBeCloseTo(10_042_806_667.972658, PRECISION)
  })

  it('E19 NOPLAT year 2', () => {
    expect(result[19]?.[2023]).toBeCloseTo(7_833_389_201.018673, PRECISION)
  })

  // ── F column (2024) ──

  it('F19 NOPLAT year 3', () => {
    expect(result[19]?.[2024]).toBeCloseTo(8_837_646_482.41399, PRECISION)
  })
})

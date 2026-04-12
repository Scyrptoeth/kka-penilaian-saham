import { describe, expect, it } from 'vitest'
import {
  computeBetaUnleveredCAPM,
  computeBetaLeveredCAPM,
  computeCostOfEquity,
  computeCostOfDebt,
  computeDebtRateFromBanks,
  computeDiscountRate,
} from '@/lib/calculations/discount-rate'

const PRECISION = 12

/**
 * Fixture values from __tests__/fixtures/discount-rate.json.
 * All inputs are hardcoded except C7 (debtRate from bank rates).
 */
const INPUT = {
  taxRate: 0.22,        // C2
  riskFree: 0.064795,   // C3
  beta: 1.09,           // C4
  erp: 0.0738,          // C5
  countrySpread: 0.0207, // C6
  debtRate: 0.088,      // C7 = ROUND(L11/100, 3)
  der: 0.2154,          // C8
}

describe('computeBetaUnleveredCAPM', () => {
  it('matches fixture H1 = 0.9332095903124283', () => {
    const bu = computeBetaUnleveredCAPM(INPUT.beta, INPUT.taxRate, INPUT.der)
    expect(bu).toBeCloseTo(0.9332095903124283, PRECISION)
  })
})

describe('computeBetaLeveredCAPM', () => {
  it('round-trips back to original beta — H2 = 1.09', () => {
    const bu = computeBetaUnleveredCAPM(INPUT.beta, INPUT.taxRate, INPUT.der)
    const bl = computeBetaLeveredCAPM(bu, INPUT.taxRate, INPUT.der)
    expect(bl).toBeCloseTo(1.09, PRECISION)
  })
})

describe('computeCostOfEquity', () => {
  it('matches fixture H3 = 0.12453700000000001', () => {
    const ke = computeCostOfEquity(INPUT.riskFree, 1.09, INPUT.erp, INPUT.countrySpread)
    expect(ke).toBeCloseTo(0.12453700000000001, PRECISION)
  })
})

describe('computeCostOfDebt', () => {
  it('matches fixture H4 = 0.06864', () => {
    const kd = computeCostOfDebt(INPUT.debtRate, INPUT.taxRate)
    expect(kd).toBeCloseTo(0.06863999999999999, PRECISION)
  })
})

describe('computeDebtRateFromBanks', () => {
  it('computes ROUND(AVG(rates)/100, 3) matching C7 = 0.088', () => {
    // L6-L10 bank rates in "percent-like" format (9.41, 9.06, ...)
    const rates = [9.41, 9.06, 8.23, 8.51, 8.81]
    const debtRate = computeDebtRateFromBanks(rates)
    expect(debtRate).toBe(0.088)
  })

  it('returns 0 for empty rates', () => {
    expect(computeDebtRateFromBanks([])).toBe(0)
  })
})

describe('computeDiscountRate — full pipeline', () => {
  const result = computeDiscountRate(INPUT)

  it('BU matches H1', () => {
    expect(result.bu).toBeCloseTo(0.9332095903124283, PRECISION)
  })

  it('BL matches H2 (round-trip)', () => {
    expect(result.bl).toBeCloseTo(1.09, PRECISION)
  })

  it('Ke matches H3', () => {
    expect(result.ke).toBeCloseTo(0.12453700000000001, PRECISION)
  })

  it('Kd matches H4', () => {
    expect(result.kd).toBeCloseTo(0.06863999999999999, PRECISION)
  })

  it('weightDebt matches F7', () => {
    expect(result.weightDebt).toBeCloseTo(0.17722560473918053, PRECISION)
  })

  it('weightEquity matches F8', () => {
    expect(result.weightEquity).toBeCloseTo(0.8227743952608195, PRECISION)
  })

  it('waccDebt matches H7', () => {
    expect(result.waccDebt).toBeCloseTo(0.01216476550929735, PRECISION)
  })

  it('waccEquity matches H8', () => {
    expect(result.waccEquity).toBeCloseTo(0.10246585486259668, PRECISION)
  })

  it('WACC matches H10 = 0.11463062037189403', () => {
    expect(result.wacc).toBeCloseTo(0.11463062037189403, PRECISION)
  })
})

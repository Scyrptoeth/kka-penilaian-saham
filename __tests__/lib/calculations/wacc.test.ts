import { describe, expect, it } from 'vitest'
import {
  computeBetaUnlevered,
  computeRelleveredBeta,
  computeWacc,
} from '@/lib/calculations/wacc'

/**
 * Fixture values from __tests__/fixtures/wacc.json.
 * Tax rate IS!B33 = 0 (empty cell, treated as 0 by Excel).
 */
const PRECISION = 12

const TAX_RATE = 0 // IS!B33 is empty → 0 in Excel formulas

const COMPANIES = [
  { betaLevered: 1.2, marketCap: 1_000_000_000, debt: 800_000_000 },
  { betaLevered: 0.7, marketCap: 1_000_000_000, debt: 850_000_000 },
  { betaLevered: 0.6, marketCap: 1_000_000_000, debt: 2_700_000_000 },
] as const

const MARKET_PARAMS = {
  equityRiskPremium: 0.0762,
  ratingBasedDefaultSpread: 0.0226,
  riskFree: 0.027,
}

const AVG_BANK_RATE = 0.13 // AVERAGE(B27:B29) = 0.13

describe('computeBetaUnlevered — Hamada equation', () => {
  it('company 1 (BL=1.2, D/E=0.8) → E11', () => {
    const bu = computeBetaUnlevered(1.2, TAX_RATE, 800_000_000, 1_000_000_000)
    expect(bu).toBeCloseTo(0.6666666666666666, PRECISION)
  })

  it('company 2 (BL=0.7, D/E=0.85) → E12', () => {
    const bu = computeBetaUnlevered(0.7, TAX_RATE, 850_000_000, 1_000_000_000)
    expect(bu).toBeCloseTo(0.37837837837837834, PRECISION)
  })

  it('company 3 (BL=0.6, D/E=2.7) → E13', () => {
    const bu = computeBetaUnlevered(0.6, TAX_RATE, 2_700_000_000, 1_000_000_000)
    expect(bu).toBeCloseTo(0.16216216216216214, PRECISION)
  })

  it('zero marketCap returns 0', () => {
    expect(computeBetaUnlevered(1.2, 0, 800, 0)).toBe(0)
  })
})

describe('computeRelleveredBeta', () => {
  it('matches fixture E15 = 0.9858858858858859', () => {
    const avgBU = 0.4024024024024024 // E14 = AVERAGE(E11:E13)
    const totalDebt = 4_350_000_000 // D14
    const totalMC = 3_000_000_000 // C14
    const bl = computeRelleveredBeta(avgBU, TAX_RATE, totalDebt, totalMC)
    expect(bl).toBeCloseTo(0.9858858858858859, PRECISION)
  })
})

describe('computeWacc — full pipeline matches fixture', () => {
  const result = computeWacc(COMPANIES, TAX_RATE, MARKET_PARAMS, AVG_BANK_RATE)

  it('per-company BU matches E11:E13', () => {
    expect(result.betaUnlevered[0]).toBeCloseTo(0.6666666666666666, PRECISION)
    expect(result.betaUnlevered[1]).toBeCloseTo(0.37837837837837834, PRECISION)
    expect(result.betaUnlevered[2]).toBeCloseTo(0.16216216216216214, PRECISION)
  })

  it('avgBetaLevered matches B14', () => {
    expect(result.avgBetaLevered).toBeCloseTo(0.8333333333333334, PRECISION)
  })

  it('totalMarketCap matches C14', () => {
    expect(result.totalMarketCap).toBe(3_000_000_000)
  })

  it('totalDebt matches D14', () => {
    expect(result.totalDebt).toBe(4_350_000_000)
  })

  it('avgBetaUnlevered matches E14', () => {
    expect(result.avgBetaUnlevered).toBeCloseTo(0.4024024024024024, PRECISION)
  })

  it('relleveredBeta matches E15', () => {
    expect(result.relleveredBeta).toBeCloseTo(0.9858858858858859, PRECISION)
  })

  it('weightDebt matches C19', () => {
    expect(result.weightDebt).toBeCloseTo(0.5918367346938775, PRECISION)
  })

  it('weightEquity matches C20', () => {
    expect(result.weightEquity).toBeCloseTo(0.40816326530612246, PRECISION)
  })

  it('costOfDebt (after-tax) matches D19 = 0.13', () => {
    // D19 = B30 * (1 - IS!B33) = 0.13 * (1 - 0) = 0.13
    expect(result.costOfDebt).toBeCloseTo(0.13, PRECISION)
  })

  it('costOfEquity matches D20', () => {
    // D20 = Rf + (E15 * ERP) - RBDS = 0.027 + (0.9859 * 0.0762) - 0.0226
    expect(result.costOfEquity).toBeCloseTo(0.0795245045045045, PRECISION)
  })

  it('waccDebtComponent matches E19', () => {
    expect(result.waccDebtComponent).toBeCloseTo(0.07693877551020409, PRECISION)
  })

  it('waccEquityComponent matches E20', () => {
    expect(result.waccEquityComponent).toBeCloseTo(0.032458981430410004, PRECISION)
  })

  it('computedWacc = E19 + E20 (NOT E22 which is hardcoded override)', () => {
    expect(result.computedWacc).toBeCloseTo(
      0.07693877551020409 + 0.032458981430410004,
      PRECISION,
    )
  })
})

describe('computeWacc — edge cases', () => {
  it('empty companies array zeroes beta-related fields', () => {
    const result = computeWacc([], TAX_RATE, MARKET_PARAMS, AVG_BANK_RATE)
    expect(result.avgBetaLevered).toBe(0)
    expect(result.avgBetaUnlevered).toBe(0)
    expect(result.relleveredBeta).toBe(0)
    expect(result.weightDebt).toBe(0)
    expect(result.weightEquity).toBe(1)
    // costOfEquity still computed from Rf - RBDS with zero beta
    expect(result.costOfEquity).toBeCloseTo(0.027 - 0.0226, PRECISION)
  })
})

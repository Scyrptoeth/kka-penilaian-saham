import { describe, expect, it } from 'vitest'
import { computeProyAccPayablesLive, type ProyAccPayablesInput } from '@/data/live/compute-proy-acc-payables-live'

/**
 * PROY ACC PAYABLES — all balances are 0 in the prototype.
 * Tests verify structural correctness of the loan schedule pattern.
 */

const INPUT: ProyAccPayablesInput = {
  interestRateST: 0.14,
  interestRateLT: 0.13,
  stEnding: 0,
  ltEnding: 0,
}

const HIST_YEAR = 2021
const PROJ_YEARS = [2022, 2023, 2024] as const

describe('computeProyAccPayablesLive — structural tests', () => {
  const result = computeProyAccPayablesLive(INPUT, HIST_YEAR, PROJ_YEARS)

  it('all balances are 0 (no loans in prototype)', () => {
    for (const year of PROJ_YEARS) {
      expect(result[13]?.[year]).toBe(0) // ST Ending
      expect(result[22]?.[year]).toBe(0) // LT Ending
    }
  })

  it('ST Beginning = prev Ending', () => {
    expect(result[10]?.[2022]).toBe(0) // prev ending = 0
  })

  it('ST Ending = Beginning + Addition + Repayment', () => {
    for (const year of PROJ_YEARS) {
      const beg = result[10]?.[year] ?? 0
      const add = result[11]?.[year] ?? 0
      const rep = result[12]?.[year] ?? 0
      expect(result[13]?.[year]).toBe(beg + add + rep)
    }
  })

  it('LT Ending = Beginning + Addition + Repayment', () => {
    for (const year of PROJ_YEARS) {
      const beg = result[19]?.[year] ?? 0
      const add = result[20]?.[year] ?? 0
      const rep = result[21]?.[year] ?? 0
      expect(result[22]?.[year]).toBe(beg + add + rep)
    }
  })

  it('ST Interest = Ending * rate * -1', () => {
    for (const year of PROJ_YEARS) {
      expect(result[15]?.[year]).toBe(0 * 0.14 * -1)
    }
  })

  it('LT Repayment is 0 (consumed by PROY CFS row 26)', () => {
    for (const year of PROJ_YEARS) {
      expect(result[21]?.[year]).toBe(0)
    }
  })
})

describe('computeProyAccPayablesLive — with non-zero balances', () => {
  const inputWithLoans: ProyAccPayablesInput = {
    interestRateST: 0.14,
    interestRateLT: 0.13,
    stEnding: 1_000_000,
    ltEnding: 5_000_000,
  }

  const result = computeProyAccPayablesLive(inputWithLoans, HIST_YEAR, PROJ_YEARS)

  it('ST loan carries forward (no addition/repayment)', () => {
    expect(result[10]?.[2022]).toBe(1_000_000) // Beginning = hist ending
    expect(result[13]?.[2022]).toBe(1_000_000) // Ending = beg + 0 + 0
    expect(result[13]?.[2023]).toBe(1_000_000)
  })

  it('ST interest computed correctly', () => {
    // 1_000_000 * 0.14 * -1 = -140_000
    expect(result[15]?.[2022]).toBe(-140_000)
  })

  it('LT loan carries forward', () => {
    expect(result[19]?.[2022]).toBe(5_000_000)
    expect(result[22]?.[2022]).toBe(5_000_000)
  })

  it('LT interest computed correctly', () => {
    // 5_000_000 * 0.13 * -1 = -650_000
    expect(result[24]?.[2022]).toBe(-650_000)
  })
})

import { describe, expect, it } from 'vitest'
import { computeGrowthRateLive } from '@/data/live/compute-growth-rate-live'
import type { YearKeyedSeries } from '@/types/financial'

const PRECISION = 12

/**
 * Construct upstream rows matching fixture values:
 * - BS rows 16 (Current Assets), 22 (Fixed Assets Net)
 * - FA row 69 (Total Net FA)
 * - ROIC row 12 (Total IC End)
 *
 * BS years: 2018-2021, FA/ROIC years: 2019-2021
 */
const BS_ROWS: Record<number, YearKeyedSeries> = {
  16: { 2018: 0, 2019: 19_602_444_657, 2020: 23_960_644_462, 2021: 27_371_778_788 },
  22: { 2018: 0, 2019: 6_123_781_380, 2020: 6_012_024_389, 2021: 6_264_339_945 },
}

const FA_ROWS: Record<number, YearKeyedSeries> = {
  69: { 2019: 6_123_781_380, 2020: 6_012_024_389, 2021: 6_264_339_945 },
}

const ROIC_ROWS: Record<number, YearKeyedSeries> = {
  12: { 2019: 18_026_516_004, 2020: 26_637_969_936, 2021: 27_000_976_515 },
}

const ROIC_YEARS = [2019, 2020, 2021] as const

describe('computeGrowthRateLive — fixture-grounded', () => {
  const output = computeGrowthRateLive(BS_ROWS, FA_ROWS, ROIC_ROWS, ROIC_YEARS)

  it('produces 2 years of growth rate data', () => {
    expect(output).not.toBeNull()
    expect(output!.years).toEqual([2020, 2021])
  })

  it('totalNetInvestment[0] (2020) = 4246442814 matches B10', () => {
    expect(output!.result.totalNetInvestment[0]).toBe(4_246_442_814)
  })

  it('totalNetInvestment[1] (2021) = 3663449882 matches C10', () => {
    expect(output!.result.totalNetInvestment[1]).toBe(3_663_449_882)
  })

  it('growthRates[0] (2020) matches B14', () => {
    expect(output!.result.growthRates[0]).toBeCloseTo(0.2355664740240285, PRECISION)
  })

  it('growthRates[1] (2021) matches C14', () => {
    expect(output!.result.growthRates[1]).toBeCloseTo(0.1375273675434634, PRECISION)
  })

  it('average matches B15 = 0.18654692078374596', () => {
    expect(output!.result.average).toBeCloseTo(0.18654692078374596, PRECISION)
  })
})

describe('computeGrowthRateLive — edge cases', () => {
  it('returns null when roicYears has fewer than 2 entries', () => {
    expect(computeGrowthRateLive(BS_ROWS, FA_ROWS, ROIC_ROWS, [2021])).toBeNull()
  })

  it('handles missing upstream rows gracefully (zeros)', () => {
    const output = computeGrowthRateLive({}, {}, {}, [2019, 2020])
    expect(output).not.toBeNull()
    expect(output!.result.totalNetInvestment[0]).toBe(0)
    expect(output!.result.growthRates[0]).toBe(0)
  })
})

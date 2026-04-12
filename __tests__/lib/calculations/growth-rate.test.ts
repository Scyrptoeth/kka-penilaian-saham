import { describe, expect, it } from 'vitest'
import { computeGrowthRate } from '@/lib/calculations/growth-rate'

const PRECISION = 12

/**
 * Fixture values from __tests__/fixtures/growth-rate.json.
 * 2 years only: 2020 (col B), 2021 (col C).
 *
 * Row 6: Net FA End of Year — FA!D69, FA!E69
 * Row 7: Net CA End of Year — BS!E16, BS!F16
 * Row 8: Less: Net FA Beg — BS!D22*-1, BS!E22*-1
 * Row 9: Less: Net CA Beg — BS!D16*-1, BS!E16*-1
 * Row 10: Total Net Investment = SUM(B6:B9)
 * Row 12: Total IC BOY — ROIC!B12, ROIC!C12
 * Row 14: Growth Rate = B10/B12
 * Row 15: Average = AVERAGE(B14:C14)
 */
const INPUT = {
  // Positive values from source sheets
  netFaEnd: [6_012_024_389, 6_264_339_945],       // FA row 69: D69, E69
  netCaEnd: [23_960_644_462, 27_371_778_788],      // BS row 16: E16, F16
  // Already negated (sign convention from Growth Rate sheet)
  netFaBeg: [-6_123_781_380, -6_012_024_389],      // BS row 22 * -1
  netCaBeg: [-19_602_444_657, -23_960_644_462],     // BS row 16 prior year * -1
  totalIcBoy: [18_026_516_004, 26_637_969_936],     // ROIC row 12: B12, C12
}

describe('computeGrowthRate — matches fixture', () => {
  const result = computeGrowthRate(INPUT)

  it('totalNetInvestment[0] matches B10 = 4246442814', () => {
    expect(result.totalNetInvestment[0]).toBe(4_246_442_814)
  })

  it('totalNetInvestment[1] matches C10 = 3663449882', () => {
    expect(result.totalNetInvestment[1]).toBe(3_663_449_882)
  })

  it('growthRates[0] matches B14 = 0.2355664740240285', () => {
    expect(result.growthRates[0]).toBeCloseTo(0.2355664740240285, PRECISION)
  })

  it('growthRates[1] matches C14 = 0.1375273675434634', () => {
    expect(result.growthRates[1]).toBeCloseTo(0.1375273675434634, PRECISION)
  })

  it('average matches B15 = 0.18654692078374596', () => {
    expect(result.average).toBeCloseTo(0.18654692078374596, PRECISION)
  })
})

describe('computeGrowthRate — edge cases', () => {
  it('empty arrays produce average 0', () => {
    const result = computeGrowthRate({
      netFaEnd: [],
      netCaEnd: [],
      netFaBeg: [],
      netCaBeg: [],
      totalIcBoy: [],
    })
    expect(result.average).toBe(0)
    expect(result.growthRates).toEqual([])
  })

  it('zero IC produces growth rate 0 (no division by zero)', () => {
    const result = computeGrowthRate({
      netFaEnd: [100],
      netCaEnd: [200],
      netFaBeg: [-50],
      netCaBeg: [-100],
      totalIcBoy: [0],
    })
    expect(result.growthRates[0]).toBe(0)
  })
})

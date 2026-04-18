import { describe, expect, it } from 'vitest'
import {
  PROJECTION_YEAR_COUNT,
  computeHistoricalYears,
  computeProjectionYears,
} from '@/lib/calculations/year-helpers'

describe('computeHistoricalYears', () => {
  it('returns 4 ascending years ending at tahunTransaksi − 1', () => {
    expect(computeHistoricalYears(2022, 4)).toEqual([2018, 2019, 2020, 2021])
  })

  it('returns 3 ascending years ending at tahunTransaksi − 1', () => {
    expect(computeHistoricalYears(2022, 3)).toEqual([2019, 2020, 2021])
  })

  it('handles tahunTransaksi = 2025 with 4-year span', () => {
    expect(computeHistoricalYears(2025, 4)).toEqual([2021, 2022, 2023, 2024])
  })

  it('handles tahunTransaksi = 2019 with 3-year span', () => {
    expect(computeHistoricalYears(2019, 3)).toEqual([2016, 2017, 2018])
  })

  it('returns array of correct length', () => {
    expect(computeHistoricalYears(2024, 4)).toHaveLength(4)
    expect(computeHistoricalYears(2024, 3)).toHaveLength(3)
  })

  it('last element always equals tahunTransaksi − 1', () => {
    const years4 = computeHistoricalYears(2024, 4)
    const years3 = computeHistoricalYears(2024, 3)
    expect(years4[years4.length - 1]).toBe(2023)
    expect(years3[years3.length - 1]).toBe(2023)
  })
})

describe('computeProjectionYears', () => {
  it('defaults to PROJECTION_YEAR_COUNT (3) when count omitted', () => {
    expect(computeProjectionYears(2022)).toEqual([2022, 2023, 2024])
    expect(computeProjectionYears(2022)).toHaveLength(PROJECTION_YEAR_COUNT)
  })

  it('accepts explicit count for Key Drivers 7-year horizon', () => {
    expect(computeProjectionYears(2022, 7)).toEqual([
      2022, 2023, 2024, 2025, 2026, 2027, 2028,
    ])
  })

  it('returns ascending years starting from tahunTransaksi', () => {
    expect(computeProjectionYears(2030, 5)).toEqual([
      2030, 2031, 2032, 2033, 2034,
    ])
  })

  it('handles count = 1 (single projection year)', () => {
    expect(computeProjectionYears(2022, 1)).toEqual([2022])
  })
})

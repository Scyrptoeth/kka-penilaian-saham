import { describe, expect, it } from 'vitest'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'

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

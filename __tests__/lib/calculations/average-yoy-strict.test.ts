import { describe, it, expect } from 'vitest'
import { averageYoYStrict } from '@/lib/calculations/derivation-helpers'

describe('averageYoYStrict', () => {
  const years = [2018, 2019, 2020, 2021]

  it('returns null when fewer than 2 real YoY observations (single trailing value)', () => {
    // Only 2021 has value → YoY 2021 has prev=undefined → not real → 0 real obs
    const series = { 2021: 81_022 }
    expect(averageYoYStrict(series, years)).toBeNull()
  })

  it('returns null when only 1 real YoY observation (two trailing values)', () => {
    // 2020: 48115, 2021: 81022 → YoY 2021 real (prev=48115≠0), others unreal
    const series = { 2020: 48_115, 2021: 81_022 }
    expect(averageYoYStrict(series, years)).toBeNull()
  })

  it('returns null when series is undefined', () => {
    expect(averageYoYStrict(undefined, years)).toBeNull()
  })

  it('returns null when historicalYears has < 2 entries', () => {
    expect(averageYoYStrict({ 2021: 100 }, [2021])).toBeNull()
    expect(averageYoYStrict({}, [])).toBeNull()
  })

  it('returns mean of real YoY when ≥ 2 real observations', () => {
    // 2019: 100, 2020: 200, 2021: 300
    // YoY 2020: (200-100)/100 = 1.0
    // YoY 2021: (300-200)/200 = 0.5
    // 2 real obs → mean = 0.75
    const series = { 2019: 100, 2020: 200, 2021: 300 }
    expect(averageYoYStrict(series, years)).toBeCloseTo(0.75, 10)
  })

  it('skips YoY pairs where prev value is missing (null/undefined)', () => {
    // 2018: null, 2019: 100, 2020: 200, 2021: 300 → only 2020 + 2021 YoY real
    const series = { 2019: 100, 2020: 200, 2021: 300 }
    expect(averageYoYStrict(series, years)).toBeCloseTo(0.75, 10)
  })

  it('skips YoY pairs where prev is explicit zero', () => {
    // 2018: 0, 2019: 0, 2020: 50, 2021: 100
    // YoY 2019: prev=0 → skip
    // YoY 2020: prev=0 → skip
    // YoY 2021: prev=50 → real, (100-50)/50 = 1.0
    // 1 real obs < 2 → null
    const series = { 2018: 0, 2019: 0, 2020: 50, 2021: 100 }
    expect(averageYoYStrict(series, years)).toBeNull()
  })

  it('counts trailing null as non-real pair (curr must be defined)', () => {
    // 2019: 100, 2020: 200, 2021: null/undefined
    // YoY 2020: real (1.0). YoY 2021: curr missing → not real.
    // 1 real → null
    const series = { 2019: 100, 2020: 200 }
    expect(averageYoYStrict(series, years)).toBeNull()
  })

  it('handles negative values and negative growth correctly', () => {
    // 2018: 100, 2019: -50, 2020: -100, 2021: -200
    // YoY 2019: (-50 - 100)/100 = -1.5
    // YoY 2020: (-100 - (-50))/-50 = -50/-50 = 1.0
    // YoY 2021: (-200 - (-100))/-100 = 1.0
    // 3 real obs → (-1.5 + 1.0 + 1.0) / 3 = 0.1667
    const series = { 2018: 100, 2019: -50, 2020: -100, 2021: -200 }
    expect(averageYoYStrict(series, years)).toBeCloseTo(0.5 / 3, 10)
  })

  it('Setara Kas real-world case returns null (only 1 real YoY)', () => {
    // User case: 2020: 191M, 2021: 635M, earlier years undefined
    // Only 1 real YoY → null → Proy BS projects flat
    const series = { 2020: 191_000_000, 2021: 635_077_549 }
    expect(averageYoYStrict(series, years)).toBeNull()
  })
})

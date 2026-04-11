import { describe, expect, it } from 'vitest'
import {
  computeDlocPercentage,
  lookupDlocRange,
} from '@/lib/calculations/dloc'

const PRECISION = 12

describe('lookupDlocRange — matches DLOC(PFC)!B22 formula (jenisPerusahaan only)', () => {
  it('tertutup → 30% - 70%', () => {
    expect(lookupDlocRange('tertutup')).toEqual({ min: 0.3, max: 0.7 })
  })

  it('terbuka → 20% - 35%', () => {
    expect(lookupDlocRange('terbuka')).toEqual({ min: 0.2, max: 0.35 })
  })
})

describe('computeDlocPercentage — matches DLOC(PFC)!E24 fixture', () => {
  it('reproduces fixture: scores [1, 0.5, 0.5, 0.5, 0.5] = 3/5 in tertutup range → 0.54', () => {
    const result = computeDlocPercentage({
      totalScore: 3,
      maxScore: 5,
      jenisPerusahaan: 'tertutup',
    })
    expect(result.range).toEqual({ min: 0.3, max: 0.7 })
    expect(result.percentage).toBeCloseTo(0.54, PRECISION)
  })

  it('zero score → range.min', () => {
    const result = computeDlocPercentage({
      totalScore: 0,
      maxScore: 5,
      jenisPerusahaan: 'tertutup',
    })
    expect(result.percentage).toBeCloseTo(0.3, PRECISION)
  })

  it('full score → range.max', () => {
    const result = computeDlocPercentage({
      totalScore: 5,
      maxScore: 5,
      jenisPerusahaan: 'tertutup',
    })
    expect(result.percentage).toBeCloseTo(0.7, PRECISION)
  })

  it('terbuka mid-range: 2.5/5 → midpoint of 20-35% = 0.275', () => {
    const result = computeDlocPercentage({
      totalScore: 2.5,
      maxScore: 5,
      jenisPerusahaan: 'terbuka',
    })
    expect(result.percentage).toBeCloseTo(0.275, PRECISION)
  })

  it('zero maxScore → returns range.min (no division by zero)', () => {
    const result = computeDlocPercentage({
      totalScore: 0,
      maxScore: 0,
      jenisPerusahaan: 'terbuka',
    })
    expect(result.percentage).toBeCloseTo(0.2, PRECISION)
  })
})

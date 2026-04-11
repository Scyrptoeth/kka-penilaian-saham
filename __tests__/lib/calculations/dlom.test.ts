import { describe, expect, it } from 'vitest'
import {
  computeDlomPercentage,
  lookupDlomRange,
} from '@/lib/calculations/dlom'

const PRECISION = 12

describe('lookupDlomRange — matches DLOM!C32 IF chain', () => {
  it('tertutup + minoritas → 30% - 50%', () => {
    expect(lookupDlomRange('tertutup', 'minoritas')).toEqual({
      min: 0.3,
      max: 0.5,
    })
  })

  it('tertutup + mayoritas → 20% - 40%', () => {
    expect(lookupDlomRange('tertutup', 'mayoritas')).toEqual({
      min: 0.2,
      max: 0.4,
    })
  })

  it('terbuka + minoritas → 10% - 30%', () => {
    expect(lookupDlomRange('terbuka', 'minoritas')).toEqual({
      min: 0.1,
      max: 0.3,
    })
  })

  it('terbuka + mayoritas → 0% - 20%', () => {
    expect(lookupDlomRange('terbuka', 'mayoritas')).toEqual({
      min: 0.0,
      max: 0.2,
    })
  })
})

describe('computeDlomPercentage — matches DLOM!F34 fixture', () => {
  it('reproduces fixture: all 10 factors scored 1, tertutup + mayoritas → 0.40', () => {
    const result = computeDlomPercentage({
      totalScore: 10,
      maxScore: 10,
      jenisPerusahaan: 'tertutup',
      kepemilikan: 'mayoritas',
    })
    expect(result.range).toEqual({ min: 0.2, max: 0.4 })
    expect(result.percentage).toBeCloseTo(0.4, PRECISION)
  })

  it('mid-range: 5/10 score in tertutup+mayoritas range = midpoint 0.30', () => {
    const result = computeDlomPercentage({
      totalScore: 5,
      maxScore: 10,
      jenisPerusahaan: 'tertutup',
      kepemilikan: 'mayoritas',
    })
    expect(result.percentage).toBeCloseTo(0.3, PRECISION)
  })

  it('zero score → range.min', () => {
    const result = computeDlomPercentage({
      totalScore: 0,
      maxScore: 10,
      jenisPerusahaan: 'tertutup',
      kepemilikan: 'minoritas',
    })
    expect(result.percentage).toBeCloseTo(0.3, PRECISION)
  })

  it('zero maxScore → returns range.min (no division by zero)', () => {
    const result = computeDlomPercentage({
      totalScore: 0,
      maxScore: 0,
      jenisPerusahaan: 'terbuka',
      kepemilikan: 'mayoritas',
    })
    expect(result.percentage).toBeCloseTo(0.0, PRECISION)
  })

  it('terbuka + mayoritas: full score → 0.20 (top of range)', () => {
    const result = computeDlomPercentage({
      totalScore: 10,
      maxScore: 10,
      jenisPerusahaan: 'terbuka',
      kepemilikan: 'mayoritas',
    })
    expect(result.percentage).toBeCloseTo(0.2, PRECISION)
  })
})

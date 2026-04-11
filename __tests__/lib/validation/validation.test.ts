/**
 * Zod validation layer tests.
 *
 * Covers boundary rejections that the pure calc functions would otherwise
 * surface as opaque RangeErrors: NaN, Infinity, empty year sets, year-set
 * mismatches across fields, and invalid year keys.
 */

import { describe, expect, it } from 'vitest'
import {
  ValidationError,
  validatedFcf,
  validatedGrowthRevenue,
  validatedNoplat,
  yearKeyedSeriesSchema,
} from '@/lib/validation'

const validNoplatInput = () => ({
  profitBeforeTax: { 2019: 100, 2020: 200, 2021: 300 },
  interestExpense: { 2019: 0, 2020: 10, 2021: 20 },
  interestIncome: { 2019: 0, 2020: -5, 2021: -10 },
  nonOperatingIncome: { 2019: 0, 2020: 0, 2021: 0 },
  taxProvision: { 2019: 25, 2020: 50, 2021: 75 },
})

describe('yearKeyedSeriesSchema', () => {
  it('accepts a valid year-keyed series', () => {
    const r = yearKeyedSeriesSchema.safeParse({ 2019: 10, 2020: 20 })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data).toEqual({ 2019: 10, 2020: 20 })
  })

  it('rejects NaN values', () => {
    const r = yearKeyedSeriesSchema.safeParse({ 2019: Number.NaN })
    expect(r.success).toBe(false)
  })

  it('rejects Infinity values', () => {
    const r = yearKeyedSeriesSchema.safeParse({ 2019: Number.POSITIVE_INFINITY })
    expect(r.success).toBe(false)
  })

  it('rejects empty object', () => {
    const r = yearKeyedSeriesSchema.safeParse({})
    expect(r.success).toBe(false)
  })

  it('rejects year keys outside plausible range', () => {
    const r = yearKeyedSeriesSchema.safeParse({ 1799: 10 })
    expect(r.success).toBe(false)
  })

  it('rejects non-integer year keys', () => {
    const r = yearKeyedSeriesSchema.safeParse({ 'abc': 10 })
    expect(r.success).toBe(false)
  })
})

describe('validatedNoplat', () => {
  it('accepts clean input and delegates to computeNoplat', () => {
    const result = validatedNoplat(validNoplatInput())
    expect(result.ebit[2019]).toBe(100 + 0 + 0 + 0)
    expect(result.ebit[2021]).toBe(300 + 20 + -10 + 0)
    expect(result.noplat[2020]).toBe(200 + 10 + -5 + 0 - 50)
  })

  it('throws ValidationError with path info on mismatched year set', () => {
    const input = validNoplatInput()
    input.interestExpense = { 2019: 0, 2020: 0, 2022: 0 }
    try {
      validatedNoplat(input)
      expect.fail('expected ValidationError to be thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError)
      expect((err as ValidationError).message).toMatch(/interestExpense/)
    }
  })

  it('throws ValidationError on NaN value', () => {
    const input = validNoplatInput()
    input.taxProvision = { 2019: Number.NaN, 2020: 50, 2021: 75 }
    expect(() => validatedNoplat(input)).toThrow(ValidationError)
  })

  it('rejects completely missing required field', () => {
    const input = validNoplatInput() as unknown as Record<string, unknown>
    delete input.profitBeforeTax
    expect(() => validatedNoplat(input)).toThrow(ValidationError)
  })
})

describe('validatedFcf', () => {
  it('accepts clean input', () => {
    const result = validatedFcf({
      noplat: { 2019: 1000, 2020: 2000 },
      depreciationAddback: { 2019: -100, 2020: -120 },
      deltaCurrentAssets: { 2019: 0, 2020: 0 },
      deltaCurrentLiabilities: { 2019: 0, 2020: 0 },
      capex: { 2019: -50, 2020: -60 },
    })
    expect(result.grossCashFlow[2019]).toBe(900)
    expect(result.freeCashFlow[2020]).toBe(2000 - 120 - 60)
  })

  it('rejects Infinity in any field', () => {
    expect(() =>
      validatedFcf({
        noplat: { 2019: Number.POSITIVE_INFINITY },
        depreciationAddback: { 2019: 0 },
        deltaCurrentAssets: { 2019: 0 },
        deltaCurrentLiabilities: { 2019: 0 },
        capex: { 2019: 0 },
      }),
    ).toThrow(ValidationError)
  })
})

describe('validatedGrowthRevenue', () => {
  it('accepts clean 4-year input', () => {
    const result = validatedGrowthRevenue({
      sales: { 2018: 100, 2019: 150, 2020: 180, 2021: 200 },
      netIncome: { 2018: 10, 2019: 15, 2020: 18, 2021: 20 },
    })
    expect(result.salesGrowth[2019]).toBeCloseTo(0.5, 10)
  })

  it('rejects single-year input with min-years message', () => {
    const r = validatedGrowthRevenue
    expect(() =>
      r({ sales: { 2020: 100 }, netIncome: { 2020: 10 } }),
    ).toThrow(/at least 2 years/)
  })

  it('rejects NaN in netIncome', () => {
    expect(() =>
      validatedGrowthRevenue({
        sales: { 2019: 1, 2020: 2 },
        netIncome: { 2019: 0, 2020: Number.NaN },
      }),
    ).toThrow(ValidationError)
  })
})

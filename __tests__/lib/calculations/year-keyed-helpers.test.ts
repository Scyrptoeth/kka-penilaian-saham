import { describe, expect, it } from 'vitest'
import {
  yearsOf,
  assertSameYears,
  emptySeriesLike,
  mapSeries,
  seriesFromArray,
  seriesToArray,
} from '@/lib/calculations/helpers'
import type { YearKeyedSeries } from '@/types/financial'

describe('yearsOf', () => {
  it('returns ascending years from an unsorted object', () => {
    const s: YearKeyedSeries = { 2021: 10, 2019: 5, 2020: 7 }
    expect(yearsOf(s)).toEqual([2019, 2020, 2021])
  })

  it('handles single-year series', () => {
    expect(yearsOf({ 2020: 1 })).toEqual([2020])
  })

  it('handles empty series', () => {
    expect(yearsOf({})).toEqual([])
  })

  it('handles non-contiguous years', () => {
    expect(yearsOf({ 2018: 1, 2021: 2, 2024: 3 })).toEqual([2018, 2021, 2024])
  })
})

describe('assertSameYears', () => {
  it('passes when year sets match exactly', () => {
    expect(() =>
      assertSameYears('test', { 2019: 1, 2020: 2 }, { 2019: 10, 2020: 20 }),
    ).not.toThrow()
  })

  it('throws when year counts differ', () => {
    expect(() =>
      assertSameYears('noplat.interestExpense', { 2019: 1 }, { 2019: 1, 2020: 2 }),
    ).toThrow(/year count mismatch/)
  })

  it('throws when year sets differ at the same length', () => {
    expect(() =>
      assertSameYears('fcf.capex', { 2019: 1, 2020: 2 }, { 2020: 1, 2021: 2 }),
    ).toThrow(/year set mismatch/)
  })
})

describe('emptySeriesLike', () => {
  it('produces zero-valued series with same years as template', () => {
    const template: YearKeyedSeries = { 2019: 10, 2020: 20, 2021: 30 }
    expect(emptySeriesLike(template)).toEqual({ 2019: 0, 2020: 0, 2021: 0 })
  })

  it('returns a fresh object (does not mutate template)', () => {
    const template: YearKeyedSeries = { 2020: 100 }
    const out = emptySeriesLike(template)
    out[2020] = 999
    expect(template[2020]).toBe(100)
  })
})

describe('mapSeries', () => {
  it('applies the function to every value and preserves year keys', () => {
    expect(mapSeries({ 2019: 1, 2020: 2, 2021: 3 }, (v) => v * 10)).toEqual({
      2019: 10,
      2020: 20,
      2021: 30,
    })
  })

  it('passes the year to the callback', () => {
    expect(mapSeries({ 2019: 0, 2020: 0 }, (_v, y) => y)).toEqual({
      2019: 2019,
      2020: 2020,
    })
  })
})

describe('seriesFromArray / seriesToArray round-trip', () => {
  it('builds a series keyed by year', () => {
    expect(seriesFromArray([2019, 2020, 2021], [5, 7, 11])).toEqual({
      2019: 5,
      2020: 7,
      2021: 11,
    })
  })

  it('throws on length mismatch', () => {
    expect(() => seriesFromArray([2019, 2020], [1, 2, 3])).toThrow(
      /length mismatch/,
    )
  })

  it('round-trips through array form', () => {
    const original = seriesFromArray([2019, 2020, 2021], [5, 7, 11])
    expect(seriesToArray(original)).toEqual([5, 7, 11])
  })

  it('seriesToArray returns values in ascending year order regardless of insertion order', () => {
    const shuffled: YearKeyedSeries = { 2021: 30, 2019: 10, 2020: 20 }
    expect(seriesToArray(shuffled)).toEqual([10, 20, 30])
  })
})

import { describe, it, expect } from 'vitest'
import { computeInvestedCapital } from '@/lib/calculations/compute-invested-capital'
import type { YearKeyedSeries } from '@/types/financial'
import type { InvestedCapitalState } from '@/lib/store/useKkaStore'

const YEARS = [2020, 2021, 2022] as const

function emptyScope(): InvestedCapitalState {
  return {
    otherNonOperatingAssets: [],
    excessCash: [],
    marketableSecurities: [],
  }
}

describe('computeInvestedCapital', () => {
  it('returns zero-for-every-year objects when scope is empty', () => {
    const result = computeInvestedCapital({
      scope: emptyScope(),
      bsRows: {},
      faRows: {},
      years: YEARS,
    })

    for (const row of [
      result.otherNonOperatingAssets,
      result.excessCash,
      result.marketableSecurities,
    ]) {
      expect(row).toEqual({ 2020: 0, 2021: 0, 2022: 0 })
    }
  })

  it('aggregates a single BS source across years', () => {
    const bsRows: Record<number, YearKeyedSeries> = {
      100: { 2020: 10, 2021: 20, 2022: 30 },
    }
    const scope = emptyScope()
    scope.otherNonOperatingAssets = [{ source: 'bs', excelRow: 100 }]

    const result = computeInvestedCapital({
      scope,
      bsRows,
      faRows: {},
      years: YEARS,
    })

    expect(result.otherNonOperatingAssets).toEqual({
      2020: 10,
      2021: 20,
      2022: 30,
    })
    expect(result.excessCash).toEqual({ 2020: 0, 2021: 0, 2022: 0 })
    expect(result.marketableSecurities).toEqual({ 2020: 0, 2021: 0, 2022: 0 })
  })

  it('reads FA sources from excelRow + FA_OFFSET.NET_VALUE (7000)', () => {
    const faRows: Record<number, YearKeyedSeries> = {
      // excelRow 50 + 7000 = 7050 is the NET_VALUE row
      7050: { 2020: 5, 2021: 15, 2022: 25 },
    }
    const scope = emptyScope()
    scope.excessCash = [{ source: 'fa', excelRow: 50 }]

    const result = computeInvestedCapital({
      scope,
      bsRows: {},
      faRows,
      years: YEARS,
    })

    expect(result.excessCash).toEqual({ 2020: 5, 2021: 15, 2022: 25 })
  })

  it('sums mixed BS + FA sources into the same row', () => {
    const bsRows: Record<number, YearKeyedSeries> = {
      200: { 2020: 1, 2021: 2, 2022: 3 },
    }
    const faRows: Record<number, YearKeyedSeries> = {
      7080: { 2020: 10, 2021: 20, 2022: 30 },
    }
    const scope = emptyScope()
    scope.marketableSecurities = [
      { source: 'bs', excelRow: 200 },
      { source: 'fa', excelRow: 80 },
    ]

    const result = computeInvestedCapital({
      scope,
      bsRows,
      faRows,
      years: YEARS,
    })

    expect(result.marketableSecurities).toEqual({
      2020: 11,
      2021: 22,
      2022: 33,
    })
  })

  it('sums multiple refs in a single row', () => {
    const bsRows: Record<number, YearKeyedSeries> = {
      10: { 2020: 1, 2021: 1, 2022: 1 },
      11: { 2020: 2, 2021: 2, 2022: 2 },
      12: { 2020: 3, 2021: 3, 2022: 3 },
    }
    const scope = emptyScope()
    scope.otherNonOperatingAssets = [
      { source: 'bs', excelRow: 10 },
      { source: 'bs', excelRow: 11 },
      { source: 'bs', excelRow: 12 },
    ]

    const result = computeInvestedCapital({
      scope,
      bsRows,
      faRows: {},
      years: YEARS,
    })

    expect(result.otherNonOperatingAssets).toEqual({
      2020: 6,
      2021: 6,
      2022: 6,
    })
  })

  it('defaults missing years to 0 (not NaN)', () => {
    const bsRows: Record<number, YearKeyedSeries> = {
      // Only 2020 and 2022 present; 2021 is missing
      300: { 2020: 10, 2022: 30 },
    }
    const scope = emptyScope()
    scope.excessCash = [{ source: 'bs', excelRow: 300 }]

    const result = computeInvestedCapital({
      scope,
      bsRows,
      faRows: {},
      years: YEARS,
    })

    expect(result.excessCash[2020]).toBe(10)
    expect(result.excessCash[2021]).toBe(0)
    expect(result.excessCash[2022]).toBe(30)
    expect(Number.isNaN(result.excessCash[2021])).toBe(false)
  })

  it('preserves negative source values', () => {
    const bsRows: Record<number, YearKeyedSeries> = {
      400: { 2020: -5, 2021: -10, 2022: -15 },
    }
    const scope = emptyScope()
    scope.otherNonOperatingAssets = [{ source: 'bs', excelRow: 400 }]

    const result = computeInvestedCapital({
      scope,
      bsRows,
      faRows: {},
      years: YEARS,
    })

    expect(result.otherNonOperatingAssets).toEqual({
      2020: -5,
      2021: -10,
      2022: -15,
    })
  })

  it('keeps the 3 rows independent — no cross-row contamination', () => {
    const bsRows: Record<number, YearKeyedSeries> = {
      501: { 2020: 1, 2021: 1, 2022: 1 },
      502: { 2020: 2, 2021: 2, 2022: 2 },
      503: { 2020: 3, 2021: 3, 2022: 3 },
    }
    const scope: InvestedCapitalState = {
      otherNonOperatingAssets: [{ source: 'bs', excelRow: 501 }],
      excessCash: [{ source: 'bs', excelRow: 502 }],
      marketableSecurities: [{ source: 'bs', excelRow: 503 }],
    }

    const result = computeInvestedCapital({
      scope,
      bsRows,
      faRows: {},
      years: YEARS,
    })

    expect(result.otherNonOperatingAssets).toEqual({
      2020: 1,
      2021: 1,
      2022: 1,
    })
    expect(result.excessCash).toEqual({ 2020: 2, 2021: 2, 2022: 2 })
    expect(result.marketableSecurities).toEqual({
      2020: 3,
      2021: 3,
      2022: 3,
    })
  })
})

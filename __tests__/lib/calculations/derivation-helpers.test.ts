import { describe, expect, it } from 'vitest'
import type { ManifestRow } from '@/data/manifests/types'
import type { YearKeyedSeries } from '@/types/financial'
import {
  computeCommonSize,
  computeGrowthYoY,
  computeAverage,
  averageSeries,
} from '@/lib/calculations/derivation-helpers'

const ROWS: readonly ManifestRow[] = [
  { excelRow: 10, label: 'Account A', type: 'normal' },
  { excelRow: 11, label: 'Account B', type: 'normal' },
  { excelRow: 12, label: 'Total', type: 'total' },
] as const

const YEARS = [2020, 2021, 2022] as const

describe('computeCommonSize', () => {
  it('divides each row value by denominator row value per year', () => {
    const values: Record<number, YearKeyedSeries> = {
      10: { 2020: 100, 2021: 200, 2022: 300 },
      11: { 2020: 50, 2021: 100, 2022: 150 },
      12: { 2020: 1000, 2021: 2000, 2022: 3000 },
    }
    const cs = computeCommonSize(ROWS, values, YEARS, 12)
    expect(cs[10]).toEqual({ 2020: 0.1, 2021: 0.1, 2022: 0.1 })
    expect(cs[11]).toEqual({ 2020: 0.05, 2021: 0.05, 2022: 0.05 })
  })

  it('returns empty record when denominator row missing', () => {
    const values: Record<number, YearKeyedSeries> = {
      10: { 2020: 100 },
    }
    const cs = computeCommonSize(ROWS, values, YEARS, 999)
    expect(cs).toEqual({})
  })

  it('returns zero when denominator year value is zero', () => {
    const values: Record<number, YearKeyedSeries> = {
      10: { 2020: 100, 2021: 200, 2022: 300 },
      12: { 2020: 0, 2021: 2000, 2022: 3000 },
    }
    const cs = computeCommonSize(ROWS, values, YEARS, 12)
    expect(cs[10]).toEqual({ 2020: 0, 2021: 0.1, 2022: 0.1 })
  })

  it('skips rows with undefined excelRow', () => {
    const rowsWithHeader: readonly ManifestRow[] = [
      { label: 'Header', type: 'header' },
      ...ROWS,
    ] as const
    const values: Record<number, YearKeyedSeries> = {
      10: { 2020: 100, 2021: 200, 2022: 300 },
      12: { 2020: 1000, 2021: 2000, 2022: 3000 },
    }
    const cs = computeCommonSize(rowsWithHeader, values, YEARS, 12)
    // Header row has no excelRow → skipped. Denominator row (12) renders as 100%.
    expect(Object.keys(cs).sort()).toEqual(['10', '12'])
    expect(cs[12]).toEqual({ 2020: 1, 2021: 1, 2022: 1 })
  })

  it('handles rows with missing year values as zero', () => {
    const values: Record<number, YearKeyedSeries> = {
      10: { 2020: 100 },
      12: { 2020: 1000, 2021: 2000, 2022: 3000 },
    }
    const cs = computeCommonSize(ROWS, values, YEARS, 12)
    expect(cs[10]).toEqual({ 2020: 0.1, 2021: 0, 2022: 0 })
  })
})

describe('computeGrowthYoY', () => {
  it('computes year-over-year growth starting from second year', () => {
    const values: Record<number, YearKeyedSeries> = {
      10: { 2020: 100, 2021: 150, 2022: 225 },
    }
    const gr = computeGrowthYoY(ROWS, values, YEARS)
    expect(gr[10]).toEqual({ 2021: 0.5, 2022: 0.5 })
  })

  it('returns empty when years length < 2', () => {
    const values: Record<number, YearKeyedSeries> = {
      10: { 2020: 100 },
    }
    const gr = computeGrowthYoY(ROWS, values, [2020])
    expect(gr).toEqual({})
  })

  it('returns 0 for growth when previous year is zero (yoyChangeSafe)', () => {
    const values: Record<number, YearKeyedSeries> = {
      10: { 2020: 0, 2021: 100, 2022: 200 },
    }
    const gr = computeGrowthYoY(ROWS, values, YEARS)
    expect(gr[10]?.[2021]).toBe(0) // prev is 0 → IFERROR semantics
    expect(gr[10]?.[2022]).toBe(1)
  })

  it('skips rows with undefined excelRow', () => {
    const rowsWithHeader: readonly ManifestRow[] = [
      { label: 'Header', type: 'header' },
      ...ROWS,
    ] as const
    const values: Record<number, YearKeyedSeries> = {
      10: { 2020: 100, 2021: 200, 2022: 300 },
    }
    const gr = computeGrowthYoY(rowsWithHeader, values, YEARS)
    expect(Object.keys(gr)).toEqual(['10'])
  })

  it('excludes rows not present in values', () => {
    const values: Record<number, YearKeyedSeries> = {
      10: { 2020: 100, 2021: 200, 2022: 300 },
    }
    const gr = computeGrowthYoY(ROWS, values, YEARS)
    expect(gr[11]).toBeUndefined()
    expect(gr[12]).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// computeAverage — leading-zero / leading-null skip semantics (Session 037)
// ---------------------------------------------------------------------------

describe('computeAverage', () => {
  it('simple mean of positive numbers', () => {
    expect(computeAverage([0.1, 0.2, 0.3])).toBeCloseTo(0.2, 12)
  })

  it('skips leading null — user example 1: [-, 10%, 5%] → 7.5%', () => {
    expect(computeAverage([null, 0.1, 0.05])).toBeCloseTo(0.075, 12)
  })

  it('keeps middle null as zero — user example 2: [10%, -, 5%] → 5%', () => {
    expect(computeAverage([0.1, null, 0.05])).toBeCloseTo(0.05, 12)
  })

  it('keeps trailing null as zero — user example 3: [10%, 5%, -] → 5%', () => {
    expect(computeAverage([0.1, 0.05, null])).toBeCloseTo(0.05, 12)
  })

  it('skips leading zero — [0, 10%, 5%] → 7.5%', () => {
    expect(computeAverage([0, 0.1, 0.05])).toBeCloseTo(0.075, 12)
  })

  it('skips multiple leading zeros/nulls — [0, null, 10] → 10', () => {
    expect(computeAverage([0, null, 10])).toBe(10)
  })

  it('returns null when all values are null or zero', () => {
    expect(computeAverage([null, null, null])).toBeNull()
    expect(computeAverage([0, 0, 0])).toBeNull()
    expect(computeAverage([])).toBeNull()
  })

  it('handles negative values normally once past leading skip', () => {
    expect(computeAverage([0.1, -0.05, 0.2])).toBeCloseTo(
      (0.1 + -0.05 + 0.2) / 3,
      12,
    )
  })

  it('treats undefined like null', () => {
    expect(computeAverage([undefined, 0.1, 0.05])).toBeCloseTo(0.075, 12)
  })
})

describe('averageSeries', () => {
  it('returns null for undefined series', () => {
    expect(averageSeries(undefined, [2019, 2020, 2021])).toBeNull()
  })

  it('picks values in year-order, passes through computeAverage', () => {
    const series: YearKeyedSeries = { 2019: 0, 2020: 0.1, 2021: 0.05 }
    expect(averageSeries(series, [2019, 2020, 2021])).toBeCloseTo(0.075, 12)
  })

  it('missing year in series treated as null → included as 0 in divisor when not leading', () => {
    const series: YearKeyedSeries = { 2019: 0.1, 2021: 0.05 }
    expect(averageSeries(series, [2019, 2020, 2021])).toBeCloseTo(0.05, 12)
  })
})

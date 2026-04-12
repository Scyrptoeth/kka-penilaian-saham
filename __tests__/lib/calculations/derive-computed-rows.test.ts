import { describe, expect, it } from 'vitest'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import type { ManifestRow } from '@/data/manifests/types'
import type { YearKeyedSeries } from '@/types/financial'

const YEARS = [2020, 2021, 2022, 2023] as const

function v(n: number): YearKeyedSeries {
  return { 2020: n, 2021: n, 2022: n, 2023: n }
}

describe('deriveComputedRows', () => {
  it('sums a flat subtotal from its computedFrom rows', () => {
    const rows: ManifestRow[] = [
      { excelRow: 8, label: 'A' },
      { excelRow: 9, label: 'B' },
      {
        excelRow: 16,
        label: 'Total',
        type: 'subtotal',
        computedFrom: [8, 9],
      },
    ]
    const values = { 8: v(100), 9: v(50) }
    const out = deriveComputedRows(rows, values, [...YEARS])
    expect(out[16]).toEqual(v(150))
  })

  it('treats accumulated depreciation as negative via sum (pre-signed convention)', () => {
    // row 22 Fixed Assets Net = sum(row 20 Beginning, row 21 AccumDep)
    // AccumDep is stored as a negative number, so plain summation yields Net.
    const rows: ManifestRow[] = [
      { excelRow: 20, label: 'Fixed Assets — Beginning', indent: 1 },
      { excelRow: 21, label: 'Accumulated Depreciation', indent: 1 },
      {
        excelRow: 22,
        label: 'Fixed Assets, Net',
        type: 'subtotal',
        computedFrom: [20, 21],
      },
    ]
    const values = {
      20: { 2023: 10_000_000 },
      21: { 2023: -3_000_000 },
    }
    const out = deriveComputedRows(rows, values, [...YEARS])
    expect(out[22]?.[2023]).toBe(7_000_000)
  })

  it('aggregates a subtotal of subtotals plus an extra leaf', () => {
    // row 25 Total Non-Current Assets = row 22 (subtotal) + row 24 (leaf)
    const rows: ManifestRow[] = [
      { excelRow: 20, label: 'Beginning' },
      { excelRow: 21, label: 'AccumDep' },
      {
        excelRow: 22,
        label: 'Fixed Assets Net',
        type: 'subtotal',
        computedFrom: [20, 21],
      },
      { excelRow: 24, label: 'Intangibles' },
      {
        excelRow: 25,
        label: 'Total Non-Current Assets',
        type: 'subtotal',
        computedFrom: [22, 24],
      },
    ]
    const values = {
      20: { 2023: 10_000_000 },
      21: { 2023: -3_000_000 },
      24: { 2023: 500_000 },
    }
    const out = deriveComputedRows(rows, values, [...YEARS])
    expect(out[22]?.[2023]).toBe(7_000_000)
    expect(out[25]?.[2023]).toBe(7_500_000)
  })

  it('computes TOTAL ASSETS as subtotal-of-subtotals', () => {
    const rows: ManifestRow[] = [
      { excelRow: 8, label: 'Cash' },
      {
        excelRow: 16,
        label: 'Total Current Assets',
        type: 'subtotal',
        computedFrom: [8],
      },
      { excelRow: 24, label: 'Intangibles' },
      {
        excelRow: 25,
        label: 'Total Non-Current Assets',
        type: 'subtotal',
        computedFrom: [24],
      },
      {
        excelRow: 27,
        label: 'TOTAL ASSETS',
        type: 'total',
        computedFrom: [16, 25],
      },
    ]
    const values = { 8: v(100), 24: v(50) }
    const out = deriveComputedRows(rows, values, [...YEARS])
    expect(out[16]).toEqual(v(100))
    expect(out[25]).toEqual(v(50))
    expect(out[27]).toEqual(v(150))
  })

  it('handles missing values as 0', () => {
    const rows: ManifestRow[] = [
      { excelRow: 8, label: 'A' },
      { excelRow: 9, label: 'B' },
      {
        excelRow: 16,
        label: 'Total',
        type: 'subtotal',
        computedFrom: [8, 9],
      },
    ]
    const values = { 8: { 2023: 100 } } // row 9 missing entirely
    const out = deriveComputedRows(rows, values, [...YEARS])
    expect(out[16]?.[2023]).toBe(100)
    expect(out[16]?.[2020]).toBe(0)
  })

  it('skips rows without computedFrom (normal leaves)', () => {
    const rows: ManifestRow[] = [
      { excelRow: 8, label: 'A' },
      { excelRow: 9, label: 'B' },
    ]
    const values = { 8: v(100), 9: v(50) }
    const out = deriveComputedRows(rows, values, [...YEARS])
    expect(out[8]).toBeUndefined()
    expect(out[9]).toBeUndefined()
  })

  it('respects row ordering — earlier subtotals available to later totals', () => {
    // Simulates the BS Liability+Equity side: three chained subtotals.
    const rows: ManifestRow[] = [
      { excelRow: 31, label: 'A' },
      { excelRow: 32, label: 'B' },
      {
        excelRow: 35,
        label: 'Total Current Liab',
        type: 'subtotal',
        computedFrom: [31, 32],
      },
      { excelRow: 38, label: 'C' },
      {
        excelRow: 40,
        label: 'Total Non-Current Liab',
        type: 'subtotal',
        computedFrom: [38],
      },
      {
        excelRow: 41,
        label: 'TOTAL LIABILITIES',
        type: 'subtotal',
        computedFrom: [35, 40],
      },
    ]
    const values = { 31: v(10), 32: v(20), 38: v(100) }
    const out = deriveComputedRows(rows, values, [...YEARS])
    expect(out[35]).toEqual(v(30))
    expect(out[40]).toEqual(v(100))
    expect(out[41]).toEqual(v(130))
  })

  it('returns empty result for manifest with no subtotal/total rows', () => {
    const rows: ManifestRow[] = [
      { excelRow: 8, label: 'A' },
      { excelRow: 9, label: 'B' },
    ]
    const out = deriveComputedRows(rows, { 8: v(100), 9: v(50) }, [...YEARS])
    expect(Object.keys(out)).toHaveLength(0)
  })
})

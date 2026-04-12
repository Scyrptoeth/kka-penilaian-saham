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

  // Session 011: signed computedFrom refs enable subtraction for IS subtotals
  // (Gross Profit = Revenue - COGS, PBT = EBIT + NonOp - Tax, etc.).
  // Encoding: negative excelRow in computedFrom = subtract that row's series.

  it('subtracts a series when the ref is negative (Gross Profit pattern)', () => {
    // row 8 = row 6 Revenue - row 7 COGS (user enters both as positive)
    const rows: ManifestRow[] = [
      { excelRow: 6, label: 'Revenue' },
      { excelRow: 7, label: 'COGS' },
      {
        excelRow: 8,
        label: 'Gross Profit',
        type: 'subtotal',
        computedFrom: [6, -7],
      },
    ]
    const values = { 6: v(1000), 7: v(600) }
    const out = deriveComputedRows(rows, values, [...YEARS])
    expect(out[8]).toEqual(v(400))
  })

  it('handles mixed positive and negative refs in one computedFrom', () => {
    // Non-Op Net = InterestIncome - InterestExpense + OtherIncome
    const rows: ManifestRow[] = [
      { excelRow: 26, label: 'Interest Income' },
      { excelRow: 27, label: 'Interest Expense' },
      { excelRow: 28, label: 'Other Income' },
      {
        excelRow: 30,
        label: 'Non-Operating Income (net)',
        type: 'subtotal',
        computedFrom: [26, -27, 28],
      },
    ]
    const values = {
      26: { 2023: 50 },
      27: { 2023: 200 },
      28: { 2023: 30 },
    }
    const out = deriveComputedRows(rows, values, [...YEARS])
    expect(out[30]?.[2023]).toBe(-120) // 50 - 200 + 30
  })

  it('chains signed refs through subtotal-of-subtotals', () => {
    // row 8 Gross Profit = row 6 - row 7
    // row 22 EBIT = row 8 - row 15 (where row 15 is OpEx leaf)
    // row 35 Net Profit = row 22 - row 33 Tax
    const rows: ManifestRow[] = [
      { excelRow: 6, label: 'Revenue' },
      { excelRow: 7, label: 'COGS' },
      {
        excelRow: 8,
        label: 'Gross Profit',
        type: 'subtotal',
        computedFrom: [6, -7],
      },
      { excelRow: 15, label: 'OpEx' },
      {
        excelRow: 22,
        label: 'EBIT',
        type: 'subtotal',
        computedFrom: [8, -15],
      },
      { excelRow: 33, label: 'Corporate Tax' },
      {
        excelRow: 35,
        label: 'Net Profit After Tax',
        type: 'total',
        computedFrom: [22, -33],
      },
    ]
    const values = {
      6: { 2023: 1000 },
      7: { 2023: 600 },
      15: { 2023: 150 },
      33: { 2023: 50 },
    }
    const out = deriveComputedRows(rows, values, [...YEARS])
    expect(out[8]?.[2023]).toBe(400) // 1000 - 600
    expect(out[22]?.[2023]).toBe(250) // 400 - 150
    expect(out[35]?.[2023]).toBe(200) // 250 - 50
  })

  it('preserves backward compatibility — all-positive refs still sum as before', () => {
    // Exact repro of the flat subtotal test, but explicitly asserting
    // that introducing sign handling does not regress positive-only use.
    const rows: ManifestRow[] = [
      { excelRow: 8, label: 'A' },
      { excelRow: 9, label: 'B' },
      {
        excelRow: 10,
        label: 'C',
      },
      {
        excelRow: 16,
        label: 'Total',
        type: 'subtotal',
        computedFrom: [8, 9, 10],
      },
    ]
    const values = { 8: v(100), 9: v(50), 10: v(25) }
    const out = deriveComputedRows(rows, values, [...YEARS])
    expect(out[16]).toEqual(v(175))
  })
})

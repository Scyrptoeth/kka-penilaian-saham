import { describe, expect, it } from 'vitest'
import {
  ALL_SCALAR_MAPPINGS,
  ALL_GRID_MAPPINGS,
  ALL_ARRAY_MAPPINGS,
  ALL_DYNAMIC_ROWS_MAPPINGS,
  DLOM_ANSWER_ROWS,
  DLOC_ANSWER_ROWS,
  MAPPED_STORE_SLICES,
  colLetterToIndex,
  colIndexToLetter,
  offsetCol,
} from '@/lib/export/cell-mapping'

describe('cell-mapping registry', () => {
  it('all scalar mappings have valid cell addresses', () => {
    for (const m of ALL_SCALAR_MAPPINGS) {
      expect(m.excelCell).toMatch(/^[A-Z]+\d+$/)
      expect(m.excelSheet.length).toBeGreaterThan(0)
      expect(m.storeSlice.length).toBeGreaterThan(0)
      expect(m.storeField.length).toBeGreaterThan(0)
    }
  })

  it('no duplicate scalar cell addresses within the same sheet', () => {
    const seen = new Map<string, string>()
    for (const m of ALL_SCALAR_MAPPINGS) {
      const key = `${m.excelSheet}!${m.excelCell}`
      expect(seen.has(key), `Duplicate cell: ${key} (${m.storeField} vs ${seen.get(key)})`).toBe(
        false,
      )
      seen.set(key, m.storeField)
    }
  })

  it('covers all required store slices', () => {
    const coveredSlices = new Set<string>()
    for (const m of ALL_SCALAR_MAPPINGS) coveredSlices.add(m.storeSlice)
    for (const g of ALL_GRID_MAPPINGS) coveredSlices.add(g.storeSlice)
    for (const a of ALL_ARRAY_MAPPINGS) coveredSlices.add(a.storeSlice)
    for (const d of ALL_DYNAMIC_ROWS_MAPPINGS) coveredSlices.add(d.storeSlice)

    for (const slice of MAPPED_STORE_SLICES) {
      expect(coveredSlices.has(slice), `Missing slice: ${slice}`).toBe(true)
    }
  })

  it('balance sheet grid has 20 leaf rows and 4 year columns', () => {
    const bs = ALL_GRID_MAPPINGS.find((g) => g.storeSlice === 'balanceSheet')!
    expect(bs.leafRows).toHaveLength(20)
    expect(Object.keys(bs.yearColumns)).toHaveLength(4)
  })

  it('income statement grid has 9 leaf rows', () => {
    const is = ALL_GRID_MAPPINGS.find((g) => g.storeSlice === 'incomeStatement')!
    expect(is.leafRows).toHaveLength(9)
  })

  it('fixed asset grid has 24 leaf rows and 3 year columns', () => {
    const fa = ALL_GRID_MAPPINGS.find((g) => g.storeSlice === 'fixedAsset')!
    expect(fa.leafRows).toHaveLength(24)
    expect(Object.keys(fa.yearColumns)).toHaveLength(3)
  })

  it('DLOM has 10 answer rows', () => {
    expect(DLOM_ANSWER_ROWS).toHaveLength(10)
    // All should be odd numbers
    for (const row of DLOM_ANSWER_ROWS) {
      expect(row % 2).toBe(1)
    }
  })

  it('DLOC has 5 answer rows', () => {
    expect(DLOC_ANSWER_ROWS).toHaveLength(5)
  })

  it('HOME scalars map verified cell positions', () => {
    const homeMap = ALL_SCALAR_MAPPINGS.filter((m) => m.storeSlice === 'home')
    const byField = new Map(homeMap.map((m) => [m.storeField, m.excelCell]))

    // Verified against actual Excel (Session 018 brainstorm)
    expect(byField.get('namaPerusahaan')).toBe('B4')
    expect(byField.get('jenisPerusahaan')).toBe('B5')
    expect(byField.get('jumlahSahamBeredar')).toBe('B6')
    expect(byField.get('jumlahSahamYangDinilai')).toBe('B7')
    expect(byField.get('tahunTransaksi')).toBe('B9')
    expect(byField.get('objekPenilaian')).toBe('B12')

    // npwp and nilaiNominalPerSaham NOT in Excel — should NOT be mapped
    expect(byField.has('npwp')).toBe(false)
    expect(byField.has('nilaiNominalPerSaham')).toBe(false)
    expect(byField.has('dlomPercent')).toBe(false)
    expect(byField.has('dlocPercent')).toBe(false)
  })

  it('dynamic rows mappings have valid max rows', () => {
    for (const d of ALL_DYNAMIC_ROWS_MAPPINGS) {
      expect(d.maxRows).toBeGreaterThan(0)
      expect(d.maxRows).toBeLessThanOrEqual(20)
      expect(Object.keys(d.columns).length).toBeGreaterThan(0)
    }
  })
})

describe('column helpers', () => {
  it('colLetterToIndex converts correctly', () => {
    expect(colLetterToIndex('A')).toBe(1)
    expect(colLetterToIndex('C')).toBe(3)
    expect(colLetterToIndex('Z')).toBe(26)
  })

  it('colIndexToLetter converts correctly', () => {
    expect(colIndexToLetter(1)).toBe('A')
    expect(colIndexToLetter(3)).toBe('C')
    expect(colIndexToLetter(26)).toBe('Z')
  })

  it('offsetCol offsets correctly', () => {
    expect(offsetCol('C', 0)).toBe('C')
    expect(offsetCol('C', 1)).toBe('D')
    expect(offsetCol('E', 5)).toBe('J')
  })
})

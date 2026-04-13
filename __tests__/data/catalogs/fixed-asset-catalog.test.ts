import { describe, expect, it } from 'vitest'
import {
  FA_CATALOG,
  getCatalogAccount,
  generateCustomExcelRow,
  getCatalogBySection,
  isOriginalExcelRow,
  FA_OFFSET,
  type FaAccountEntry,
} from '@/data/catalogs/fixed-asset-catalog'

describe('fixed-asset-catalog', () => {
  it('has exactly 20 accounts', () => {
    expect(FA_CATALOG).toHaveLength(20)
  })

  it('all accounts have both labelEn and labelId', () => {
    for (const account of FA_CATALOG) {
      expect(account.labelEn).toBeTruthy()
      expect(account.labelId).toBeTruthy()
    }
  })

  it('all accounts have section fixed_asset', () => {
    for (const account of FA_CATALOG) {
      expect(account.section).toBe('fixed_asset')
    }
  })

  it('excelRow values are unique', () => {
    const rows = FA_CATALOG.map((a) => a.excelRow)
    expect(new Set(rows).size).toBe(rows.length)
  })

  it('original 6 accounts have excelRow 8-13', () => {
    const originals = FA_CATALOG.filter((a) => a.excelRow >= 8 && a.excelRow <= 13)
    expect(originals).toHaveLength(6)
  })

  it('extended accounts have excelRow 100-119', () => {
    const extended = FA_CATALOG.filter((a) => a.excelRow >= 100 && a.excelRow <= 119)
    expect(extended).toHaveLength(14)
  })

  it('getCatalogAccount returns correct item', () => {
    const land = getCatalogAccount('land')
    expect(land).toBeDefined()
    expect(land!.labelEn).toBe('Land')
    expect(land!.labelId).toBe('Tanah')
    expect(land!.excelRow).toBe(8)
  })

  it('getCatalogAccount returns undefined for unknown id', () => {
    expect(getCatalogAccount('nonexistent')).toBeUndefined()
  })

  it('generateCustomExcelRow returns >= 1000 for empty accounts', () => {
    expect(generateCustomExcelRow([])).toBe(1000)
  })

  it('generateCustomExcelRow increments from max custom row', () => {
    const accounts: FaAccountEntry[] = [
      { catalogId: 'custom_1', excelRow: 1000, section: 'fixed_asset' },
      { catalogId: 'custom_2', excelRow: 1002, section: 'fixed_asset' },
    ]
    expect(generateCustomExcelRow(accounts)).toBe(1003)
  })

  it('getCatalogBySection sorts alphabetically by language', () => {
    const en = getCatalogBySection('en')
    const labels = en.map((a) => a.labelEn)
    const sorted = [...labels].sort((a, b) => a.localeCompare(b))
    expect(labels).toEqual(sorted)

    const id = getCatalogBySection('id')
    const idLabels = id.map((a) => a.labelId)
    const idSorted = [...idLabels].sort((a, b) => a.localeCompare(b))
    expect(idLabels).toEqual(idSorted)
  })

  it('isOriginalExcelRow correctly identifies rows 8-13', () => {
    expect(isOriginalExcelRow(8)).toBe(true)
    expect(isOriginalExcelRow(13)).toBe(true)
    expect(isOriginalExcelRow(7)).toBe(false)
    expect(isOriginalExcelRow(14)).toBe(false)
    expect(isOriginalExcelRow(100)).toBe(false)
    expect(isOriginalExcelRow(1000)).toBe(false)
  })

  it('FA_OFFSET multipliers are non-overlapping', () => {
    const offsets = Object.values(FA_OFFSET)
    expect(new Set(offsets).size).toBe(offsets.length)
  })
})

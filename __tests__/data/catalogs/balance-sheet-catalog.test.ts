import { describe, expect, it } from 'vitest'
import {
  BS_CATALOG_ALL,
  getCatalogBySection,
  generateCustomExcelRow,
  type BsAccountEntry,
} from '@/data/catalogs/balance-sheet-catalog'

describe('balance-sheet-catalog', () => {
  it('all excelRow values are unique within catalog', () => {
    const rows = BS_CATALOG_ALL.map((a) => a.excelRow)
    expect(new Set(rows).size).toBe(rows.length)
  })

  it('all IDs are unique within catalog', () => {
    const ids = BS_CATALOG_ALL.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('getCatalogBySection returns sorted results (EN)', () => {
    const currentAssets = getCatalogBySection('current_assets', 'en')
    expect(currentAssets.length).toBe(7)
    for (let i = 1; i < currentAssets.length; i++) {
      expect(currentAssets[i]!.labelEn >= currentAssets[i - 1]!.labelEn).toBe(true)
    }
  })

  it('getCatalogBySection returns sorted results (ID)', () => {
    const currentAssets = getCatalogBySection('current_assets', 'id')
    expect(currentAssets.length).toBe(7)
    for (let i = 1; i < currentAssets.length; i++) {
      expect(currentAssets[i]!.labelId >= currentAssets[i - 1]!.labelId).toBe(true)
    }
  })

  it('generateCustomExcelRow starts at 1000', () => {
    const result = generateCustomExcelRow([])
    expect(result).toBe(1000)
  })

  it('generateCustomExcelRow increments correctly', () => {
    const existing: BsAccountEntry[] = [
      { catalogId: 'custom_1', excelRow: 1000, section: 'current_assets' },
      { catalogId: 'custom_2', excelRow: 1002, section: 'current_assets' },
    ]
    expect(generateCustomExcelRow(existing)).toBe(1003)
  })

  it('catalog covers all existing BS leaf rows from manifest', () => {
    // Verified against kka-penilaian-saham.xlsx BALANCE SHEET sheet
    const expectedLeafRows = [8, 9, 10, 11, 12, 13, 14, 20, 21, 23, 24, 31, 32, 33, 34, 38, 39, 43, 44, 46, 47]
    const catalogRows = BS_CATALOG_ALL.map((a) => a.excelRow).sort((a, b) => a - b)
    expect(catalogRows).toEqual(expectedLeafRows)
  })
})

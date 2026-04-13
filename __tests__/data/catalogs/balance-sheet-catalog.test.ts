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
    expect(currentAssets.length).toBe(20) // 7 original + 13 extended
    for (let i = 1; i < currentAssets.length; i++) {
      expect(currentAssets[i]!.labelEn >= currentAssets[i - 1]!.labelEn).toBe(true)
    }
  })

  it('getCatalogBySection returns sorted results (ID)', () => {
    const currentAssets = getCatalogBySection('current_assets', 'id')
    expect(currentAssets.length).toBe(20)
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

  it('catalog includes all 19 original Excel template rows (FA rows 20/21 now cross-ref)', () => {
    const originalRows = [8, 9, 10, 11, 12, 13, 14, 23, 24, 31, 32, 33, 34, 38, 39, 43, 44, 46, 47]
    const catalogRows = BS_CATALOG_ALL.map((a) => a.excelRow)
    for (const row of originalRows) {
      expect(catalogRows).toContain(row)
    }
  })

  it('has 74 total accounts across all sections (FA removed — cross-ref)', () => {
    expect(BS_CATALOG_ALL.length).toBe(74)
  })

  it('no fixed_assets accounts in catalog (section is now cross-ref)', () => {
    const faAccounts = BS_CATALOG_ALL.filter((a) => a.section === 'fixed_assets')
    expect(faAccounts).toHaveLength(0)
  })

  it('extended accounts use correct excelRow ranges', () => {
    for (const a of BS_CATALOG_ALL) {
      if (a.excelRow >= 100 && a.excelRow < 120) expect(a.section).toBe('current_assets')
      if (a.excelRow >= 140 && a.excelRow < 160) expect(a.section).toBe('intangible_assets')
      if (a.excelRow >= 160 && a.excelRow < 180) expect(a.section).toBe('other_non_current_assets')
      if (a.excelRow >= 200 && a.excelRow < 220) expect(a.section).toBe('current_liabilities')
      if (a.excelRow >= 220 && a.excelRow < 240) expect(a.section).toBe('non_current_liabilities')
      if (a.excelRow >= 300 && a.excelRow < 320) expect(a.section).toBe('equity')
    }
  })
})

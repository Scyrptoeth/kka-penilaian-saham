import { describe, expect, it } from 'vitest'
import {
  IS_CATALOG,
  getCatalogAccount,
  generateCustomExcelRow,
  getCatalogBySection,
  IS_SENTINEL,
  DEFAULT_IS_ACCOUNTS,
  ORIGINAL_ROW_TO_CATALOG,
  type IsAccountEntry,
} from '@/data/catalogs/income-statement-catalog'

describe('income-statement-catalog', () => {
  // Session 041 Task 3: net_interest split into interest_income + interest_expense.
  // 6 income accounts (rows 500-505) + 7 expense accounts (rows 520-526) = 13
  // (was 6 in net_interest). Plus 9 revenue + 8 cost + 12 opex + 6 non_op = 35 + 13 = 48.
  it('has 48 accounts total (Session 041 Task 3 — interest split into 6 income + 7 expense)', () => {
    expect(IS_CATALOG).toHaveLength(48)
  })

  it('all accounts have both labelEn and labelId', () => {
    for (const a of IS_CATALOG) {
      expect(a.labelEn).toBeTruthy()
      expect(a.labelId).toBeTruthy()
    }
  })

  it('excelRow values are unique', () => {
    const rows = IS_CATALOG.map((a) => a.excelRow)
    expect(new Set(rows).size).toBe(rows.length)
  })

  it('sections cover all 6 types (Session 041 Task 3)', () => {
    const sections = new Set(IS_CATALOG.map((a) => a.section))
    expect(sections).toEqual(new Set([
      'revenue',
      'cost',
      'operating_expense',
      'non_operating',
      'interest_income',
      'interest_expense',
    ]))
  })

  it('getCatalogAccount returns correct item', () => {
    const rev = getCatalogAccount('revenue')
    expect(rev).toBeDefined()
    expect(rev!.excelRow).toBe(100)
    expect(rev!.section).toBe('revenue')
  })

  it('getCatalogAccount returns undefined for unknown', () => {
    expect(getCatalogAccount('nonexistent')).toBeUndefined()
  })

  it('generateCustomExcelRow returns >= 1000', () => {
    expect(generateCustomExcelRow([])).toBe(1000)
  })

  it('generateCustomExcelRow increments from max', () => {
    const accounts: IsAccountEntry[] = [
      { catalogId: 'c1', excelRow: 1000, section: 'revenue' },
      { catalogId: 'c2', excelRow: 1003, section: 'cost' },
    ]
    expect(generateCustomExcelRow(accounts)).toBe(1004)
  })

  it('getCatalogBySection returns sorted accounts', () => {
    const rev = getCatalogBySection('revenue', 'en')
    expect(rev.length).toBeGreaterThanOrEqual(9)
    const labels = rev.map((a) => a.labelEn)
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)))
  })

  it('sentinel rows do not overlap with catalog excelRows', () => {
    const sentinelSet = new Set(Object.values(IS_SENTINEL))
    for (const a of IS_CATALOG) {
      expect(sentinelSet.has(a.excelRow)).toBe(false)
    }
  })

  it('DEFAULT_IS_ACCOUNTS maps all 7 original leaf rows', () => {
    expect(DEFAULT_IS_ACCOUNTS).toHaveLength(7)
    expect(Object.keys(ORIGINAL_ROW_TO_CATALOG)).toHaveLength(7)
  })

  it('excelRow ranges do not overlap across sections (Session 041 Task 3)', () => {
    const ranges: Record<string, [number, number]> = {
      revenue: [100, 119],
      cost: [200, 219],
      operating_expense: [300, 319],
      non_operating: [400, 419],
      interest_income: [500, 519],
      interest_expense: [520, 539],
    }
    for (const a of IS_CATALOG) {
      const [lo, hi] = ranges[a.section]
      expect(a.excelRow).toBeGreaterThanOrEqual(lo)
      expect(a.excelRow).toBeLessThanOrEqual(hi)
    }
  })
})

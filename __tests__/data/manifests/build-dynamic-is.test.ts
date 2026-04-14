import { describe, expect, it } from 'vitest'
import { buildDynamicIsManifest } from '@/data/manifests/build-dynamic-is'
import { IS_SENTINEL, DEFAULT_IS_ACCOUNTS, type IsAccountEntry } from '@/data/catalogs/income-statement-catalog'

const TAHUN = 2022

describe('buildDynamicIsManifest', () => {
  it('empty accounts → structural rows only (headers, separators, fixed leaves, computed)', () => {
    const m = buildDynamicIsManifest([], 'en', 4, TAHUN)
    // Fixed leaves: Depreciation (21) and Tax (33) — type defaults to 'normal' (undefined)
    const fixedLeaves = m.rows.filter((r) => r.excelRow !== undefined && !r.type && !r.computedFrom)
    expect(fixedLeaves).toHaveLength(2)
    expect(fixedLeaves.map((r) => r.excelRow)).toEqual([IS_SENTINEL.DEPRECIATION, IS_SENTINEL.TAX])
    // 5 add-buttons
    const addButtons = m.rows.filter((r) => r.type === 'add-button')
    expect(addButtons).toHaveLength(5)
  })

  it('default 7 accounts → 7 leaf rows + 2 fixed leaves', () => {
    const m = buildDynamicIsManifest(DEFAULT_IS_ACCOUNTS, 'en', 4, TAHUN)
    const normals = m.rows.filter((r) => (r.type ?? 'normal') === 'normal')
    // 7 catalog accounts + 2 fixed leaves (Depreciation, Tax) = 9
    expect(normals).toHaveLength(9)
  })

  it('Revenue subtotal at sentinel row 6', () => {
    const accounts: IsAccountEntry[] = [
      { catalogId: 'revenue', excelRow: 100, section: 'revenue' },
      { catalogId: 'service_revenue', excelRow: 102, section: 'revenue' },
    ]
    const m = buildDynamicIsManifest(accounts, 'en', 4, TAHUN)
    const revSubtotal = m.rows.find((r) => r.excelRow === IS_SENTINEL.REVENUE)
    expect(revSubtotal).toBeDefined()
    expect(revSubtotal!.computedFrom).toEqual([100, 102])
    expect(revSubtotal!.type).toBe('subtotal')
  })

  it('COGS subtotal at sentinel row 7', () => {
    const accounts: IsAccountEntry[] = [
      { catalogId: 'cogs', excelRow: 200, section: 'cost' },
    ]
    const m = buildDynamicIsManifest(accounts, 'en', 4, TAHUN)
    const cogsSubtotal = m.rows.find((r) => r.excelRow === IS_SENTINEL.COGS)
    expect(cogsSubtotal!.computedFrom).toEqual([200])
  })

  it('Gross Profit = Revenue + COGS (plain addition, COGS entered negative)', () => {
    const m = buildDynamicIsManifest(DEFAULT_IS_ACCOUNTS, 'en', 4, TAHUN)
    const gp = m.rows.find((r) => r.excelRow === IS_SENTINEL.GROSS_PROFIT)
    expect(gp!.computedFrom).toEqual([IS_SENTINEL.REVENUE, IS_SENTINEL.COGS])
  })

  it('EBITDA = Gross Profit + Total OpEx (plain addition, OpEx entered negative)', () => {
    const m = buildDynamicIsManifest(DEFAULT_IS_ACCOUNTS, 'en', 4, TAHUN)
    const ebitda = m.rows.find((r) => r.excelRow === IS_SENTINEL.EBITDA)
    expect(ebitda!.computedFrom).toEqual([IS_SENTINEL.GROSS_PROFIT, IS_SENTINEL.TOTAL_OPEX])
  })

  it('EBIT = EBITDA + Depreciation (plain addition, Dep entered negative)', () => {
    const m = buildDynamicIsManifest(DEFAULT_IS_ACCOUNTS, 'en', 4, TAHUN)
    const ebit = m.rows.find((r) => r.excelRow === IS_SENTINEL.EBIT)
    expect(ebit!.computedFrom).toEqual([IS_SENTINEL.EBITDA, IS_SENTINEL.DEPRECIATION])
  })

  it('Net Interest: income/expense sub-groups with separate subtotals', () => {
    const accounts: IsAccountEntry[] = [
      { catalogId: 'interest_income', excelRow: 500, section: 'net_interest', interestType: 'income' },
      { catalogId: 'bank_interest_income', excelRow: 502, section: 'net_interest', interestType: 'income' },
      { catalogId: 'interest_expense', excelRow: 501, section: 'net_interest', interestType: 'expense' },
    ]
    const m = buildDynamicIsManifest(accounts, 'en', 4, TAHUN)

    const iiSubtotal = m.rows.find((r) => r.excelRow === IS_SENTINEL.INTEREST_INCOME)
    expect(iiSubtotal!.computedFrom).toEqual([500, 502])

    const ieSubtotal = m.rows.find((r) => r.excelRow === IS_SENTINEL.INTEREST_EXPENSE)
    expect(ieSubtotal!.computedFrom).toEqual([501])

    const netInterest = m.rows.find((r) => r.excelRow === IS_SENTINEL.NET_INTEREST)
    expect(netInterest!.computedFrom).toEqual([IS_SENTINEL.INTEREST_INCOME, IS_SENTINEL.INTEREST_EXPENSE])
  })

  it('PBT = EBIT + Net Interest + Non-Operating', () => {
    const m = buildDynamicIsManifest(DEFAULT_IS_ACCOUNTS, 'en', 4, TAHUN)
    const pbt = m.rows.find((r) => r.excelRow === IS_SENTINEL.PBT)
    expect(pbt!.computedFrom).toEqual([IS_SENTINEL.EBIT, IS_SENTINEL.NET_INTEREST, IS_SENTINEL.NON_OPERATING])
  })

  it('Net Profit = PBT + Tax (plain addition, Tax entered negative)', () => {
    const m = buildDynamicIsManifest(DEFAULT_IS_ACCOUNTS, 'en', 4, TAHUN)
    const np = m.rows.find((r) => r.excelRow === IS_SENTINEL.NET_PROFIT)
    expect(np!.type).toBe('total')
    expect(np!.computedFrom).toEqual([IS_SENTINEL.PBT, IS_SENTINEL.TAX])
  })

  it('Depreciation and Tax are fixed leaf rows (no computedFrom)', () => {
    const m = buildDynamicIsManifest(DEFAULT_IS_ACCOUNTS, 'en', 4, TAHUN)
    const dep = m.rows.find((r) => r.excelRow === IS_SENTINEL.DEPRECIATION)
    expect(dep!.computedFrom).toBeUndefined()
    expect(dep!.indent).toBe(1)

    const tax = m.rows.find((r) => r.excelRow === IS_SENTINEL.TAX)
    expect(tax!.computedFrom).toBeUndefined()
    expect(tax!.indent).toBe(1)
  })

  it('years and columns generated correctly', () => {
    const m = buildDynamicIsManifest([], 'en', 4, TAHUN)
    expect(m.years).toEqual([2018, 2019, 2020, 2021])
    expect(m.columns).toEqual({ 2018: 'C', 2019: 'D', 2020: 'E', 2021: 'F' })
  })

  it('language toggle changes labels', () => {
    const accounts: IsAccountEntry[] = [
      { catalogId: 'revenue', excelRow: 100, section: 'revenue' },
    ]
    const en = buildDynamicIsManifest(accounts, 'en', 4, TAHUN)
    const id = buildDynamicIsManifest(accounts, 'id', 4, TAHUN)

    const enLeaf = en.rows.find((r) => r.excelRow === 100)!
    const idLeaf = id.rows.find((r) => r.excelRow === 100)!
    expect(enLeaf.label).toBe('Revenue')
    expect(idLeaf.label).toBe('Pendapatan Usaha')
  })

  it('catalogId only on section leaf rows (not fixed leaves)', () => {
    const m = buildDynamicIsManifest(DEFAULT_IS_ACCOUNTS, 'en', 4, TAHUN)
    const withCatalogId = m.rows.filter((r) => r.catalogId)
    expect(withCatalogId).toHaveLength(7) // 7 catalog accounts, not Dep/Tax
  })

  it('5 add-buttons cover all sections', () => {
    const m = buildDynamicIsManifest(DEFAULT_IS_ACCOUNTS, 'en', 4, TAHUN)
    const buttons = m.rows.filter((r) => r.type === 'add-button')
    const sections = buttons.map((r) => r.section)
    expect(sections).toEqual(['revenue', 'cost', 'operating_expense', 'net_interest', 'non_operating'])
  })
})

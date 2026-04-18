import { describe, expect, it } from 'vitest'
import { buildDynamicIsManifest } from '@/data/manifests/build-dynamic-is'
import { IS_SENTINEL, DEFAULT_IS_ACCOUNTS, type IsAccountEntry } from '@/data/catalogs/income-statement-catalog'

const TAHUN = 2022

describe('buildDynamicIsManifest', () => {
  it('empty accounts → structural rows only (headers, separators, fixed leaves, computed)', () => {
    const m = buildDynamicIsManifest([], 'en', 4, TAHUN)
    // Session 041 Task 1: Depreciation (21) is now type 'cross-ref' (read-only,
    // FA-driven). Session 041 Task 4: KOREKSI_FISKAL (600) is a new fixed leaf.
    // Total fixed leaves = TAX (33) + KOREKSI_FISKAL (600) = 2.
    const fixedLeaves = m.rows.filter((r) => r.excelRow !== undefined && !r.type && !r.computedFrom)
    expect(fixedLeaves).toHaveLength(2)
    expect(fixedLeaves.map((r) => r.excelRow).sort((a, b) => a - b)).toEqual([
      IS_SENTINEL.TAX,
      IS_SENTINEL.KOREKSI_FISKAL,
    ])
    // Depreciation present but as cross-ref
    const depRow = m.rows.find((r) => r.excelRow === IS_SENTINEL.DEPRECIATION)
    expect(depRow?.type).toBe('cross-ref')
    // Session 041 Task 3: 6 add-buttons (net_interest split into income + expense)
    const addButtons = m.rows.filter((r) => r.type === 'add-button')
    expect(addButtons).toHaveLength(6)
  })

  it('default 7 accounts → 7 leaf rows + 2 fixed leaves (Tax + Koreksi Fiskal)', () => {
    const m = buildDynamicIsManifest(DEFAULT_IS_ACCOUNTS, 'en', 4, TAHUN)
    // Session 041 Task 1: Depreciation no longer counted as 'normal' (cross-ref).
    // Session 041 Task 4: KOREKSI_FISKAL added as fixed leaf 'normal'.
    // Count = 7 catalog leaves + 2 fixed leaves (Tax + Koreksi Fiskal).
    const normals = m.rows.filter((r) => (r.type ?? 'normal') === 'normal')
    expect(normals).toHaveLength(9)
  })

  // Session 041 Task 4 — new: TAXABLE PROFIT computed sentinel.
  it('TAXABLE PROFIT (601) = PBT (32) + KOREKSI_FISKAL (600)', () => {
    const m = buildDynamicIsManifest(DEFAULT_IS_ACCOUNTS, 'en', 4, TAHUN)
    const taxable = m.rows.find((r) => r.excelRow === IS_SENTINEL.TAXABLE_PROFIT)
    expect(taxable!.type).toBe('subtotal')
    expect(taxable!.computedFrom).toEqual([IS_SENTINEL.PBT, IS_SENTINEL.KOREKSI_FISKAL])
  })

  it('Koreksi Fiskal (600) is a user-editable fixed leaf row', () => {
    const m = buildDynamicIsManifest(DEFAULT_IS_ACCOUNTS, 'en', 4, TAHUN)
    const koreksi = m.rows.find((r) => r.excelRow === IS_SENTINEL.KOREKSI_FISKAL)
    expect(koreksi).toBeDefined()
    expect(koreksi!.computedFrom).toBeUndefined()
    expect(koreksi!.type).toBeUndefined()
    expect(koreksi!.indent).toBe(1)
    expect(koreksi!.label).toBe('Fiscal Correction')
  })

  // Tax + NPAT formula intentionally unchanged (Q3) — historical Tax stays user
  // input; NPAT = PBT + Tax, NOT TAXABLE_PROFIT + Tax.
  it('NPAT formula (Session 041 Task 4 backward compat) — unchanged from PBT + Tax', () => {
    const m = buildDynamicIsManifest(DEFAULT_IS_ACCOUNTS, 'en', 4, TAHUN)
    const npat = m.rows.find((r) => r.excelRow === IS_SENTINEL.NET_PROFIT)
    expect(npat!.computedFrom).toEqual([IS_SENTINEL.PBT, IS_SENTINEL.TAX])
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

  // Session 041 Task 3: net_interest section split into two distinct sections
  // (interest_income excelRow 500-519, interest_expense excelRow 520-539). Each
  // gets its own +Add dropdown with PSAK-appropriate catalog.
  it('Interest Income / Interest Expense sections each have their own subtotal', () => {
    const accounts: IsAccountEntry[] = [
      { catalogId: 'time_deposit_interest', excelRow: 500, section: 'interest_income' },
      { catalogId: 'loan_receivable_interest', excelRow: 502, section: 'interest_income' },
      { catalogId: 'bank_loan_interest', excelRow: 520, section: 'interest_expense' },
    ]
    const m = buildDynamicIsManifest(accounts, 'en', 4, TAHUN)

    const iiSubtotal = m.rows.find((r) => r.excelRow === IS_SENTINEL.INTEREST_INCOME)
    expect(iiSubtotal!.computedFrom).toEqual([500, 502])

    const ieSubtotal = m.rows.find((r) => r.excelRow === IS_SENTINEL.INTEREST_EXPENSE)
    expect(ieSubtotal!.computedFrom).toEqual([520])

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

  it('Depreciation is read-only cross-ref (Session 041 Task 1) and Tax is fixed leaf', () => {
    const m = buildDynamicIsManifest(DEFAULT_IS_ACCOUNTS, 'en', 4, TAHUN)
    const dep = m.rows.find((r) => r.excelRow === IS_SENTINEL.DEPRECIATION)
    expect(dep!.computedFrom).toBeUndefined()
    expect(dep!.type).toBe('cross-ref')
    expect(dep!.indent).toBe(1)

    const tax = m.rows.find((r) => r.excelRow === IS_SENTINEL.TAX)
    expect(tax!.computedFrom).toBeUndefined()
    expect(tax!.type).toBeUndefined() // 'normal' default
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

  // Session 041 Task 3: 6 add-buttons (was 5) — net_interest split into
  // interest_income + interest_expense, each with its own button.
  it('6 add-buttons cover all sections', () => {
    const m = buildDynamicIsManifest(DEFAULT_IS_ACCOUNTS, 'en', 4, TAHUN)
    const buttons = m.rows.filter((r) => r.type === 'add-button')
    const sections = buttons.map((r) => r.section)
    expect(sections).toEqual([
      'revenue',
      'cost',
      'operating_expense',
      'interest_income',
      'interest_expense',
      'non_operating',
    ])
  })
})

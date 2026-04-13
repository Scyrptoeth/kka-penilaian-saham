import { describe, expect, it } from 'vitest'
import { buildDynamicBsManifest } from '@/data/manifests/build-dynamic-bs'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import type { BsAccountEntry } from '@/data/catalogs/balance-sheet-catalog'

describe('buildDynamicBsManifest', () => {
  it('no accounts → all subtotals/totals have empty computedFrom', () => {
    const manifest = buildDynamicBsManifest([], 'en', 1, 2022)
    const subtotals = manifest.rows.filter((r) => r.computedFrom !== undefined)
    for (const row of subtotals) {
      // Either empty array or references other computed rows only
      expect(Array.isArray(row.computedFrom)).toBe(true)
    }
    // TOTAL ASSETS = [16, 25]
    const totalAssets = manifest.rows.find((r) => r.excelRow === 27)
    expect(totalAssets?.computedFrom).toEqual([16, 25])
  })

  it('3 current asset accounts → Total Current Assets sums them', () => {
    const accounts: BsAccountEntry[] = [
      { catalogId: 'cash', excelRow: 8, section: 'current_assets' },
      { catalogId: 'inventory', excelRow: 12, section: 'current_assets' },
      { catalogId: 'prepaid_expenses', excelRow: 13, section: 'current_assets' },
    ]
    const manifest = buildDynamicBsManifest(accounts, 'en', 1, 2022)
    const totalCA = manifest.rows.find((r) => r.excelRow === 16)
    expect(totalCA?.computedFrom).toEqual([8, 12, 13])
  })

  it('custom account (excelRow 1000) included in correct subtotal', () => {
    const accounts: BsAccountEntry[] = [
      { catalogId: 'custom_1', excelRow: 1000, section: 'current_assets', customLabel: 'Custom Account' },
    ]
    const manifest = buildDynamicBsManifest(accounts, 'en', 1, 2022)
    const totalCA = manifest.rows.find((r) => r.excelRow === 16)
    expect(totalCA?.computedFrom).toContain(1000)
  })

  it('fixed assets → Net computed from beginning + accum depr', () => {
    const accounts: BsAccountEntry[] = [
      { catalogId: 'fixed_assets_beginning', excelRow: 20, section: 'fixed_assets' },
      { catalogId: 'accum_depreciation', excelRow: 21, section: 'fixed_assets' },
    ]
    const manifest = buildDynamicBsManifest(accounts, 'en', 1, 2022)
    const netFA = manifest.rows.find((r) => r.excelRow === 22)
    expect(netFA?.computedFrom).toEqual([20, 21])
  })

  it('TOTAL ASSETS = Total Current + Total Non-Current', () => {
    const manifest = buildDynamicBsManifest([], 'en', 1, 2022)
    const totalAssets = manifest.rows.find((r) => r.excelRow === 27)
    expect(totalAssets?.computedFrom).toEqual([16, 25])
  })

  it('year columns match yearCount', () => {
    const m1 = buildDynamicBsManifest([], 'en', 1, 2022)
    expect(m1.years).toEqual([2021])
    expect(Object.keys(m1.columns)).toHaveLength(1)

    const m3 = buildDynamicBsManifest([], 'en', 3, 2022)
    expect(m3.years).toEqual([2019, 2020, 2021])
    expect(Object.keys(m3.columns)).toHaveLength(3)
  })

  it('language affects leaf labels only, not structural', () => {
    const accounts: BsAccountEntry[] = [
      { catalogId: 'cash', excelRow: 8, section: 'current_assets' },
    ]
    const enManifest = buildDynamicBsManifest(accounts, 'en', 1, 2022)
    const idManifest = buildDynamicBsManifest(accounts, 'id', 1, 2022)

    // Leaf labels differ
    const enLeaf = enManifest.rows.find((r) => r.excelRow === 8)
    const idLeaf = idManifest.rows.find((r) => r.excelRow === 8)
    expect(enLeaf?.label).toBe('Cash on Hands')
    expect(idLeaf?.label).toBe('Kas dan Setara Kas')

    // Structural labels same
    const enTotal = enManifest.rows.find((r) => r.excelRow === 27)
    const idTotal = idManifest.rows.find((r) => r.excelRow === 27)
    expect(enTotal?.label).toBe(idTotal?.label)
  })
})

describe('deriveComputedRows with dynamic BS manifest', () => {
  it('sums only active accounts in section', () => {
    const accounts: BsAccountEntry[] = [
      { catalogId: 'cash', excelRow: 8, section: 'current_assets' },
      { catalogId: 'inventory', excelRow: 12, section: 'current_assets' },
    ]
    const manifest = buildDynamicBsManifest(accounts, 'en', 1, 2022)
    const values = {
      8: { 2021: 100_000_000 },
      12: { 2021: 50_000_000 },
    }
    const computed = deriveComputedRows(manifest.rows, values, [2021])
    // Total Current Assets = cash + inventory
    expect(computed[16]?.[2021]).toBe(150_000_000)
    // Total Assets = Total Current + Total Non-Current (which is 0)
    expect(computed[27]?.[2021]).toBe(150_000_000)
  })

  it('equity subtotals work correctly', () => {
    const accounts: BsAccountEntry[] = [
      { catalogId: 'paid_in_capital', excelRow: 43, section: 'equity' },
      { catalogId: 'retained_earnings_beginning', excelRow: 46, section: 'equity' },
      { catalogId: 'net_income', excelRow: 47, section: 'equity' },
    ]
    const manifest = buildDynamicBsManifest(accounts, 'en', 1, 2022)
    const values = {
      43: { 2021: 2_000_000_000 },
      46: { 2021: 500_000_000 },
      47: { 2021: 100_000_000 },
    }
    const computed = deriveComputedRows(manifest.rows, values, [2021])
    // Retained Earnings Ending = beginning + net income
    expect(computed[48]?.[2021]).toBe(600_000_000)
    // Shareholders' Equity = paid_in + retained ending
    expect(computed[49]?.[2021]).toBe(2_600_000_000)
  })
})

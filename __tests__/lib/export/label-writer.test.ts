import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import {
  resolveLabel,
  writeBsLabels,
  writeIsLabels,
  writeFaLabels,
  writeAamLabels,
} from '@/lib/export/sheet-builders/label-writer'
import { BS_CATALOG_ALL } from '@/data/catalogs/balance-sheet-catalog'
import type { BsAccountEntry } from '@/data/catalogs/balance-sheet-catalog'
import type { IsAccountEntry } from '@/data/catalogs/income-statement-catalog'
import type { FaAccountEntry } from '@/data/catalogs/fixed-asset-catalog'

describe('resolveLabel', () => {
  const catalog = [
    { id: 'cash', labelEn: 'Cash on Hands', labelId: 'Kas', excelRow: 8 },
    { id: 'ar', labelEn: 'Account Receivable', labelId: 'Piutang Usaha', excelRow: 10 },
  ] as const

  it('returns customLabel when present, regardless of language', () => {
    const acc = { catalogId: 'cash', customLabel: 'Petty Cash HQ', excelRow: 8 }
    expect(resolveLabel(acc, catalog, 'en')).toBe('Petty Cash HQ')
    expect(resolveLabel(acc, catalog, 'id')).toBe('Petty Cash HQ')
  })

  it('returns English label when language=en and no customLabel', () => {
    const acc = { catalogId: 'cash', excelRow: 8 }
    expect(resolveLabel(acc, catalog, 'en')).toBe('Cash on Hands')
  })

  it('returns Indonesian label when language=id and no customLabel', () => {
    const acc = { catalogId: 'cash', excelRow: 8 }
    expect(resolveLabel(acc, catalog, 'id')).toBe('Kas')
  })

  it('falls back to catalogId when account refers to unknown catalog entry', () => {
    const acc = { catalogId: 'unknown_custom_123', excelRow: 1001 }
    expect(resolveLabel(acc, catalog, 'en')).toBe('unknown_custom_123')
    expect(resolveLabel(acc, catalog, 'id')).toBe('unknown_custom_123')
  })
})

describe('writeBsLabels', () => {
  it('writes labelEn for each account in col B at its excelRow', () => {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('BALANCE SHEET')
    const accounts: BsAccountEntry[] = [
      { catalogId: 'cash', excelRow: 8, section: 'current_assets' },
      { catalogId: 'account_receivable', excelRow: 10, section: 'current_assets' },
    ]

    writeBsLabels(ws, accounts, 'en')

    expect(ws.getCell('B8').value).toBe('Cash on Hands')
    expect(ws.getCell('B10').value).toBe('Account Receivable')
  })

  it('writes labelId when language=id', () => {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('BALANCE SHEET')
    const accounts: BsAccountEntry[] = [
      { catalogId: 'cash', excelRow: 8, section: 'current_assets' },
    ]

    writeBsLabels(ws, accounts, 'id')

    expect(ws.getCell('B8').value).toBe('Kas')
  })

  it('honors customLabel over catalog labels', () => {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('BALANCE SHEET')
    const accounts: BsAccountEntry[] = [
      { catalogId: 'cash', customLabel: 'Petty Cash Only', excelRow: 8, section: 'current_assets' },
    ]

    writeBsLabels(ws, accounts, 'en')
    expect(ws.getCell('B8').value).toBe('Petty Cash Only')
  })

  it('does not touch col B rows for accounts not in the list', () => {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('BALANCE SHEET')
    ws.getCell('B15').value = 'Prototipe Leakage'

    const accounts: BsAccountEntry[] = [
      { catalogId: 'cash', excelRow: 8, section: 'current_assets' },
    ]

    writeBsLabels(ws, accounts, 'en')

    // Row 15 untouched by this helper (caller's responsibility to clear first)
    expect(ws.getCell('B15').value).toBe('Prototipe Leakage')
    // Row 8 populated
    expect(ws.getCell('B8').value).toBe('Cash on Hands')
  })
})

describe('writeIsLabels', () => {
  it('writes labelEn for each IS account', () => {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('INCOME STATEMENT')
    const accounts: IsAccountEntry[] = [
      { catalogId: 'revenue', excelRow: 100, section: 'revenue' },
      { catalogId: 'cogs', excelRow: 200, section: 'cost' },
    ]

    writeIsLabels(ws, accounts, 'en')

    expect(ws.getCell('B100').value).toBe('Revenue')
    expect(ws.getCell('B200').value).toBe('Cost of Goods Sold')
  })
})

describe('writeFaLabels', () => {
  it('writes labelEn for each FA account at its excelRow', () => {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('FIXED ASSET')
    const accounts: FaAccountEntry[] = [
      { catalogId: 'land', excelRow: 8, section: 'fixed_asset' },
      { catalogId: 'building', excelRow: 9, section: 'fixed_asset' },
    ]

    writeFaLabels(ws, accounts, 'en')

    expect(ws.getCell('B8').value).toBe('Land')
    expect(ws.getCell('B9').value).toBe('Building')
  })
})

describe('writeAamLabels', () => {
  it('writes BS labels at corresponding AAM D-row positions via BS_ROW_TO_AAM_D_ROW', () => {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('AAM')
    const accounts: BsAccountEntry[] = [
      // BS row 8 (cash) maps to AAM row 9 per BS_ROW_TO_AAM_D_ROW
      { catalogId: 'cash', excelRow: 8, section: 'current_assets' },
      // BS row 10 (AR) maps to AAM row 11
      { catalogId: 'account_receivable', excelRow: 10, section: 'current_assets' },
    ]

    writeAamLabels(ws, accounts, 'en')

    expect(ws.getCell('B9').value).toBe('Cash on Hands')
    expect(ws.getCell('B11').value).toBe('Account Receivable')
  })

  it('honors language preference', () => {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('AAM')
    const accounts: BsAccountEntry[] = [
      { catalogId: 'cash', excelRow: 8, section: 'current_assets' },
    ]

    writeAamLabels(ws, accounts, 'id')
    expect(ws.getCell('B9').value).toBe('Kas')
  })

  it('skips accounts that have no BS_ROW_TO_AAM_D_ROW mapping (extended accounts)', () => {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('AAM')
    const accounts: BsAccountEntry[] = [
      // excelRow 100 is an extended account — no mapping to AAM sheet yet
      { catalogId: 'short_term_invest', excelRow: 100, section: 'current_assets' },
    ]

    expect(() => writeAamLabels(ws, accounts, 'en')).not.toThrow()
    // No cell should have been written for excelRow 100 since it has no AAM mapping
    expect(ws.getCell('B9').value).toBeFalsy()
    expect(ws.getCell('B100').value).toBeFalsy()
  })
})

describe('catalog sanity', () => {
  it('BS_CATALOG_ALL has both labelEn and labelId for every entry', () => {
    for (const entry of BS_CATALOG_ALL) {
      expect(entry.labelEn).toBeTruthy()
      expect(entry.labelId).toBeTruthy()
    }
  })
})

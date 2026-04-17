import { describe, expect, it, beforeEach } from 'vitest'
import ExcelJS from 'exceljs'
import { IncomeStatementBuilder } from '@/lib/export/sheet-builders/income-statement'
import type { ExportableState } from '@/lib/export/export-xlsx'
import type { IncomeStatementInputState } from '@/data/live/types'
import type { HomeInputs } from '@/types/financial'

function makeWorkbook(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('INCOME STATEMENT')
  ws.getCell('B100').value = 'Pendapatan (prototipe)'
  ws.getCell('B200').value = 'HPP (prototipe)'
  return wb
}

function makeHome(tahun = 2022): HomeInputs {
  return {
    namaPerusahaan: 'Test Co',
    npwp: '',
    tahunTransaksi: tahun,
    jenisPerusahaan: 'tertutup',
    jenisSubjekPajak: 'badan',
    jumlahSahamBeredar: 1000,
    proporsiSaham: 1,
    dlomPercent: 0,
    dlocPercent: 0,
  } as HomeInputs
}

function makeIsState(
  accounts: IncomeStatementInputState['accounts'],
  language: 'en' | 'id' = 'en',
): IncomeStatementInputState {
  return {
    accounts,
    yearCount: 4,
    language,
    rows: {},
  }
}

function makeState(overrides: Partial<ExportableState>): ExportableState {
  return {
    home: makeHome(),
    balanceSheet: null,
    incomeStatement: null,
    fixedAsset: null,
    wacc: null,
    discountRate: null,
    keyDrivers: null,
    dlom: null,
    dloc: null,
    borrowingCapInput: null,
    aamAdjustments: {},
    nilaiPengalihanDilaporkan: 0,
    ...overrides,
  }
}

describe('IncomeStatementBuilder — metadata', () => {
  it('has correct sheetName + upstream', () => {
    expect(IncomeStatementBuilder.sheetName).toBe('INCOME STATEMENT')
    expect(IncomeStatementBuilder.upstream).toContain('incomeStatement')
  })
})

describe('IncomeStatementBuilder.build — labels', () => {
  let wb: ExcelJS.Workbook
  beforeEach(() => {
    wb = makeWorkbook()
  })

  it('writes English catalog labels when language=en', () => {
    const state = makeState({
      incomeStatement: makeIsState([
        { catalogId: 'revenue', excelRow: 100, section: 'revenue' },
        { catalogId: 'cogs', excelRow: 200, section: 'cost' },
      ], 'en'),
    })

    IncomeStatementBuilder.build(wb, state)
    const ws = wb.getWorksheet('INCOME STATEMENT')!
    expect(ws.getCell('B100').value).toBe('Revenue')
    expect(ws.getCell('B200').value).toBe('Cost of Goods Sold')
  })

  it('writes Indonesian labels when language=id', () => {
    const state = makeState({
      incomeStatement: makeIsState([
        { catalogId: 'revenue', excelRow: 100, section: 'revenue' },
      ], 'id'),
    })

    IncomeStatementBuilder.build(wb, state)
    const ws = wb.getWorksheet('INCOME STATEMENT')!
    expect(ws.getCell('B100').value).toBe('Pendapatan Usaha')
  })

  it('prefers customLabel', () => {
    const state = makeState({
      incomeStatement: makeIsState([
        { catalogId: 'revenue', customLabel: 'Penjualan Khusus', excelRow: 100, section: 'revenue' },
      ], 'en'),
    })

    IncomeStatementBuilder.build(wb, state)
    const ws = wb.getWorksheet('INCOME STATEMENT')!
    expect(ws.getCell('B100').value).toBe('Penjualan Khusus')
  })
})

describe('IncomeStatementBuilder.build — values', () => {
  it('writes year values for extended rows', () => {
    const wb = makeWorkbook()
    const state = makeState({
      incomeStatement: {
        accounts: [{ catalogId: 'revenue', excelRow: 100, section: 'revenue' }],
        yearCount: 4,
        language: 'en',
        rows: { 100: { 2019: 1_000, 2020: 2_000, 2021: 3_000 } },
      },
    })

    IncomeStatementBuilder.build(wb, state)
    const ws = wb.getWorksheet('INCOME STATEMENT')!
    // IS grid maps 2019→D, 2020→E, 2021→F (same layout as BS)
    expect(ws.getCell('D100').value).toBe(1_000)
    expect(ws.getCell('E100').value).toBe(2_000)
    expect(ws.getCell('F100').value).toBe(3_000)
  })

  it('replaces section sentinel with SUM formula when extended accounts present', () => {
    const wb = makeWorkbook()
    const state = makeState({
      incomeStatement: {
        accounts: [{ catalogId: 'revenue', excelRow: 100, section: 'revenue' }],
        yearCount: 4,
        language: 'en',
        rows: { 100: { 2021: 3_000 } },
      },
    })

    IncomeStatementBuilder.build(wb, state)
    const ws = wb.getWorksheet('INCOME STATEMENT')!
    // Sentinel row 6 (revenue section) — replaced with SUM formula per
    // replaceIsSectionSentinels across year columns
    const f6 = ws.getCell('F6').value
    expect(typeof f6).toBe('object')
    expect((f6 as { formula: string }).formula).toContain('SUM(F100:F119)')
  })
})

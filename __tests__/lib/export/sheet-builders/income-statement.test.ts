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
    accPayables: null,
    wacc: null,
    discountRate: null,
    keyDrivers: null,
    dlom: null,
    dloc: null,
    borrowingCapInput: null,
    aamAdjustments: {},
    nilaiPengalihanDilaporkan: 0, interestBearingDebt: 0,
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

// Session 042 Task 1: Tax Adjustment export — rows 600 (Fiscal Correction)
// + 601 (TAXABLE PROFIT = PBT + Koreksi). Row 601 is a live Excel formula
// `=<col>32+<col>600` with a cached pre-computed result so headless
// viewers (e.g. QuickLook) still display the value.
describe('IncomeStatementBuilder.build — Tax Adjustment rows 600/601 (Session 042 Task 1)', () => {
  it('writes Koreksi Fiskal leaf values at row 600 for each year', () => {
    const wb = makeWorkbook()
    const state = makeState({
      incomeStatement: {
        accounts: [],
        yearCount: 4,
        language: 'en',
        rows: {
          600: { 2019: 100_000, 2020: 200_000, 2021: 300_000 },
        },
      },
    })

    IncomeStatementBuilder.build(wb, state)
    const ws = wb.getWorksheet('INCOME STATEMENT')!
    expect(ws.getCell('D600').value).toBe(100_000)
    expect(ws.getCell('E600').value).toBe(200_000)
    expect(ws.getCell('F600').value).toBe(300_000)
  })

  it('writes TAXABLE PROFIT formula + cached value at row 601 for each year', () => {
    const wb = makeWorkbook()
    const state = makeState({
      incomeStatement: {
        accounts: [],
        yearCount: 4,
        language: 'en',
        rows: {
          601: { 2019: 500_000, 2020: 750_000, 2021: 1_000_000 },
        },
      },
    })

    IncomeStatementBuilder.build(wb, state)
    const ws = wb.getWorksheet('INCOME STATEMENT')!
    const d601 = ws.getCell('D601').value as { formula: string; result: number }
    expect(typeof d601).toBe('object')
    expect(d601.formula).toBe('D32+D600')
    expect(d601.result).toBe(500_000)

    const e601 = ws.getCell('E601').value as { formula: string; result: number }
    expect(e601.formula).toBe('E32+E600')
    expect(e601.result).toBe(750_000)

    const f601 = ws.getCell('F601').value as { formula: string; result: number }
    expect(f601.formula).toBe('F32+F600')
    expect(f601.result).toBe(1_000_000)
  })

  it('writes English labels at B600/B601 when language=en', () => {
    const wb = makeWorkbook()
    const state = makeState({
      incomeStatement: {
        accounts: [],
        yearCount: 4,
        language: 'en',
        rows: {},
      },
    })

    IncomeStatementBuilder.build(wb, state)
    const ws = wb.getWorksheet('INCOME STATEMENT')!
    expect(ws.getCell('B600').value).toBe('Fiscal Correction')
    expect(ws.getCell('B601').value).toBe('TAXABLE PROFIT')
  })

  it('writes Indonesian labels at B600/B601 when language=id', () => {
    const wb = makeWorkbook()
    const state = makeState({
      incomeStatement: {
        accounts: [],
        yearCount: 4,
        language: 'id',
        rows: {},
      },
    })

    IncomeStatementBuilder.build(wb, state)
    const ws = wb.getWorksheet('INCOME STATEMENT')!
    expect(ws.getCell('B600').value).toBe('Koreksi Fiskal')
    expect(ws.getCell('B601').value).toBe('LABA KENA PAJAK')
  })

  it('skips tax adjustment rows when rows[600] and rows[601] are absent', () => {
    const wb = makeWorkbook()
    const state = makeState({
      incomeStatement: {
        accounts: [],
        yearCount: 4,
        language: 'en',
        rows: {},
      },
    })

    IncomeStatementBuilder.build(wb, state)
    const ws = wb.getWorksheet('INCOME STATEMENT')!
    // Labels still written so template row gets human-readable identifier
    expect(ws.getCell('B600').value).toBe('Fiscal Correction')
    expect(ws.getCell('B601').value).toBe('TAXABLE PROFIT')
    // But values are not overwritten — template default (null) preserved
    expect(ws.getCell('D600').value).toBeNull()
    // Row 601 formula is still written because E32+E600 is always valid to
    // evaluate in Excel regardless of whether we have a cached preview.
    const d601 = ws.getCell('D601').value as { formula: string; result?: number }
    expect(typeof d601).toBe('object')
    expect(d601.formula).toBe('D32+D600')
  })
})

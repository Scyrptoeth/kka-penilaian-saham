import { describe, expect, it, beforeEach } from 'vitest'
import ExcelJS from 'exceljs'
import { AamBuilder } from '@/lib/export/sheet-builders/aam'
import type { ExportableState } from '@/lib/export/export-xlsx'
import type { BalanceSheetInputState } from '@/data/live/types'
import type { HomeInputs } from '@/types/financial'

function makeWorkbook(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('AAM')
  // Seed prototipe-style label in col B at AAM row 9 (maps to BS row 8 = cash)
  ws.getCell('B9').value = 'Kas dan setara kas (prototipe)'
  ws.getCell('B11').value = 'Piutang (prototipe)'
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

function makeBsState(
  accounts: BalanceSheetInputState['accounts'],
  language: 'en' | 'id' = 'en',
): BalanceSheetInputState {
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

describe('AamBuilder — metadata', () => {
  it('has correct sheetName', () => {
    expect(AamBuilder.sheetName).toBe('AAM')
  })

  it('depends on balanceSheet + home upstream', () => {
    expect(AamBuilder.upstream).toContain('balanceSheet')
    expect(AamBuilder.upstream).toContain('home')
  })
})

describe('AamBuilder.build — labels via reverse BS_ROW_TO_AAM_D_ROW', () => {
  let wb: ExcelJS.Workbook
  beforeEach(() => {
    wb = makeWorkbook()
  })

  it('writes English label at AAM row 9 for BS cash (row 8)', () => {
    const state = makeState({
      balanceSheet: makeBsState([
        { catalogId: 'cash', excelRow: 8, section: 'current_assets' },
        { catalogId: 'account_receivable', excelRow: 10, section: 'current_assets' },
      ], 'en'),
    })

    AamBuilder.build(wb, state)
    const ws = wb.getWorksheet('AAM')!
    // BS row 8 (cash) → AAM row 9
    expect(ws.getCell('B9').value).toBe('Cash on Hands')
    // BS row 10 (AR) → AAM row 11
    expect(ws.getCell('B11').value).toBe('Account Receivable')
  })

  it('writes Indonesian label when language=id', () => {
    const state = makeState({
      balanceSheet: makeBsState([
        { catalogId: 'cash', excelRow: 8, section: 'current_assets' },
      ], 'id'),
    })

    AamBuilder.build(wb, state)
    const ws = wb.getWorksheet('AAM')!
    expect(ws.getCell('B9').value).toBe('Kas')
  })

  it('prefers customLabel', () => {
    const state = makeState({
      balanceSheet: makeBsState([
        { catalogId: 'cash', customLabel: 'Petty Cash HQ', excelRow: 8, section: 'current_assets' },
      ], 'en'),
    })

    AamBuilder.build(wb, state)
    const ws = wb.getWorksheet('AAM')!
    expect(ws.getCell('B9').value).toBe('Petty Cash HQ')
  })
})

describe('AamBuilder.build — adjustments', () => {
  it('writes per-row adjustments to col D', () => {
    const wb = makeWorkbook()
    const state = makeState({
      balanceSheet: makeBsState([
        { catalogId: 'cash', excelRow: 8, section: 'current_assets' },
      ], 'en'),
      // BS row 8 → AAM D9 per BS_ROW_TO_AAM_D_ROW
      aamAdjustments: { 8: 500_000 },
    })

    AamBuilder.build(wb, state)
    const ws = wb.getWorksheet('AAM')!
    expect(ws.getCell('D9').value).toBe(500_000)
  })

  it('no-ops when adjustments are empty', () => {
    const wb = makeWorkbook()
    const state = makeState({
      balanceSheet: makeBsState([
        { catalogId: 'cash', excelRow: 8, section: 'current_assets' },
      ]),
      aamAdjustments: {},
    })

    AamBuilder.build(wb, state)
    const ws = wb.getWorksheet('AAM')!
    // D9 should not have been written (remains whatever template had, here null)
    expect(ws.getCell('D9').value).toBeFalsy()
  })
})

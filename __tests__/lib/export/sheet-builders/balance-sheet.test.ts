import { describe, expect, it, beforeEach } from 'vitest'
import ExcelJS from 'exceljs'
import { BalanceSheetBuilder } from '@/lib/export/sheet-builders/balance-sheet'
import type { ExportableState } from '@/lib/export/export-xlsx'
import type { BalanceSheetInputState } from '@/data/live/types'
import type { HomeInputs } from '@/types/financial'

function makeWorkbook(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('BALANCE SHEET')
  // Seed prototipe-style label in col B row 8 — the thing we want to
  // verify gets overwritten with store label.
  ws.getCell('B8').value = 'Kas dan setara kas (prototipe)'
  ws.getCell('B10').value = 'Piutang (prototipe)'
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

describe('BalanceSheetBuilder — metadata', () => {
  it('has correct sheetName + upstream slices', () => {
    expect(BalanceSheetBuilder.sheetName).toBe('BALANCE SHEET')
    // Must depend on balanceSheet slice; home is needed by extended injectors'
    // helpers (none directly but caller context), fixedAsset supplies
    // cross-ref values rows 20/21. We treat balanceSheet as the anchor
    // slice — orchestrator populates even if fixedAsset null (cross-ref
    // injector no-ops cleanly when FA null).
    expect(BalanceSheetBuilder.upstream).toContain('balanceSheet')
  })
})

describe('BalanceSheetBuilder.build — labels', () => {
  let wb: ExcelJS.Workbook

  beforeEach(() => {
    wb = makeWorkbook()
  })

  it('writes English catalog labels to col B when language=en', () => {
    const state = makeState({
      balanceSheet: makeBsState([
        { catalogId: 'cash', excelRow: 8, section: 'current_assets' },
        { catalogId: 'account_receivable', excelRow: 10, section: 'current_assets' },
      ], 'en'),
    })

    BalanceSheetBuilder.build(wb, state)

    const ws = wb.getWorksheet('BALANCE SHEET')!
    expect(ws.getCell('B8').value).toBe('Cash on Hands')
    expect(ws.getCell('B10').value).toBe('Account Receivable')
  })

  it('writes Indonesian labels when language=id', () => {
    const state = makeState({
      balanceSheet: makeBsState([
        { catalogId: 'cash', excelRow: 8, section: 'current_assets' },
      ], 'id'),
    })

    BalanceSheetBuilder.build(wb, state)

    const ws = wb.getWorksheet('BALANCE SHEET')!
    expect(ws.getCell('B8').value).toBe('Kas')
  })

  it('prefers customLabel over catalog labels', () => {
    const state = makeState({
      balanceSheet: makeBsState([
        { catalogId: 'cash', customLabel: 'Petty Cash Only', excelRow: 8, section: 'current_assets' },
      ], 'en'),
    })

    BalanceSheetBuilder.build(wb, state)

    const ws = wb.getWorksheet('BALANCE SHEET')!
    expect(ws.getCell('B8').value).toBe('Petty Cash Only')
  })
})

describe('BalanceSheetBuilder.build — values', () => {
  it('writes year values from store to mapped leaf cells', () => {
    const wb = makeWorkbook()
    const state = makeState({
      balanceSheet: {
        accounts: [{ catalogId: 'cash', excelRow: 8, section: 'current_assets' }],
        yearCount: 4,
        language: 'en',
        rows: {
          8: { 2019: 100, 2020: 200, 2021: 300 },
        },
      },
    })

    BalanceSheetBuilder.build(wb, state)

    const ws = wb.getWorksheet('BALANCE SHEET')!
    // BS grid maps 2019→D, 2020→E, 2021→F
    expect(ws.getCell('D8').value).toBe(100)
    expect(ws.getCell('E8').value).toBe(200)
    expect(ws.getCell('F8').value).toBe(300)
  })

  it('writes extended catalog accounts (excelRow >= 100) with labels in col B', () => {
    const wb = makeWorkbook()
    const state = makeState({
      balanceSheet: {
        accounts: [
          { catalogId: 'short_term_invest', excelRow: 100, section: 'current_assets' },
        ],
        yearCount: 4,
        language: 'en',
        rows: {
          100: { 2021: 500 },
        },
      },
    })

    BalanceSheetBuilder.build(wb, state)

    const ws = wb.getWorksheet('BALANCE SHEET')!
    // Extended injector writes labelEn to col B at excelRow 100
    expect(ws.getCell('B100').value).toBe('Short-term Investments')
    // Value at F100 (2021 column)
    expect(ws.getCell('F100').value).toBe(500)
  })
})

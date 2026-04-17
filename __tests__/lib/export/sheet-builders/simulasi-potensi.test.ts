import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { SimulasiPotensiBuilder } from '@/lib/export/sheet-builders/simulasi-potensi'
import type { ExportableState } from '@/lib/export/export-xlsx'
import type { BalanceSheetInputState } from '@/data/live/types'
import type { HomeInputs } from '@/types/financial'

function makeWorkbook(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('SIMULASI POTENSI (AAM)')
  // Seed prototipe content in col B — the builder should not touch
  // label cells because SIMULASI sheet uses its own structural labels
  // that are stable across companies.
  ws.getCell('B4').value = 'Nilai Ekuitas'
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
    dlomPercent: 0.3,
    dlocPercent: 0.5,
  } as HomeInputs
}

function makeBsState(
  accounts: BalanceSheetInputState['accounts'] = [],
): BalanceSheetInputState {
  return {
    accounts,
    yearCount: 4,
    language: 'en',
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
    nilaiPengalihanDilaporkan: 0,
    ...overrides,
  }
}

describe('SimulasiPotensiBuilder — metadata', () => {
  it('has correct sheetName', () => {
    expect(SimulasiPotensiBuilder.sheetName).toBe('SIMULASI POTENSI (AAM)')
  })

  it('has balanceSheet + home upstream dependencies', () => {
    expect(SimulasiPotensiBuilder.upstream).toContain('balanceSheet')
    expect(SimulasiPotensiBuilder.upstream).toContain('home')
  })
})

describe('SimulasiPotensiBuilder.build', () => {
  it('writes nilaiPengalihanDilaporkan to E11', () => {
    const wb = makeWorkbook()
    const state = makeState({
      balanceSheet: makeBsState([
        { catalogId: 'cash', excelRow: 8, section: 'current_assets' },
      ]),
      nilaiPengalihanDilaporkan: 750_000_000,
    })

    SimulasiPotensiBuilder.build(wb, state)
    const ws = wb.getWorksheet('SIMULASI POTENSI (AAM)')!
    expect(ws.getCell('E11').value).toBe(750_000_000)
  })

  it('writes zero to E11 when nilaiPengalihanDilaporkan = 0', () => {
    const wb = makeWorkbook()
    const state = makeState({
      balanceSheet: makeBsState([]),
      nilaiPengalihanDilaporkan: 0,
    })

    SimulasiPotensiBuilder.build(wb, state)
    const ws = wb.getWorksheet('SIMULASI POTENSI (AAM)')!
    expect(ws.getCell('E11').value).toBe(0)
  })

  it('does not touch col B labels — SIMULASI sheet uses template labels', () => {
    const wb = makeWorkbook()
    const state = makeState({
      balanceSheet: makeBsState([]),
    })

    SimulasiPotensiBuilder.build(wb, state)
    const ws = wb.getWorksheet('SIMULASI POTENSI (AAM)')!
    expect(ws.getCell('B4').value).toBe('Nilai Ekuitas')
  })
})

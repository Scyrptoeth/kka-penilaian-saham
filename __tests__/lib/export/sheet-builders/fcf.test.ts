import { describe, expect, it, beforeEach } from 'vitest'
import ExcelJS from 'exceljs'
import { FcfBuilder } from '@/lib/export/sheet-builders/fcf'
import type { ExportableState } from '@/lib/export/export-xlsx'
import type { HomeInputs } from '@/types/financial'
import type {
  BalanceSheetInputState,
  IncomeStatementInputState,
  FixedAssetInputState,
} from '@/data/live/types'

function makeWorkbook(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('FCF')
  for (const row of [7, 8, 9, 12, 13, 14, 16, 18, 20]) {
    for (const col of ['C', 'D', 'E']) {
      ws.getCell(`${col}${row}`).value = 999
    }
  }
  return wb
}

function makeHome(): HomeInputs {
  return {
    namaPerusahaan: 'Test Co', npwp: '', namaSubjekPajak: '', npwpSubjekPajak: '',
    jenisSubjekPajak: 'badan', jenisPerusahaan: 'tertutup',
    objekPenilaian: 'saham', jenisInformasiPeralihan: 'jualBeli',
    jumlahSahamBeredar: 1000, jumlahSahamYangDinilai: 500,
    nilaiNominalPerSaham: 1, tahunTransaksi: 2022,
    proporsiSaham: 0.5, dlomPercent: 0, dlocPercent: 0,
  } as HomeInputs
}

function makeBs(): BalanceSheetInputState {
  const years = [2018, 2019, 2020, 2021]
  const row = (vals: number[]) => Object.fromEntries(years.map((y, i) => [y, vals[i]]))
  return {
    accounts: [], yearCount: 4, language: 'en',
    rows: {
      8: row([100, 120, 130, 140]),
      9: row([50, 60, 70, 80]),
      10: row([200, 220, 240, 260]),
      11: row([10, 12, 14, 16]),
      12: row([300, 330, 360, 390]),
      14: row([5, 5, 5, 5]),
      31: row([100, 100, 100, 100]),
      32: row([150, 160, 170, 180]),
      33: row([20, 25, 30, 35]),
      34: row([10, 10, 10, 10]),
    },
  }
}

function makeIs(): IncomeStatementInputState {
  return {
    accounts: [], yearCount: 3, language: 'en',
    rows: {
      18: { 2019: 1000, 2020: 1200, 2021: 1400 },
      32: { 2019: 700, 2020: 800, 2021: 900 },
      33: { 2019: -150, 2020: -180, 2021: -200 },
      30: { 2019: 50, 2020: 60, 2021: 70 },
      27: { 2019: -100, 2020: -110, 2021: -120 },
      26: { 2019: 20, 2020: 25, 2021: 30 },
    },
  }
}

function makeFa(): FixedAssetInputState {
  // FA row 23 = SUM(17..22) = 500 for 2019; row 51 = SUM(45..50) = 200 for 2019.
  return {
    accounts: [], yearCount: 3, language: 'en',
    rows: {
      // Acquisition additions leaves sum to row 23
      17: { 2019: 100, 2020: 100, 2021: 100 },
      18: { 2019: 100, 2020: 100, 2021: 100 },
      19: { 2019: 100, 2020: 100, 2021: 100 },
      20: { 2019: 100, 2020: 100, 2021: 100 },
      21: { 2019: 100, 2020: 100, 2021: 200 },
      22: { 2019: 0, 2020: 200, 2021: 200 },
      // Depreciation additions leaves sum to row 51
      45: { 2019: 50, 2020: 50, 2021: 50 },
      46: { 2019: 50, 2020: 50, 2021: 50 },
      47: { 2019: 50, 2020: 50, 2021: 50 },
      48: { 2019: 50, 2020: 50, 2021: 50 },
      49: { 2019: 0, 2020: 50, 2021: 100 },
      50: { 2019: 0, 2020: 0, 2021: 0 },
    },
  }
}

function makeState(overrides: Partial<ExportableState>): ExportableState {
  return {
    home: makeHome(), balanceSheet: null, incomeStatement: null,
    fixedAsset: null, accPayables: null, wacc: null,
    discountRate: null, keyDrivers: null, dlom: null, dloc: null,
    borrowingCapInput: null, aamAdjustments: {}, nilaiPengalihanDilaporkan: 0, interestBearingDebt: 0,
    ...overrides,
  }
}

describe('FcfBuilder — metadata', () => {
  it('has correct sheetName + upstream slices', () => {
    expect(FcfBuilder.sheetName).toBe('FCF')
    expect(FcfBuilder.upstream).toEqual([
      'home', 'balanceSheet', 'incomeStatement', 'fixedAsset', 'changesInWorkingCapital'
    ])
  })
})

describe('FcfBuilder.build', () => {
  let wb: ExcelJS.Workbook

  beforeEach(() => {
    wb = makeWorkbook()
  })

  it('full chain populated — writes FCF values overwriting prototipe', () => {
    const state = makeState({
      balanceSheet: makeBs(),
      incomeStatement: makeIs(),
      fixedAsset: makeFa(),
    })
    FcfBuilder.build(wb, state)
    const ws = wb.getWorksheet('FCF')!
    // Row 7 = NOPLAT!C19 via computed chain
    const row7 = ws.getCell('C7').value
    expect(typeof row7).toBe('number')
    expect(row7).not.toBe(999)
  })

  it('writes row 8 (Depreciation) = -FA row 51', () => {
    const state = makeState({
      balanceSheet: makeBs(),
      incomeStatement: makeIs(),
      fixedAsset: makeFa(),
    })
    FcfBuilder.build(wb, state)
    const ws = wb.getWorksheet('FCF')!
    // FA row 51 = SUM(45..50) = 200 for 2019 → row 8 = -200
    expect(ws.getCell('C8').value).toBe(-200)
  })

  it('writes row 16 (CapEx) = -FA row 23', () => {
    const state = makeState({
      balanceSheet: makeBs(),
      incomeStatement: makeIs(),
      fixedAsset: makeFa(),
    })
    FcfBuilder.build(wb, state)
    const ws = wb.getWorksheet('FCF')!
    expect(ws.getCell('C16').value).toBe(-500)
  })

  it('computes subtotal row 9 (Gross Cash Flow) via computedFrom [7, 8]', () => {
    const state = makeState({
      balanceSheet: makeBs(),
      incomeStatement: makeIs(),
      fixedAsset: makeFa(),
    })
    FcfBuilder.build(wb, state)
    const ws = wb.getWorksheet('FCF')!
    const v7 = ws.getCell('C7').value as number
    const v8 = ws.getCell('C8').value as number
    expect(ws.getCell('C9').value).toBeCloseTo(v7 + v8, 6)
  })

  it('missing home — no throw, prototipe untouched', () => {
    const state = makeState({
      home: null,
      balanceSheet: makeBs(),
      incomeStatement: makeIs(),
      fixedAsset: makeFa(),
    })
    FcfBuilder.build(wb, state)
    const ws = wb.getWorksheet('FCF')!
    expect(ws.getCell('C7').value).toBe(999)
  })

  it('missing worksheet — no throw', () => {
    const blankWb = new ExcelJS.Workbook()
    expect(() => FcfBuilder.build(blankWb, makeState({
      balanceSheet: makeBs(), incomeStatement: makeIs(), fixedAsset: makeFa(),
    }))).not.toThrow()
  })

  it('idempotent', () => {
    const state = makeState({
      balanceSheet: makeBs(),
      incomeStatement: makeIs(),
      fixedAsset: makeFa(),
    })
    FcfBuilder.build(wb, state)
    const first = wb.getWorksheet('FCF')!.getCell('C7').value
    FcfBuilder.build(wb, state)
    expect(wb.getWorksheet('FCF')!.getCell('C7').value).toBe(first)
  })
})

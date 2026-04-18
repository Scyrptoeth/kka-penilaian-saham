import { describe, expect, it, beforeEach } from 'vitest'
import ExcelJS from 'exceljs'
import { GrowthRateBuilder } from '@/lib/export/sheet-builders/growth-rate'
import type { ExportableState } from '@/lib/export/export-xlsx'
import type { HomeInputs } from '@/types/financial'
import type {
  BalanceSheetInputState,
  IncomeStatementInputState,
  FixedAssetInputState,
} from '@/data/live/types'

function makeWorkbook(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('GROWTH RATE')
  for (const row of [6, 7, 8, 9, 10, 12, 14, 15]) {
    for (const col of ['B', 'C']) {
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
      // BS sentinels
      16: row([665, 747, 824, 901]), // Total Current Assets
      22: row([5000, 5500, 6000, 6500]), // Fixed Asset Net
      27: row([700, 750, 800, 850]),
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
  // Need FA row 69 (Total Net FA) populated as sentinel
  return {
    accounts: [], yearCount: 3, language: 'en',
    rows: {
      17: { 2019: 100, 2020: 100, 2021: 100 },
      18: { 2019: 100, 2020: 100, 2021: 100 },
      19: { 2019: 100, 2020: 100, 2021: 100 },
      20: { 2019: 100, 2020: 100, 2021: 100 },
      21: { 2019: 100, 2020: 100, 2021: 200 },
      22: { 2019: 0, 2020: 200, 2021: 200 },
      45: { 2019: 50, 2020: 50, 2021: 50 },
      46: { 2019: 50, 2020: 50, 2021: 50 },
      47: { 2019: 50, 2020: 50, 2021: 50 },
      48: { 2019: 50, 2020: 50, 2021: 50 },
      49: { 2019: 0, 2020: 50, 2021: 100 },
      50: { 2019: 0, 2020: 0, 2021: 0 },
      // FA sentinel row 69 — Total Net FA (end of year)
      69: { 2019: 6000, 2020: 6200, 2021: 6400 },
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

describe('GrowthRateBuilder — metadata', () => {
  it('has correct sheetName + upstream slices', () => {
    expect(GrowthRateBuilder.sheetName).toBe('GROWTH RATE')
    expect(GrowthRateBuilder.upstream).toEqual([
      'home', 'balanceSheet', 'incomeStatement', 'fixedAsset',
    ])
  })
})

describe('GrowthRateBuilder.build', () => {
  let wb: ExcelJS.Workbook

  beforeEach(() => {
    wb = makeWorkbook()
  })

  it('writes Net FA End row 6 from FA sentinel 69', () => {
    const state = makeState({
      balanceSheet: makeBs(),
      incomeStatement: makeIs(),
      fixedAsset: makeFa(),
    })
    GrowthRateBuilder.build(wb, state)
    const ws = wb.getWorksheet('GROWTH RATE')!
    // grYears = [2020, 2021]. B = 2020 → FA row 69 at 2020 = 6200
    expect(ws.getCell('B6').value).toBe(6200)
    expect(ws.getCell('C6').value).toBe(6400)
  })

  it('writes Net CA End row 7 from BS sentinel 16', () => {
    const state = makeState({
      balanceSheet: makeBs(),
      incomeStatement: makeIs(),
      fixedAsset: makeFa(),
    })
    GrowthRateBuilder.build(wb, state)
    const ws = wb.getWorksheet('GROWTH RATE')!
    // B = 2020 → BS row 16 at 2020 = 824
    expect(ws.getCell('B7').value).toBe(824)
  })

  it('writes Total IC BOY row 12 from ROIC computed chain', () => {
    const state = makeState({
      balanceSheet: makeBs(),
      incomeStatement: makeIs(),
      fixedAsset: makeFa(),
    })
    GrowthRateBuilder.build(wb, state)
    const ws = wb.getWorksheet('GROWTH RATE')!
    const v = ws.getCell('B12').value
    expect(typeof v).toBe('number')
    expect(v).not.toBe(999)
  })

  it('writes Growth Rate ratio row 14 as a number', () => {
    const state = makeState({
      balanceSheet: makeBs(),
      incomeStatement: makeIs(),
      fixedAsset: makeFa(),
    })
    GrowthRateBuilder.build(wb, state)
    const ws = wb.getWorksheet('GROWTH RATE')!
    const v = ws.getCell('B14').value
    expect(typeof v).toBe('number')
  })

  it('writes Average row 15 only at column B (single cell)', () => {
    const state = makeState({
      balanceSheet: makeBs(),
      incomeStatement: makeIs(),
      fixedAsset: makeFa(),
    })
    GrowthRateBuilder.build(wb, state)
    const ws = wb.getWorksheet('GROWTH RATE')!
    const v = ws.getCell('B15').value
    expect(typeof v).toBe('number')
  })

  it('missing home — no throw, prototipe untouched', () => {
    const state = makeState({
      home: null,
      balanceSheet: makeBs(),
      incomeStatement: makeIs(),
      fixedAsset: makeFa(),
    })
    GrowthRateBuilder.build(wb, state)
    const ws = wb.getWorksheet('GROWTH RATE')!
    expect(ws.getCell('B6').value).toBe(999)
  })

  it('idempotent', () => {
    const state = makeState({
      balanceSheet: makeBs(),
      incomeStatement: makeIs(),
      fixedAsset: makeFa(),
    })
    GrowthRateBuilder.build(wb, state)
    const first = wb.getWorksheet('GROWTH RATE')!.getCell('B6').value
    GrowthRateBuilder.build(wb, state)
    expect(wb.getWorksheet('GROWTH RATE')!.getCell('B6').value).toBe(first)
  })
})

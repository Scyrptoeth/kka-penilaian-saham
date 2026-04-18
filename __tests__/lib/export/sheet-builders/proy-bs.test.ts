import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { ProyBsBuilder } from '@/lib/export/sheet-builders/proy-bs'
import type { ExportableState } from '@/lib/export/export-xlsx'
import type { HomeInputs } from '@/types/financial'
import type {
  BalanceSheetInputState,
  IncomeStatementInputState,
  FixedAssetInputState,
} from '@/data/live/types'
import type { KeyDriversState } from '@/lib/store/useKkaStore'

function makeWb(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('PROY BALANCE SHEET')
  for (const row of [9, 13, 17, 21, 25, 26, 28, 31, 33, 45, 52, 60, 62, 63]) {
    for (const col of ['C', 'D', 'E', 'F']) {
      ws.getCell(`${col}${row}`).value = 999
    }
  }
  return wb
}

function makeHome(over: Partial<HomeInputs> = {}): HomeInputs {
  return {
    namaPerusahaan: 'X', npwp: '99.999.999.9-999.000', namaSubjekPajak: 'Y',
    npwpSubjekPajak: '', jenisSubjekPajak: 'badan', jenisPerusahaan: 'tertutup',
    objekPenilaian: 'saham', jenisInformasiPeralihan: 'jualBeli',
    jumlahSahamBeredar: 1000, jumlahSahamYangDinilai: 500,
    nilaiNominalPerSaham: 1, tahunTransaksi: 2022,
    proporsiSaham: 0.5, dlomPercent: 0, dlocPercent: 0,
    ...over,
  } as HomeInputs
}

function makeBs(): BalanceSheetInputState {
  return {
    // Session 036: Full Simple Growth projection requires accounts metadata
    // to iterate leaves. Add stub entries for every row present in rows{}.
    accounts: [
      { catalogId: 'cash_on_hands', excelRow: 8, section: 'current_assets' },
      { catalogId: 'ar', excelRow: 10, section: 'current_assets' },
      { catalogId: 'other_r', excelRow: 11, section: 'current_assets' },
      { catalogId: 'inv', excelRow: 12, section: 'current_assets' },
      { catalogId: 'others_ca', excelRow: 14, section: 'current_assets' },
      { catalogId: 'fa_beg', excelRow: 20, section: 'fixed_assets' },
      { catalogId: 'accum_dep', excelRow: 21, section: 'fixed_assets' },
      { catalogId: 'other_nca', excelRow: 23, section: 'other_non_current_assets' },
      { catalogId: 'intangible', excelRow: 24, section: 'intangible_assets' },
      { catalogId: 'bank_st', excelRow: 31, section: 'current_liabilities' },
      { catalogId: 'ap', excelRow: 32, section: 'current_liabilities' },
      { catalogId: 'tax_pay', excelRow: 33, section: 'current_liabilities' },
      { catalogId: 'other_cl', excelRow: 34, section: 'current_liabilities' },
      { catalogId: 'bank_lt', excelRow: 38, section: 'non_current_liabilities' },
      { catalogId: 'other_ncl', excelRow: 39, section: 'non_current_liabilities' },
      { catalogId: 'paid_up', excelRow: 43, section: 'equity' },
      { catalogId: 'surplus', excelRow: 46, section: 'equity' },
      { catalogId: 'current_profit', excelRow: 47, section: 'equity' },
    ],
    yearCount: 4, language: 'en',
    rows: {
      8:  { 2018: 900, 2019: 1000, 2020: 1100, 2021: 1200 },
      10: { 2018: 200, 2019: 220, 2020: 240, 2021: 260 }, // AR
      11: { 2018: 50, 2019: 55, 2020: 60, 2021: 65 },
      12: { 2018: 300, 2019: 330, 2020: 360, 2021: 390 }, // Inv
      14: { 2018: 10, 2019: 12, 2020: 14, 2021: 16 }, // Others
      20: { 2018: 1000, 2019: 1100, 2020: 1200, 2021: 1300 }, // FA beg
      21: { 2018: -200, 2019: -220, 2020: -240, 2021: -260 }, // accum dep
      23: { 2018: 50, 2019: 55, 2020: 60, 2021: 65 }, // Other NCA
      24: { 2018: 20, 2019: 22, 2020: 24, 2021: 26 }, // Intangible
      31: { 2018: -100, 2019: -110, 2020: -120, 2021: -130 }, // ST loan
      32: { 2018: -80, 2019: -88, 2020: -95, 2021: -100 }, // AP
      33: { 2018: -20, 2019: -22, 2020: -24, 2021: -26 }, // Tax Pay
      34: { 2018: -10, 2019: -11, 2020: -12, 2021: -13 }, // CL Others
      38: { 2018: -300, 2019: -330, 2020: -360, 2021: -390 }, // LT loan
      39: { 2018: -50, 2019: -55, 2020: -60, 2021: -65 }, // Other NCL
      43: { 2018: 500, 2019: 500, 2020: 500, 2021: 500 }, // Paid-Up
      46: { 2018: 100, 2019: 110, 2020: 120, 2021: 130 },
      47: { 2018: 50, 2019: 55, 2020: 60, 2021: 65 },
    },
  }
}

function makeIs(): IncomeStatementInputState {
  return {
    accounts: [], yearCount: 4, language: 'en',
    rows: {
      6: { 2018: 900, 2019: 1000, 2020: 1100, 2021: 1200 },
      7: { 2018: -500, 2019: -550, 2020: -600, 2021: -650 },
      8: { 2018: 400, 2019: 450, 2020: 500, 2021: 550 },
      12: { 2018: -50, 2019: -55, 2020: -60, 2021: -65 },
      13: { 2018: -40, 2019: -45, 2020: -50, 2021: -55 },
      21: { 2018: 30, 2019: 32, 2020: 34, 2021: 36 },
      26: { 2018: 10, 2019: 11, 2020: 12, 2021: 13 },
      27: { 2018: -8, 2019: -9, 2020: -10, 2021: -11 },
      30: { 2018: 5, 2019: 6, 2020: 7, 2021: 8 },
      32: { 2018: 200, 2019: 220, 2020: 240, 2021: 260 },
      33: { 2018: -44, 2019: -48, 2020: -52, 2021: -56 },
    },
  }
}

function makeFa(): FixedAssetInputState {
  return {
    accounts: [], yearCount: 3, language: 'en',
    rows: {
      8: { 2019: 100, 2020: 110, 2021: 120 },
      9: { 2019: 200, 2020: 210, 2021: 220 },
      17: { 2019: 10, 2020: 12, 2021: 14 },
      18: { 2019: 20, 2020: 22, 2021: 24 },
      45: { 2019: -10, 2020: -11, 2021: -12 },
      46: { 2019: -20, 2020: -22, 2021: -24 },
    },
  }
}

function makeKd(): KeyDriversState {
  return {
    financialDrivers: { corporateTaxRate: 0.22, interestRateShortTerm: 0.1, interestRateLongTerm: 0.12 },
    operationalDrivers: { cogsRatio: 0.55, sellingExpenseRatio: 0.05, gaExpenseRatio: 0.04 },
    balanceSheetDrivers: { arDsi: 30, apDsi: 45, invDsi: 90 },
    capex: { tahun1: 0, tahun2: 0, tahun3: 0, tahun4: 0, tahun5: 0, pertumbuhanHarga: 0 },
  } as unknown as KeyDriversState
}

function makeState(over: Partial<ExportableState> = {}): ExportableState {
  return {
    home: makeHome(), balanceSheet: makeBs(), incomeStatement: makeIs(),
    fixedAsset: makeFa(), accPayables: null, wacc: null, discountRate: null,
    keyDrivers: makeKd(), dlom: null, dloc: null, borrowingCapInput: null,
    aamAdjustments: {}, nilaiPengalihanDilaporkan: 0, interestBearingDebt: 0,
    ...over,
  }
}

describe('ProyBsBuilder', () => {
  it('has sheetName + upstream', () => {
    expect(ProyBsBuilder.sheetName).toBe('PROY BALANCE SHEET')
    expect(ProyBsBuilder.upstream).toEqual([
      'home', 'balanceSheet', 'incomeStatement', 'fixedAsset', 'keyDrivers',
    ])
  })

  it('returns early when home null', () => {
    const wb = makeWb()
    ProyBsBuilder.build(wb, makeState({ home: null }))
    expect(wb.getWorksheet('PROY BALANCE SHEET')!.getCell('C9').value).toBe(999)
  })

  // Session 036 — Input BS row output translates to Proy BS template rows
  // via INPUT_BS_TO_PROY_BS_TEMPLATE map (Input row 8 Cash → template row 9).
  it('writes Cash on Hands at template row 9 (translated from Input BS row 8)', () => {
    const wb = makeWb()
    ProyBsBuilder.build(wb, makeState())
    const ws = wb.getWorksheet('PROY BALANCE SHEET')!
    // Input BS row 8 (Cash on Hands) with histYear value 1200 → template row 9
    expect(ws.getCell('C9').value).toBe(1200)
  })

  it('writes Total Current Assets at template row 21 (translated from Input BS row 16)', () => {
    const wb = makeWb()
    ProyBsBuilder.build(wb, makeState())
    const ws = wb.getWorksheet('PROY BALANCE SHEET')!
    // Input row 16 = sum of 8+10+11+12+14 = 1200+260+65+390+16 = 1931 at 2021
    const tca = ws.getCell('C21').value as number
    expect(tca).toBeCloseTo(1931, 0)
  })

  it('writes non-999 projected values at Proy BS template rows on D/E/F', () => {
    const wb = makeWb()
    ProyBsBuilder.build(wb, makeState())
    const ws = wb.getWorksheet('PROY BALANCE SHEET')!
    // Template rows that should receive values from mapped Input BS rows
    for (const row of [9, 13, 17, 21, 25, 33, 37, 39, 45, 55, 60, 62]) {
      for (const col of ['D', 'E', 'F']) {
        expect(ws.getCell(`${col}${row}`).value, `${col}${row}`).not.toBe(999)
      }
    }
  })
})

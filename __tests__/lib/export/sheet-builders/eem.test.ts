import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { EemBuilder } from '@/lib/export/sheet-builders/eem'
import type { ExportableState } from '@/lib/export/export-xlsx'
import type { HomeInputs } from '@/types/financial'
import type {
  BalanceSheetInputState,
  IncomeStatementInputState,
  FixedAssetInputState,
} from '@/data/live/types'
import type { KeyDriversState, DiscountRateState, BorrowingCapInputState } from '@/lib/store/useKkaStore'

function makeWb(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('EEM')
  for (const row of [7, 9, 12, 13, 14, 17, 18, 19, 21, 23, 25, 27, 29, 31, 32, 33, 34]) {
    for (const col of ['C', 'D']) {
      ws.getCell(`${col}${row}`).value = 999
    }
  }
  return wb
}

function makeHome(): HomeInputs {
  return {
    namaPerusahaan: 'X', npwp: '99.999.999.9-999.000', namaSubjekPajak: 'Y',
    npwpSubjekPajak: '', jenisSubjekPajak: 'badan', jenisPerusahaan: 'tertutup',
    objekPenilaian: 'saham', jenisInformasiPeralihan: 'jualBeli',
    jumlahSahamBeredar: 1000, jumlahSahamYangDinilai: 500,
    nilaiNominalPerSaham: 1, tahunTransaksi: 2022,
    proporsiSaham: 0.5, dlomPercent: 0, dlocPercent: 0,
  } as HomeInputs
}

function makeBs(): BalanceSheetInputState {
  return {
    accounts: [
      { excelRow: 8, section: 'current_assets', labelEn: 'Cash', labelId: 'Kas', catalogId: null },
      { excelRow: 10, section: 'current_assets', labelEn: 'AR', labelId: 'AR', catalogId: null },
      { excelRow: 31, section: 'current_liabilities', labelEn: 'ST Loan', labelId: 'ST', catalogId: 'st_loan' },
      { excelRow: 32, section: 'current_liabilities', labelEn: 'AP', labelId: 'AP', catalogId: null },
      { excelRow: 43, section: 'equity', labelEn: 'Paid-Up', labelId: 'PU', catalogId: null },
    ],
    yearCount: 4, language: 'en',
    rows: {
      8: { 2018: 900, 2019: 1000, 2020: 1100, 2021: 1200 },
      10: { 2018: 200, 2019: 220, 2020: 240, 2021: 260 },
      31: { 2018: -100, 2019: -110, 2020: -120, 2021: -130 },
      32: { 2018: -80, 2019: -88, 2020: -95, 2021: -100 },
      38: { 2018: -300, 2019: -330, 2020: -360, 2021: -390 },
      43: { 2018: 500, 2019: 500, 2020: 500, 2021: 500 },
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
      17: { 2019: 10, 2020: 12, 2021: 14 },
      45: { 2019: -10, 2020: -11, 2021: -12 },
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

function makeDr(): DiscountRateState {
  return {
    rfRate: 0.065, marketReturn: 0.13, beta: 1.1, taxRate: 0.22,
    equityWeight: 0.6, debtWeight: 0.4, kdBeforeTax: 0.1, bankRates: [],
  } as unknown as DiscountRateState
}

function makeBc(): BorrowingCapInputState {
  return { piutangCalk: 100, persediaanCalk: 200 } as unknown as BorrowingCapInputState
}

function makeState(over: Partial<ExportableState> = {}): ExportableState {
  return {
    home: makeHome(), balanceSheet: makeBs(), incomeStatement: makeIs(),
    fixedAsset: makeFa(), accPayables: null, wacc: null,
    discountRate: makeDr(), keyDrivers: makeKd(),
    dlom: null, dloc: null, borrowingCapInput: makeBc(),
    aamAdjustments: {}, nilaiPengalihanDilaporkan: 0, interestBearingDebt: 0,
    ...over,
  }
}

describe('EemBuilder', () => {
  it('has sheetName + upstream', () => {
    expect(EemBuilder.sheetName).toBe('EEM')
    expect(EemBuilder.upstream).toEqual([
      'home', 'balanceSheet', 'incomeStatement', 'fixedAsset', 'discountRate', 'interestBearingDebt', 'changesInWorkingCapital'
    ])
  })

  it('returns early when discountRate null', () => {
    const wb = makeWb()
    EemBuilder.build(wb, makeState({ discountRate: null }))
    expect(wb.getWorksheet('EEM')!.getCell('D7').value).toBe(999)
  })

  it('writes NTA (D7), earning return (D9), FCF (D25)', () => {
    const wb = makeWb()
    EemBuilder.build(wb, makeState())
    const ws = wb.getWorksheet('EEM')!
    expect(ws.getCell('D7').value).not.toBe(999)
    expect(ws.getCell('D9').value).not.toBe(999)
    expect(ws.getCell('D25').value).not.toBe(999)
  })

  it('writes Enterprise Value (D31) and Equity Value (D34)', () => {
    const wb = makeWb()
    EemBuilder.build(wb, makeState())
    const ws = wb.getWorksheet('EEM')!
    expect(ws.getCell('D31').value).not.toBe(999)
    expect(ws.getCell('D34').value).not.toBe(999)
  })

  it('row 14 Gross CF = row 12 NOPLAT + row 13 Dep', () => {
    const wb = makeWb()
    EemBuilder.build(wb, makeState())
    const ws = wb.getWorksheet('EEM')!
    const n = ws.getCell('D12').value as number
    const d = ws.getCell('D13').value as number
    const g = ws.getCell('D14').value as number
    expect(g).toBeCloseTo(n + d, 0)
  })
})

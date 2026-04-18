import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { DcfBuilder } from '@/lib/export/sheet-builders/dcf'
import type { ExportableState } from '@/lib/export/export-xlsx'
import type { HomeInputs } from '@/types/financial'
import type {
  BalanceSheetInputState,
  IncomeStatementInputState,
  FixedAssetInputState,
} from '@/data/live/types'
import type { KeyDriversState, DiscountRateState } from '@/lib/store/useKkaStore'

function makeWb(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('DCF')
  for (const row of [7, 8, 9, 12, 13, 14, 16, 18, 20, 22, 23, 24, 25, 27, 28, 29, 30, 31, 32, 33]) {
    for (const col of ['B', 'C', 'D', 'E', 'F']) {
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
    accounts: [], yearCount: 4, language: 'en',
    rows: {
      8: { 2018: 900, 2019: 1000, 2020: 1100, 2021: 1200 },
      9: { 2018: 50, 2019: 55, 2020: 60, 2021: 65 },
      10: { 2018: 200, 2019: 220, 2020: 240, 2021: 260 },
      31: { 2018: -100, 2019: -110, 2020: -120, 2021: -130 },
      38: { 2018: -300, 2019: -330, 2020: -360, 2021: -390 },
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
    rfRate: 0.065,
    marketReturn: 0.13,
    beta: 1.1,
    taxRate: 0.22,
    equityWeight: 0.6,
    debtWeight: 0.4,
    kdBeforeTax: 0.1,
    bankRates: [],
  } as unknown as DiscountRateState
}

function makeState(over: Partial<ExportableState> = {}): ExportableState {
  return {
    home: makeHome(), balanceSheet: makeBs(), incomeStatement: makeIs(),
    fixedAsset: makeFa(), accPayables: null, wacc: null,
    discountRate: makeDr(),
    keyDrivers: makeKd(), dlom: null, dloc: null, borrowingCapInput: null,
    aamAdjustments: {}, nilaiPengalihanDilaporkan: 0, interestBearingDebt: 0,
    ...over,
  }
}

describe('DcfBuilder', () => {
  it('has sheetName + upstream', () => {
    expect(DcfBuilder.sheetName).toBe('DCF')
    expect(DcfBuilder.upstream).toEqual([
      'home', 'balanceSheet', 'incomeStatement', 'fixedAsset', 'keyDrivers', 'discountRate', 'interestBearingDebt', 'changesInWorkingCapital'
    ])
  })

  it('returns early when discountRate null', () => {
    const wb = makeWb()
    DcfBuilder.build(wb, makeState({ discountRate: null }))
    expect(wb.getWorksheet('DCF')!.getCell('C7').value).toBe(999)
  })

  it('writes NOPLAT row 7 across C-F', () => {
    const wb = makeWb()
    DcfBuilder.build(wb, makeState())
    const ws = wb.getWorksheet('DCF')!
    for (const col of ['C', 'D', 'E', 'F']) {
      expect(ws.getCell(`${col}7`).value, `${col}7`).not.toBe(999)
    }
  })

  it('writes periods (D22/E22/F22) = 1, 2, 3', () => {
    const wb = makeWb()
    DcfBuilder.build(wb, makeState())
    const ws = wb.getWorksheet('DCF')!
    expect(ws.getCell('D22').value).toBe(1)
    expect(ws.getCell('E22').value).toBe(2)
    expect(ws.getCell('F22').value).toBe(3)
  })

  it('writes WACC at B23 + growth at B26', () => {
    const wb = makeWb()
    DcfBuilder.build(wb, makeState())
    const ws = wb.getWorksheet('DCF')!
    expect(ws.getCell('B23').value).not.toBe(999)
    expect(ws.getCell('B26').value).not.toBe(999)
  })

  it('writes enterprise value (C29) and equity value (C33)', () => {
    const wb = makeWb()
    DcfBuilder.build(wb, makeState())
    const ws = wb.getWorksheet('DCF')!
    expect(ws.getCell('C29').value).not.toBe(999)
    expect(ws.getCell('C33').value).not.toBe(999)
  })

  it('row 9 (GrossCF) = row 7 (NOPLAT) + row 8 (Dep) per column', () => {
    const wb = makeWb()
    DcfBuilder.build(wb, makeState())
    const ws = wb.getWorksheet('DCF')!
    for (const col of ['C', 'D', 'E', 'F']) {
      const n = ws.getCell(`${col}7`).value as number
      const d = ws.getCell(`${col}8`).value as number
      const g = ws.getCell(`${col}9`).value as number
      expect(g).toBeCloseTo(n + d, 0)
    }
  })
})

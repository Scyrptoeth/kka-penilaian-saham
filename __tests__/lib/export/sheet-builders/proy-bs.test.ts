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
    accounts: [], yearCount: 4, language: 'en',
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
    aamAdjustments: {}, nilaiPengalihanDilaporkan: 0,
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

  it('writes historical Cash on Hands (C9) from BS[8][2021]', () => {
    const wb = makeWb()
    ProyBsBuilder.build(wb, makeState())
    expect(wb.getWorksheet('PROY BALANCE SHEET')!.getCell('C9').value).toBe(1200)
  })

  it('writes Total Assets (row 33) = Total Current (21) + Total NonCurrent (31)', () => {
    const wb = makeWb()
    ProyBsBuilder.build(wb, makeState())
    const ws = wb.getWorksheet('PROY BALANCE SHEET')!
    for (const col of ['C', 'D']) {
      const tca = ws.getCell(`${col}21`).value as number
      const tnca = ws.getCell(`${col}31`).value as number
      const ta = ws.getCell(`${col}33`).value as number
      expect(ta).toBeCloseTo(tca + tnca, 0)
    }
  })

  it('writes Total Liab+Equity (row 62) = Total CL (45) + Total NCL (52) + Total Equity (60)', () => {
    const wb = makeWb()
    ProyBsBuilder.build(wb, makeState())
    const ws = wb.getWorksheet('PROY BALANCE SHEET')!
    for (const col of ['C', 'D']) {
      const cl = ws.getCell(`${col}45`).value as number
      const ncl = ws.getCell(`${col}52`).value as number
      const eq = ws.getCell(`${col}60`).value as number
      const le = ws.getCell(`${col}62`).value as number
      expect(le).toBeCloseTo(cl + ncl + eq, 0)
    }
  })

  it('overwrites seeded cells on D/E/F', () => {
    const wb = makeWb()
    ProyBsBuilder.build(wb, makeState())
    const ws = wb.getWorksheet('PROY BALANCE SHEET')!
    for (const row of [9, 13, 17, 21, 25, 26, 28, 31, 33, 45, 52, 60, 62, 63]) {
      for (const col of ['D', 'E', 'F']) {
        expect(ws.getCell(`${col}${row}`).value, `${col}${row}`).not.toBe(999)
      }
    }
  })
})

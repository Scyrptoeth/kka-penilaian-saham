import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { DashboardBuilder } from '@/lib/export/sheet-builders/dashboard'
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
  const ws = wb.addWorksheet('DASHBOARD')
  for (const row of [58, 59, 60, 61, 62]) {
    for (const col of ['G', 'H', 'L', 'M', 'P', 'Q', 'U', 'V']) {
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
      20: { 2018: 1000, 2019: 1100, 2020: 1200, 2021: 1300 },
      21: { 2018: -200, 2019: -220, 2020: -240, 2021: -260 },
      31: { 2018: -100, 2019: -110, 2020: -120, 2021: -130 },
      32: { 2018: -80, 2019: -88, 2020: -95, 2021: -100 },
      38: { 2018: -300, 2019: -330, 2020: -360, 2021: -390 },
      43: { 2018: 500, 2019: 500, 2020: 500, 2021: 500 },
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
      35: { 2018: 156, 2019: 172, 2020: 188, 2021: 204 }, // Net Profit
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

function makeState(over: Partial<ExportableState> = {}): ExportableState {
  return {
    home: makeHome(), balanceSheet: makeBs(), incomeStatement: makeIs(),
    fixedAsset: makeFa(), accPayables: null, wacc: null, discountRate: null,
    keyDrivers: makeKd(), dlom: null, dloc: null, borrowingCapInput: null,
    aamAdjustments: {}, nilaiPengalihanDilaporkan: 0, interestBearingDebt: 0,
    ...over,
  }
}

describe('DashboardBuilder', () => {
  it('has sheetName + upstream', () => {
    expect(DashboardBuilder.sheetName).toBe('DASHBOARD')
    expect(DashboardBuilder.upstream).toEqual([
      'home', 'balanceSheet', 'incomeStatement', 'changesInWorkingCapital'
    ])
  })

  it('returns early when balanceSheet null', () => {
    const wb = makeWb()
    DashboardBuilder.build(wb, makeState({ balanceSheet: null }))
    expect(wb.getWorksheet('DASHBOARD')!.getCell('H59').value).toBe(999)
  })

  it('writes year headers at G58/P58/U58 + placeholder at L58', () => {
    const wb = makeWb()
    DashboardBuilder.build(wb, makeState())
    const ws = wb.getWorksheet('DASHBOARD')!
    // tahunTransaksi 2022 → histYear=2021, histYear-1=2020, projYears[0]=2022
    expect(ws.getCell('G58').value).toBe(2020)
    expect(ws.getCell('L58').value).toBe('?')
    expect(ws.getCell('P58').value).toBe(2021)
    expect(ws.getCell('U58').value).toBe(2022)
  })

  it('writes Net Profit values at H59/Q59/V59', () => {
    const wb = makeWb()
    DashboardBuilder.build(wb, makeState())
    const ws = wb.getWorksheet('DASHBOARD')!
    // IS row 35 = Net Profit: 2020=188, 2021=204
    expect(ws.getCell('H59').value).toBe(188)
    expect(ws.getCell('Q59').value).toBe(204)
    // V59 projected — non-999
    expect(ws.getCell('V59').value).not.toBe(999)
  })

  it('writes Ekuitas (row 60), DER (61), NPM (62) at all 4 blocks', () => {
    const wb = makeWb()
    DashboardBuilder.build(wb, makeState())
    const ws = wb.getWorksheet('DASHBOARD')!
    for (const row of [60, 61, 62]) {
      for (const col of ['H', 'M', 'Q', 'V']) {
        expect(ws.getCell(`${col}${row}`).value, `${col}${row}`).not.toBe(999)
      }
    }
  })

  it('M column (placeholder block) all zeros for Net Profit/Ekuitas/DER/NPM', () => {
    const wb = makeWb()
    DashboardBuilder.build(wb, makeState())
    const ws = wb.getWorksheet('DASHBOARD')!
    for (const row of [59, 60, 61, 62]) {
      expect(ws.getCell(`M${row}`).value, `M${row}`).toBe(0)
    }
  })
})

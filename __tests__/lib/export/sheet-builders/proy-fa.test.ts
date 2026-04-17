import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { ProyFaBuilder } from '@/lib/export/sheet-builders/proy-fa'
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
  const ws = wb.addWorksheet('PROY FIXED ASSETS')
  // Seed key managed cells
  for (const row of [8, 14, 17, 23, 26, 32, 36, 42, 45, 51, 54, 60, 63, 69]) {
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
  return { accounts: [], yearCount: 4, language: 'en', rows: {} }
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
      // Beginning values per category (6 cats, rows 8-13)
      8:  { 2019: 100, 2020: 110, 2021: 120 },
      9:  { 2019: 200, 2020: 210, 2021: 220 },
      10: { 2019: 300, 2020: 310, 2021: 320 },
      11: { 2019: 400, 2020: 410, 2021: 420 },
      12: { 2019: 500, 2020: 510, 2021: 520 },
      13: { 2019: 50,  2020: 55,  2021: 60 },
      // Additions per category (rows 17-22)
      17: { 2019: 10, 2020: 12, 2021: 14 },
      18: { 2019: 20, 2020: 22, 2021: 24 },
      19: { 2019: 30, 2020: 33, 2021: 36 },
      20: { 2019: 40, 2020: 44, 2021: 48 },
      21: { 2019: 50, 2020: 55, 2021: 60 },
      22: { 2019: 5,  2020: 6,  2021: 7 },
      // Depreciation beginning (36-41)
      36: { 2019: -30, 2020: -40, 2021: -50 },
      37: { 2019: -60, 2020: -80, 2021: -100 },
      38: { 2019: -90, 2020: -120, 2021: -150 },
      39: { 2019: -120, 2020: -160, 2021: -200 },
      40: { 2019: -150, 2020: -200, 2021: -250 },
      41: { 2019: -15, 2020: -20, 2021: -25 },
      // Depreciation additions (45-50)
      45: { 2019: -10, 2020: -11, 2021: -12 },
      46: { 2019: -20, 2020: -22, 2021: -24 },
      47: { 2019: -30, 2020: -33, 2021: -36 },
      48: { 2019: -40, 2020: -44, 2021: -48 },
      49: { 2019: -50, 2020: -55, 2021: -60 },
      50: { 2019: -5, 2020: -6, 2021: -7 },
    },
  }
}

function makeKd(): KeyDriversState {
  return {
    financialDrivers: {
      corporateTaxRate: 0.22,
      interestRateShortTerm: 0.1,
      interestRateLongTerm: 0.12,
    },
    operationalDrivers: {
      cogsRatio: 0.55, sellingExpenseRatio: 0.05, gaExpenseRatio: 0.04,
    },
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

describe('ProyFaBuilder — metadata', () => {
  it('has sheetName + upstream', () => {
    expect(ProyFaBuilder.sheetName).toBe('PROY FIXED ASSETS')
    expect(ProyFaBuilder.upstream).toEqual([
      'home', 'balanceSheet', 'incomeStatement', 'fixedAsset', 'keyDrivers',
    ])
  })
})

describe('ProyFaBuilder — build', () => {
  it('returns early if fixedAsset missing', () => {
    const wb = makeWb()
    ProyFaBuilder.build(wb, makeState({ fixedAsset: null }))
    expect(wb.getWorksheet('PROY FIXED ASSETS')!.getCell('D17').value).toBe(999)
  })

  it('writes Column C = last historical year values', () => {
    const wb = makeWb()
    ProyFaBuilder.build(wb, makeState())
    const ws = wb.getWorksheet('PROY FIXED ASSETS')!
    // FA row 8 at 2021 = 120 (beginning Land)
    expect(ws.getCell('C8').value).toBe(120)
    // FA row 17 at 2021 = 14 (additions Land)
    expect(ws.getCell('C17').value).toBe(14)
  })

  it('writes Acquisition Total row 14', () => {
    const wb = makeWb()
    ProyFaBuilder.build(wb, makeState())
    const ws = wb.getWorksheet('PROY FIXED ASSETS')!
    // Sum of rows 8-13 at 2021 = 120+220+320+420+520+60 = 1660
    expect(ws.getCell('C14').value).toBe(1660)
  })

  it('writes projected column D values (non-seed)', () => {
    const wb = makeWb()
    ProyFaBuilder.build(wb, makeState())
    const ws = wb.getWorksheet('PROY FIXED ASSETS')!
    expect(ws.getCell('D8').value).not.toBe(999)
    expect(ws.getCell('D14').value).not.toBe(999)
    expect(ws.getCell('D69').value).not.toBe(999)
  })

  it('overwrites all seeded cells for D/E/F', () => {
    const wb = makeWb()
    ProyFaBuilder.build(wb, makeState())
    const ws = wb.getWorksheet('PROY FIXED ASSETS')!
    for (const row of [8, 14, 17, 23, 26, 32, 36, 42, 45, 51, 54, 60, 63, 69]) {
      for (const col of ['D', 'E', 'F']) {
        expect(ws.getCell(`${col}${row}`).value, `${col}${row}`).not.toBe(999)
      }
    }
  })

  it('Net Value Total row 69 = Acquisition 32 - Depreciation 60 per year (dep stored negative → net > acq)', () => {
    const wb = makeWb()
    ProyFaBuilder.build(wb, makeState())
    const ws = wb.getWorksheet('PROY FIXED ASSETS')!
    for (const col of ['C', 'D']) {
      const acq = ws.getCell(`${col}32`).value as number
      const dep = ws.getCell(`${col}60`).value as number
      const net = ws.getCell(`${col}69`).value as number
      // Per compute-proy-fixed-assets-live: net[c] = acq_end[c] - dep_end[c]
      // dep stored negative, so subtracting negative = adding |dep|
      expect(net).toBeCloseTo(acq - dep, 0)
    }
  })
})

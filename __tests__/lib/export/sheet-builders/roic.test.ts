import { describe, expect, it, beforeEach } from 'vitest'
import ExcelJS from 'exceljs'
import { RoicBuilder } from '@/lib/export/sheet-builders/roic'
import type { ExportableState } from '@/lib/export/export-xlsx'
import type { HomeInputs } from '@/types/financial'
import type {
  BalanceSheetInputState,
  IncomeStatementInputState,
  FixedAssetInputState,
} from '@/data/live/types'

function makeWorkbook(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('ROIC')
  for (const row of [7, 8, 9, 10, 11, 12, 13, 15]) {
    for (const col of ['B', 'C', 'D']) {
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
      // BS leaves
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
      // BS sentinel at row 27 (Total Assets). Production store includes this
      // via Session 020 sentinel pre-computation.
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
    },
  }
}

function makeState(overrides: Partial<ExportableState>): ExportableState {
  return {
    home: makeHome(), balanceSheet: null, incomeStatement: null,
    fixedAsset: null, accPayables: null, wacc: null,
    discountRate: null, keyDrivers: null, dlom: null, dloc: null,
    borrowingCapInput: null, aamAdjustments: {}, nilaiPengalihanDilaporkan: 0,
    interestBearingDebt: null,
    changesInWorkingCapital: null,
    growthRevenue: null,
    // Session 055: user-curated Excess Cash = BS row 8 (matches legacy
    // hardcoded behavior for fixture parity)
    investedCapital: {
      otherNonOperatingAssets: [],
      excessCash: [{ source: 'bs', excelRow: 8 }],
      marketableSecurities: [],
    },
    cashBalance: null,
    cashAccount: null,
    ...overrides,
  } as ExportableState
}

describe('RoicBuilder — metadata', () => {
  it('has correct sheetName + upstream slices', () => {
    expect(RoicBuilder.sheetName).toBe('ROIC')
    expect(RoicBuilder.upstream).toEqual([
      'home', 'balanceSheet', 'incomeStatement', 'fixedAsset', 'investedCapital',
    ])
  })
})

describe('RoicBuilder.build', () => {
  let wb: ExcelJS.Workbook

  beforeEach(() => {
    wb = makeWorkbook()
  })

  it('writes Total Assets row 8 from BS row 27 (sentinel)', () => {
    const state = makeState({
      balanceSheet: makeBs(),
      incomeStatement: makeIs(),
      fixedAsset: makeFa(),
    })
    RoicBuilder.build(wb, state)
    const ws = wb.getWorksheet('ROIC')!
    // ROIC uses B/C/D columns for 2019/2020/2021
    expect(ws.getCell('B8').value).toBe(750) // BS row 27 for 2019
    expect(ws.getCell('C8').value).toBe(800) // 2020
    expect(ws.getCell('D8').value).toBe(850) // 2021
  })

  it('writes Excess Cash row 10 = -(curated scope sum) — here scope is BS row 8', () => {
    const state = makeState({
      balanceSheet: makeBs(),
      incomeStatement: makeIs(),
      fixedAsset: makeFa(),
    })
    RoicBuilder.build(wb, state)
    const ws = wb.getWorksheet('ROIC')!
    // BS row 8 for 2019 = 120 → scope sum = 120 → row 10 = -120
    expect(ws.getCell('B10').value).toBe(-120)
  })

  it('missing home — no throw, prototipe untouched', () => {
    const state = makeState({
      home: null,
      balanceSheet: makeBs(),
      incomeStatement: makeIs(),
      fixedAsset: makeFa(),
    })
    RoicBuilder.build(wb, state)
    const ws = wb.getWorksheet('ROIC')!
    expect(ws.getCell('B7').value).toBe(999)
  })

  it('missing worksheet — no throw', () => {
    const blankWb = new ExcelJS.Workbook()
    expect(() => RoicBuilder.build(blankWb, makeState({
      balanceSheet: makeBs(), incomeStatement: makeIs(), fixedAsset: makeFa(),
    }))).not.toThrow()
  })

  it('idempotent', () => {
    const state = makeState({
      balanceSheet: makeBs(),
      incomeStatement: makeIs(),
      fixedAsset: makeFa(),
    })
    RoicBuilder.build(wb, state)
    const first = wb.getWorksheet('ROIC')!.getCell('B8').value
    RoicBuilder.build(wb, state)
    expect(wb.getWorksheet('ROIC')!.getCell('B8').value).toBe(first)
  })
})

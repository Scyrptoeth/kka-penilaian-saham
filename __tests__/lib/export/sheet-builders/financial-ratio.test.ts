import { describe, expect, it, beforeEach } from 'vitest'
import ExcelJS from 'exceljs'
import { FinancialRatioBuilder } from '@/lib/export/sheet-builders/financial-ratio'
import type { ExportableState } from '@/lib/export/export-xlsx'
import type { HomeInputs } from '@/types/financial'
import type {
  BalanceSheetInputState,
  IncomeStatementInputState,
  FixedAssetInputState,
  AccPayablesInputState,
} from '@/data/live/types'

function makeWorkbook(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('FINANCIAL RATIO')
  for (const row of [6, 7, 8, 9, 10, 11, 14, 15, 16, 19, 20, 21, 22, 23, 26, 27, 28, 30]) {
    for (const col of ['D', 'E', 'F']) {
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
      16: row([665, 747, 824, 901]),
      22: row([5000, 5500, 6000, 6500]),
      27: row([6000, 6500, 7000, 7500]),
      35: row([280, 295, 310, 325]), // Total Current Liabilities
      38: row([500, 600, 700, 800]),
      40: row([600, 700, 800, 900]),
      49: row([3000, 3500, 4000, 4500]), // Shareholders Equity
    },
  }
}

function makeIs(): IncomeStatementInputState {
  return {
    accounts: [], yearCount: 3, language: 'en',
    rows: {
      6: { 2019: 10000, 2020: 12000, 2021: 14000 },   // Revenue
      8: { 2019: 3000, 2020: 3600, 2021: 4200 },      // Gross Profit
      18: { 2019: 2000, 2020: 2400, 2021: 2800 },     // EBITDA
      22: { 2019: 1500, 2020: 1800, 2021: 2100 },     // EBIT
      27: { 2019: -100, 2020: -110, 2021: -120 },     // Interest Expense
      32: { 2019: 1400, 2020: 1690, 2021: 1980 },     // PBT
      33: { 2019: -280, 2020: -338, 2021: -396 },     // Tax
      35: { 2019: 1120, 2020: 1352, 2021: 1584 },     // NPAT
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
      21: { 2019: 100, 2020: 100, 2021: 100 },
      22: { 2019: 100, 2020: 100, 2021: 100 },
      45: { 2019: 50, 2020: 50, 2021: 50 },
      46: { 2019: 50, 2020: 50, 2021: 50 },
      47: { 2019: 50, 2020: 50, 2021: 50 },
      48: { 2019: 50, 2020: 50, 2021: 50 },
      49: { 2019: 50, 2020: 50, 2021: 50 },
      50: { 2019: 50, 2020: 50, 2021: 50 },
    },
  }
}

function makeAp(): AccPayablesInputState {
  return {
    rows: {
      10: { 2019: 50, 2020: 60, 2021: 70 },
      19: { 2019: 100, 2020: 110, 2021: 120 },
      20: { 2019: -30, 2020: -40, 2021: -50 },
    },
  }
}

function makeState(overrides: Partial<ExportableState>): ExportableState {
  return {
    home: makeHome(), balanceSheet: null, incomeStatement: null,
    fixedAsset: null, accPayables: null, wacc: null,
    discountRate: null, keyDrivers: null, dlom: null, dloc: null,
    borrowingCapInput: null, aamAdjustments: {}, nilaiPengalihanDilaporkan: 0,
    ...overrides,
  }
}

describe('FinancialRatioBuilder — metadata', () => {
  it('has correct sheetName + upstream slices', () => {
    expect(FinancialRatioBuilder.sheetName).toBe('FINANCIAL RATIO')
    expect(FinancialRatioBuilder.upstream).toEqual([
      'home', 'balanceSheet', 'incomeStatement',
    ])
  })
})

describe('FinancialRatioBuilder.build', () => {
  let wb: ExcelJS.Workbook

  beforeEach(() => {
    wb = makeWorkbook()
  })

  it('writes Gross Profit Margin row 6 from IS (GP/Revenue)', () => {
    const state = makeState({ balanceSheet: makeBs(), incomeStatement: makeIs() })
    FinancialRatioBuilder.build(wb, state)
    const ws = wb.getWorksheet('FINANCIAL RATIO')!
    // D = 2019 → 3000/10000 = 0.3
    expect(ws.getCell('D6').value).toBeCloseTo(0.3, 10)
  })

  it('writes Net Profit Margin row 9', () => {
    const state = makeState({ balanceSheet: makeBs(), incomeStatement: makeIs() })
    FinancialRatioBuilder.build(wb, state)
    const ws = wb.getWorksheet('FINANCIAL RATIO')!
    expect(ws.getCell('D9').value).toBeCloseTo(0.112, 10)
  })

  it('defaults row 27 (FCF/CFO) to 0 when FA is null (no FCF upstream)', () => {
    const state = makeState({ balanceSheet: makeBs(), incomeStatement: makeIs() })
    FinancialRatioBuilder.build(wb, state)
    const ws = wb.getWorksheet('FINANCIAL RATIO')!
    expect(ws.getCell('D27').value).toBe(0)
  })

  it('computes row 26 (CFO/Sales) when FA+AP provided (full chain)', () => {
    const state = makeState({
      balanceSheet: makeBs(),
      incomeStatement: makeIs(),
      fixedAsset: makeFa(),
      accPayables: makeAp(),
    })
    FinancialRatioBuilder.build(wb, state)
    const ws = wb.getWorksheet('FINANCIAL RATIO')!
    const v = ws.getCell('D26').value
    expect(typeof v).toBe('number')
    expect(v).not.toBe(999)
  })

  it('missing home — no throw, prototipe untouched', () => {
    const state = makeState({
      home: null,
      balanceSheet: makeBs(),
      incomeStatement: makeIs(),
    })
    FinancialRatioBuilder.build(wb, state)
    const ws = wb.getWorksheet('FINANCIAL RATIO')!
    expect(ws.getCell('D6').value).toBe(999)
  })

  it('missing worksheet — no throw', () => {
    const blankWb = new ExcelJS.Workbook()
    expect(() => FinancialRatioBuilder.build(blankWb, makeState({
      balanceSheet: makeBs(), incomeStatement: makeIs(),
    }))).not.toThrow()
  })

  it('idempotent', () => {
    const state = makeState({ balanceSheet: makeBs(), incomeStatement: makeIs() })
    FinancialRatioBuilder.build(wb, state)
    const first = wb.getWorksheet('FINANCIAL RATIO')!.getCell('D6').value
    FinancialRatioBuilder.build(wb, state)
    expect(wb.getWorksheet('FINANCIAL RATIO')!.getCell('D6').value).toBe(first)
  })
})

import { describe, expect, it, beforeEach } from 'vitest'
import ExcelJS from 'exceljs'
import { CashFlowStatementBuilder } from '@/lib/export/sheet-builders/cash-flow-statement'
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
  const ws = wb.addWorksheet('CASH FLOW STATEMENT')
  for (const row of [5, 6, 8, 9, 10, 11, 13, 17, 19, 22, 23, 24, 25, 26, 28, 30, 32, 33, 35, 36]) {
    for (const col of ['C', 'D', 'E']) {
      ws.getCell(`${col}${row}`).value = 999
    }
  }
  return wb
}

function makeHome(overrides: Partial<HomeInputs> = {}): HomeInputs {
  return {
    namaPerusahaan: 'Test Co',
    npwp: '', namaSubjekPajak: '', npwpSubjekPajak: '',
    jenisSubjekPajak: 'badan', jenisPerusahaan: 'tertutup',
    objekPenilaian: 'saham', jenisInformasiPeralihan: 'jualBeli',
    jumlahSahamBeredar: 1000, jumlahSahamYangDinilai: 500,
    nilaiNominalPerSaham: 1, tahunTransaksi: 2022,
    proporsiSaham: 0.5, dlomPercent: 0, dlocPercent: 0,
    ...overrides,
  } as HomeInputs
}

function makeBs(): BalanceSheetInputState {
  // BS 4-year window 2018-2021 (tahunTransaksi=2022)
  const years = [2018, 2019, 2020, 2021]
  const row = (vals: number[]) => Object.fromEntries(years.map((y, i) => [y, vals[i]]))
  return {
    accounts: [],
    yearCount: 4,
    language: 'en',
    rows: {
      // Cash + bank
      8: row([100, 120, 130, 140]),
      9: row([50, 60, 70, 80]),
      // CA (ex cash): AR, OtherRec, Inventory, OtherCA
      10: row([200, 220, 240, 260]),
      11: row([10, 12, 14, 16]),
      12: row([300, 330, 360, 390]),
      14: row([5, 5, 5, 5]),
      // CL: ShortBank, AP, Tax, OtherCL
      31: row([100, 100, 100, 100]),
      32: row([150, 160, 170, 180]),
      33: row([20, 25, 30, 35]),
      34: row([10, 10, 10, 10]),
    },
  }
}

function makeIs(): IncomeStatementInputState {
  return {
    accounts: [],
    yearCount: 3,
    language: 'en',
    rows: {
      18: { 2019: 1000, 2020: 1200, 2021: 1400 }, // EBITDA
      33: { 2019: -220, 2020: -264, 2021: -308 }, // Tax
      30: { 2019: 50, 2020: 60, 2021: 70 },       // Non-op
      27: { 2019: -100, 2020: -100, 2021: -100 }, // Interest Exp
      26: { 2019: 20, 2020: 25, 2021: 30 },       // Interest Inc
    },
  }
}

function makeFa(): FixedAssetInputState {
  return {
    accounts: [],
    yearCount: 3,
    language: 'en',
    rows: {
      23: { 2019: 500, 2020: 600, 2021: 700 }, // Total Additions (capex)
    },
  }
}

function makeAp(): AccPayablesInputState {
  return {
    rows: {
      10: { 2019: 50, 2020: 60, 2021: 70 },   // ST new loan
      19: { 2019: 100, 2020: 110, 2021: 120 }, // LT new loan
      20: { 2019: -30, 2020: -40, 2021: -50 }, // Principal Repayment
    },
  }
}

// Default Cash Balance scope = [8, 9] (both BS cash rows); Cash Account
// split = row 9 → bank, row 8 → cashOnHand. Reproduces the legacy
// hardcoded-BS-rows-8+9 behavior that pre-Session-055 tests relied on.
function makeCashBalance() {
  return { accounts: [8, 9] }
}
function makeCashAccount() {
  return { bank: [9], cashOnHand: [8] }
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
    investedCapital: null,
    cashBalance: makeCashBalance(),
    cashAccount: makeCashAccount(),
    ...overrides,
  } as ExportableState
}

describe('CashFlowStatementBuilder — metadata', () => {
  it('has correct sheetName + upstream slices', () => {
    expect(CashFlowStatementBuilder.sheetName).toBe('CASH FLOW STATEMENT')
    expect(CashFlowStatementBuilder.upstream).toEqual([
      'home',
      'balanceSheet',
      'incomeStatement',
      'changesInWorkingCapital',
      'cashBalance',
      'cashAccount',
    ])
  })
})

describe('CashFlowStatementBuilder.build', () => {
  let wb: ExcelJS.Workbook

  beforeEach(() => {
    wb = makeWorkbook()
  })

  it('writes EBITDA row 5 from IS row 18', () => {
    const state = makeState({ balanceSheet: makeBs(), incomeStatement: makeIs() })
    CashFlowStatementBuilder.build(wb, state)
    const ws = wb.getWorksheet('CASH FLOW STATEMENT')!
    expect(ws.getCell('C5').value).toBe(1000)
    expect(ws.getCell('D5').value).toBe(1200)
    expect(ws.getCell('E5').value).toBe(1400)
  })

  it('writes Corporate Tax row 6 from IS row 33 (sign preserved)', () => {
    const state = makeState({ balanceSheet: makeBs(), incomeStatement: makeIs() })
    CashFlowStatementBuilder.build(wb, state)
    const ws = wb.getWorksheet('CASH FLOW STATEMENT')!
    expect(ws.getCell('C6').value).toBe(-220)
  })

  it('writes row 17 (CapEx) from FA when provided', () => {
    const state = makeState({
      balanceSheet: makeBs(),
      incomeStatement: makeIs(),
      fixedAsset: makeFa(),
    })
    CashFlowStatementBuilder.build(wb, state)
    const ws = wb.getWorksheet('CASH FLOW STATEMENT')!
    // CapEx = FA row 23 * -1 → -500
    expect(ws.getCell('C17').value).toBe(-500)
  })

  it('defaults row 17 (CapEx) to 0 when FA is null', () => {
    const state = makeState({ balanceSheet: makeBs(), incomeStatement: makeIs() })
    CashFlowStatementBuilder.build(wb, state)
    const ws = wb.getWorksheet('CASH FLOW STATEMENT')!
    expect(ws.getCell('C17').value).toBe(-0)
  })

  it('writes row 23 (New Loan) from AP rows 10+19 when AP provided', () => {
    const state = makeState({
      balanceSheet: makeBs(),
      incomeStatement: makeIs(),
      accPayables: makeAp(),
    })
    CashFlowStatementBuilder.build(wb, state)
    const ws = wb.getWorksheet('CASH FLOW STATEMENT')!
    // 50 + 100 = 150
    expect(ws.getCell('C23').value).toBe(150)
  })

  it('computes subtotal row 11 (CFO) via deriveComputedRows', () => {
    const state = makeState({ balanceSheet: makeBs(), incomeStatement: makeIs() })
    CashFlowStatementBuilder.build(wb, state)
    const ws = wb.getWorksheet('CASH FLOW STATEMENT')!
    const v = ws.getCell('C11').value
    expect(typeof v).toBe('number')
    expect(v).not.toBe(999)
  })

  it('missing home — no throw, prototipe untouched', () => {
    const state = makeState({
      home: null,
      balanceSheet: makeBs(),
      incomeStatement: makeIs(),
    })
    CashFlowStatementBuilder.build(wb, state)
    const ws = wb.getWorksheet('CASH FLOW STATEMENT')!
    expect(ws.getCell('C5').value).toBe(999)
  })

  it('missing worksheet — no throw (graceful no-op)', () => {
    const blankWb = new ExcelJS.Workbook()
    expect(() =>
      CashFlowStatementBuilder.build(blankWb, makeState({
        balanceSheet: makeBs(),
        incomeStatement: makeIs(),
      })),
    ).not.toThrow()
  })

  it('idempotent — repeated build produces identical output', () => {
    const state = makeState({ balanceSheet: makeBs(), incomeStatement: makeIs() })
    CashFlowStatementBuilder.build(wb, state)
    const first = wb.getWorksheet('CASH FLOW STATEMENT')!.getCell('C5').value
    CashFlowStatementBuilder.build(wb, state)
    expect(wb.getWorksheet('CASH FLOW STATEMENT')!.getCell('C5').value).toBe(first)
  })
})

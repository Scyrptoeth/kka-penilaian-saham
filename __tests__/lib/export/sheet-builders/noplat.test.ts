import { describe, expect, it, beforeEach } from 'vitest'
import ExcelJS from 'exceljs'
import { NoplatBuilder } from '@/lib/export/sheet-builders/noplat'
import type { ExportableState } from '@/lib/export/export-xlsx'
import type { HomeInputs } from '@/types/financial'
import type { IncomeStatementInputState } from '@/data/live/types'

function makeWorkbook(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('NOPLAT')
  // Seed prototipe values we expect to be overwritten when populated
  for (const row of [7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 19]) {
    for (const col of ['C', 'D', 'E']) {
      ws.getCell(`${col}${row}`).value = 999
    }
  }
  return wb
}

function makeHome(overrides: Partial<HomeInputs> = {}): HomeInputs {
  return {
    namaPerusahaan: 'Test Co',
    npwp: '99.999.999.9-999.000',
    namaSubjekPajak: 'WP Name',
    npwpSubjekPajak: '',
    jenisSubjekPajak: 'badan',
    jenisPerusahaan: 'tertutup',
    objekPenilaian: 'saham',
    jenisInformasiPeralihan: 'jualBeli',
    jumlahSahamBeredar: 1000,
    jumlahSahamYangDinilai: 500,
    nilaiNominalPerSaham: 1,
    tahunTransaksi: 2022,
    proporsiSaham: 0.5,
    dlomPercent: 0,
    dlocPercent: 0,
    ...overrides,
  } as HomeInputs
}

function makeIs(): IncomeStatementInputState {
  // tahunTransaksi 2022 → histYears3 = [2019, 2020, 2021]
  return {
    accounts: [],
    yearCount: 3,
    language: 'en',
    rows: {
      // IS rows consumed by computeNoplatLiveRows
      32: { 2019: 1000, 2020: 1500, 2021: 2000 }, // PBT
      27: { 2019: -100, 2020: -120, 2021: -140 }, // Interest Expense (negative)
      26: { 2019: 50, 2020: 60, 2021: 70 },       // Interest Income
      30: { 2019: 20, 2020: 25, 2021: 30 },       // Non-operating
      33: { 2019: -220, 2020: -330, 2021: -440 }, // Tax Provision (negative)
    },
  }
}

function makeState(overrides: Partial<ExportableState>): ExportableState {
  return {
    home: makeHome(),
    balanceSheet: null,
    incomeStatement: null,
    fixedAsset: null,
    accPayables: null,
    wacc: null,
    discountRate: null,
    keyDrivers: null,
    dlom: null,
    dloc: null,
    borrowingCapInput: null,
    aamAdjustments: {},
    nilaiPengalihanDilaporkan: 0, interestBearingDebt: 0,
    ...overrides,
  }
}

describe('NoplatBuilder — metadata', () => {
  it('has correct sheetName + upstream slices', () => {
    expect(NoplatBuilder.sheetName).toBe('NOPLAT')
    expect(NoplatBuilder.upstream).toEqual(['home', 'incomeStatement'])
  })
})

describe('NoplatBuilder.build', () => {
  let wb: ExcelJS.Workbook

  beforeEach(() => {
    wb = makeWorkbook()
  })

  it('writes leaf row 7 (PBT) from IS data', () => {
    const state = makeState({ incomeStatement: makeIs() })
    NoplatBuilder.build(wb, state)
    const ws = wb.getWorksheet('NOPLAT')!
    expect(ws.getCell('C7').value).toBe(1000) // 2019 PBT
    expect(ws.getCell('D7').value).toBe(1500) // 2020 PBT
    expect(ws.getCell('E7').value).toBe(2000) // 2021 PBT
  })

  it('writes leaf row 8 (Add: Interest Expense = -IS!27)', () => {
    const state = makeState({ incomeStatement: makeIs() })
    NoplatBuilder.build(wb, state)
    const ws = wb.getWorksheet('NOPLAT')!
    // IE is -100 in IS row 27; add-back = -(-100) = 100
    expect(ws.getCell('C8').value).toBe(100)
    expect(ws.getCell('D8').value).toBe(120)
    expect(ws.getCell('E8').value).toBe(140)
  })

  it('writes subtotal row 11 (EBIT) via deriveComputedRows', () => {
    const state = makeState({ incomeStatement: makeIs() })
    NoplatBuilder.build(wb, state)
    const ws = wb.getWorksheet('NOPLAT')!
    // EBIT = PBT + Add:IE + Less:II + Non-Op
    //      = 1000 + 100 + (-50) + (-20) = 1030
    expect(ws.getCell('C11').value).toBe(1030)
  })

  it('writes total row 19 (NOPLAT) via deriveComputedRows signed computedFrom', () => {
    const state = makeState({ incomeStatement: makeIs() })
    NoplatBuilder.build(wb, state)
    const ws = wb.getWorksheet('NOPLAT')!
    // Manually verify a known output from the module — NOPLAT = EBIT - TotalTaxes
    // rely on the computed chain being correct (the calc module is covered
    // elsewhere). Just assert row 19 has some non-999 number.
    const v = ws.getCell('C19').value
    expect(typeof v).toBe('number')
    expect(v).not.toBe(999)
  })

  it('missing home — no throw, no cell writes', () => {
    const state = makeState({ home: null, incomeStatement: makeIs() })
    NoplatBuilder.build(wb, state)
    const ws = wb.getWorksheet('NOPLAT')!
    // Prototipe values remain untouched
    expect(ws.getCell('C7').value).toBe(999)
  })

  it('missing worksheet — no throw (graceful no-op)', () => {
    const blankWb = new ExcelJS.Workbook()
    expect(() =>
      NoplatBuilder.build(blankWb, makeState({ incomeStatement: makeIs() })),
    ).not.toThrow()
  })

  it('idempotent — identical output on repeated build with same state', () => {
    const state = makeState({ incomeStatement: makeIs() })
    NoplatBuilder.build(wb, state)
    const first = wb.getWorksheet('NOPLAT')!.getCell('C7').value
    NoplatBuilder.build(wb, state)
    const second = wb.getWorksheet('NOPLAT')!.getCell('C7').value
    expect(second).toBe(first)
  })
})

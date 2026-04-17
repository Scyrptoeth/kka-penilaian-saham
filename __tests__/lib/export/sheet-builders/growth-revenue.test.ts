import { describe, expect, it, beforeEach } from 'vitest'
import ExcelJS from 'exceljs'
import { GrowthRevenueBuilder } from '@/lib/export/sheet-builders/growth-revenue'
import type { ExportableState } from '@/lib/export/export-xlsx'
import type { HomeInputs } from '@/types/financial'
import type { IncomeStatementInputState } from '@/data/live/types'

function makeWorkbook(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('GROWTH REVENUE')
  for (const row of [8, 9]) {
    for (const col of ['B', 'C', 'D', 'E']) {
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

function makeIs(): IncomeStatementInputState {
  // tahunTransaksi 2022 → bsYears4 = [2018, 2019, 2020, 2021]
  return {
    accounts: [], yearCount: 4, language: 'en',
    rows: {
      6: { 2018: 10000, 2019: 11000, 2020: 12100, 2021: 13310 }, // Revenue
      35: { 2018: 500, 2019: 600, 2020: 700, 2021: 800 },         // NPAT
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

describe('GrowthRevenueBuilder — metadata', () => {
  it('has correct sheetName + upstream slices', () => {
    expect(GrowthRevenueBuilder.sheetName).toBe('GROWTH REVENUE')
    expect(GrowthRevenueBuilder.upstream).toEqual(['home', 'incomeStatement'])
  })
})

describe('GrowthRevenueBuilder.build', () => {
  let wb: ExcelJS.Workbook

  beforeEach(() => {
    wb = makeWorkbook()
  })

  it('writes row 8 (Revenue) from IS row 6 across 4 years B-E', () => {
    const state = makeState({ incomeStatement: makeIs() })
    GrowthRevenueBuilder.build(wb, state)
    const ws = wb.getWorksheet('GROWTH REVENUE')!
    expect(ws.getCell('B8').value).toBe(10000)
    expect(ws.getCell('C8').value).toBe(11000)
    expect(ws.getCell('D8').value).toBe(12100)
    expect(ws.getCell('E8').value).toBe(13310)
  })

  it('writes row 9 (NPAT) from IS row 35 across 4 years', () => {
    const state = makeState({ incomeStatement: makeIs() })
    GrowthRevenueBuilder.build(wb, state)
    const ws = wb.getWorksheet('GROWTH REVENUE')!
    expect(ws.getCell('B9').value).toBe(500)
    expect(ws.getCell('E9').value).toBe(800)
  })

  it('missing home — no throw, prototipe untouched', () => {
    const state = makeState({ home: null, incomeStatement: makeIs() })
    GrowthRevenueBuilder.build(wb, state)
    const ws = wb.getWorksheet('GROWTH REVENUE')!
    expect(ws.getCell('B8').value).toBe(999)
  })

  it('missing worksheet — no throw', () => {
    const blankWb = new ExcelJS.Workbook()
    expect(() => GrowthRevenueBuilder.build(blankWb, makeState({
      incomeStatement: makeIs(),
    }))).not.toThrow()
  })

  it('idempotent', () => {
    const state = makeState({ incomeStatement: makeIs() })
    GrowthRevenueBuilder.build(wb, state)
    const first = wb.getWorksheet('GROWTH REVENUE')!.getCell('B8').value
    GrowthRevenueBuilder.build(wb, state)
    expect(wb.getWorksheet('GROWTH REVENUE')!.getCell('B8').value).toBe(first)
  })
})

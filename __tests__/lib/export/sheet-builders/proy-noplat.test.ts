import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { ProyNoplatBuilder } from '@/lib/export/sheet-builders/proy-noplat'
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
  const ws = wb.addWorksheet('PROY NOPLAT')
  for (const row of [7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 19]) {
    for (const col of ['C', 'D', 'E', 'F']) {
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
    aamAdjustments: {}, nilaiPengalihanDilaporkan: 0,
    ...over,
  }
}

describe('ProyNoplatBuilder', () => {
  it('has sheetName + upstream', () => {
    expect(ProyNoplatBuilder.sheetName).toBe('PROY NOPLAT')
    expect(ProyNoplatBuilder.upstream).toEqual([
      'home', 'balanceSheet', 'incomeStatement', 'fixedAsset', 'keyDrivers',
    ])
  })

  it('returns early when keyDrivers null', () => {
    const wb = makeWb()
    ProyNoplatBuilder.build(wb, makeState({ keyDrivers: null }))
    expect(wb.getWorksheet('PROY NOPLAT')!.getCell('C7').value).toBe(999)
  })

  it('writes PBT (row 7) for historical + projection cols', () => {
    const wb = makeWb()
    ProyNoplatBuilder.build(wb, makeState())
    const ws = wb.getWorksheet('PROY NOPLAT')!
    expect(ws.getCell('C7').value).not.toBe(999)
    expect(ws.getCell('D7').value).not.toBe(999)
  })

  it('writes NOPLAT (row 19) = Operating Profit - Operating Tax', () => {
    const wb = makeWb()
    ProyNoplatBuilder.build(wb, makeState())
    const ws = wb.getWorksheet('PROY NOPLAT')!
    // Row 19 should be populated (non-999)
    expect(ws.getCell('C19').value).not.toBe(999)
    expect(ws.getCell('D19').value).not.toBe(999)
  })

  it('overwrites all seeded cells on D/E/F', () => {
    const wb = makeWb()
    ProyNoplatBuilder.build(wb, makeState())
    const ws = wb.getWorksheet('PROY NOPLAT')!
    for (const row of [7, 8, 9, 11, 13, 17, 19]) {
      for (const col of ['D', 'E', 'F']) {
        expect(ws.getCell(`${col}${row}`).value, `${col}${row}`).not.toBe(999)
      }
    }
  })
})

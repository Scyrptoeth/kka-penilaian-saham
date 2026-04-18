import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { CfiBuilder } from '@/lib/export/sheet-builders/cfi'
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
  const ws = wb.addWorksheet('CFI')
  for (const row of [7, 8, 9]) {
    for (const col of ['B', 'C', 'D', 'E', 'F', 'G']) {
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
    rfRate: 0.065, marketReturn: 0.13, beta: 1.1, taxRate: 0.22,
    equityWeight: 0.6, debtWeight: 0.4, kdBeforeTax: 0.1, bankRates: [],
  } as unknown as DiscountRateState
}

function makeState(over: Partial<ExportableState> = {}): ExportableState {
  return {
    home: makeHome(), balanceSheet: makeBs(), incomeStatement: makeIs(),
    fixedAsset: makeFa(), accPayables: null, wacc: null,
    discountRate: makeDr(), keyDrivers: makeKd(),
    dlom: null, dloc: null, borrowingCapInput: null,
    aamAdjustments: {}, nilaiPengalihanDilaporkan: 0, interestBearingDebt: 0,
    ...over,
  }
}

describe('CfiBuilder', () => {
  it('has sheetName + upstream', () => {
    expect(CfiBuilder.sheetName).toBe('CFI')
    expect(CfiBuilder.upstream).toEqual([
      'home', 'balanceSheet', 'incomeStatement', 'fixedAsset', 'keyDrivers', 'discountRate', 'interestBearingDebt', 'changesInWorkingCapital'
    ])
  })

  it('returns early when keyDrivers null', () => {
    const wb = makeWb()
    CfiBuilder.build(wb, makeState({ keyDrivers: null }))
    expect(wb.getWorksheet('CFI')!.getCell('B7').value).toBe(999)
  })

  it('writes rows 7-9 across B-G (3 hist + 3 proj)', () => {
    const wb = makeWb()
    CfiBuilder.build(wb, makeState())
    const ws = wb.getWorksheet('CFI')!
    for (const row of [7, 8, 9]) {
      for (const col of ['B', 'C', 'D', 'E', 'F', 'G']) {
        expect(ws.getCell(`${col}${row}`).value, `${col}${row}`).not.toBe(999)
      }
    }
  })

  it('row 9 (CFI) = row 7 (FCF) + row 8 (NonOp) per column', () => {
    const wb = makeWb()
    CfiBuilder.build(wb, makeState())
    const ws = wb.getWorksheet('CFI')!
    for (const col of ['B', 'C', 'D', 'E', 'F', 'G']) {
      const f = ws.getCell(`${col}7`).value as number
      const n = ws.getCell(`${col}8`).value as number
      const c = ws.getCell(`${col}9`).value as number
      expect(c, `${col}9 = ${col}7 + ${col}8`).toBeCloseTo(f + n, 0)
    }
  })
})

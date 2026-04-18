import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { ProyLrBuilder } from '@/lib/export/sheet-builders/proy-lr'
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
  const ws = wb.addWorksheet('PROY LR')
  // Seed prototipe values we expect overwritten
  for (const row of [8, 10, 11, 15, 16, 17, 19, 22, 25, 29, 31, 33, 34, 36, 37, 39]) {
    for (const col of ['C', 'D', 'E', 'F']) {
      ws.getCell(`${col}${row}`).value = 999
    }
  }
  return wb
}

function makeHome(over: Partial<HomeInputs> = {}): HomeInputs {
  return {
    namaPerusahaan: 'X',
    npwp: '99.999.999.9-999.000',
    namaSubjekPajak: 'Y',
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
    ...over,
  } as HomeInputs
}

/** Minimal BS/IS/FA + KeyDrivers stubs — values arbitrary but consistent. */
function makeBs(): BalanceSheetInputState {
  return {
    accounts: [], yearCount: 4, language: 'en',
    rows: {
      31: { 2018: 0, 2019: 0, 2020: 0, 2021: -100 }, // short-term loan
      38: { 2018: 0, 2019: 0, 2020: 0, 2021: -200 }, // long-term loan
    },
  }
}

function makeIs(): IncomeStatementInputState {
  return {
    accounts: [], yearCount: 4, language: 'en',
    rows: {
      6:  { 2018: 900, 2019: 1000, 2020: 1100, 2021: 1200 }, // Revenue
      7:  { 2018: -500, 2019: -550, 2020: -600, 2021: -650 }, // COGS
      8:  { 2018: 400, 2019: 450, 2020: 500, 2021: 550 }, // GP
      12: { 2018: -50, 2019: -55, 2020: -60, 2021: -65 },
      13: { 2018: -40, 2019: -45, 2020: -50, 2021: -55 },
      21: { 2018: 30, 2019: 32, 2020: 34, 2021: 36 }, // depr positive in IS
      26: { 2018: 10, 2019: 11, 2020: 12, 2021: 13 }, // Int Income
      27: { 2018: -8, 2019: -9, 2020: -10, 2021: -11 }, // Int Exp
      30: { 2018: 5, 2019: 6, 2020: 7, 2021: 8 },
      32: { 2018: 200, 2019: 220, 2020: 240, 2021: 260 }, // PBT
      33: { 2018: -44, 2019: -48, 2020: -52, 2021: -56 }, // Tax
    },
  }
}

function makeFa(): FixedAssetInputState {
  return {
    accounts: [], yearCount: 3, language: 'en',
    rows: {
      // Minimal — PROY FA needs baseline to project
      17: { 2019: 100, 2020: 110, 2021: 120 },
      18: { 2019: 50, 2020: 55, 2021: 60 },
      45: { 2019: -30, 2020: -33, 2021: -36 },
      46: { 2019: -15, 2020: -16, 2021: -18 },
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
      cogsRatio: 0.55,
      sellingExpenseRatio: 0.05,
      gaExpenseRatio: 0.04,
    },
    balanceSheetDrivers: {
      arDsi: 30, apDsi: 45, invDsi: 90,
    },
    capex: {
      tahun1: 0, tahun2: 0, tahun3: 0,
      tahun4: 0, tahun5: 0,
      pertumbuhanHarga: 0,
    },
  } as unknown as KeyDriversState
}

function makeState(over: Partial<ExportableState> = {}): ExportableState {
  return {
    home: makeHome(),
    balanceSheet: makeBs(),
    incomeStatement: makeIs(),
    fixedAsset: makeFa(),
    accPayables: null,
    wacc: null, discountRate: null,
    keyDrivers: makeKd(),
    dlom: null, dloc: null, borrowingCapInput: null,
    aamAdjustments: {},
    nilaiPengalihanDilaporkan: 0, interestBearingDebt: 0,
    ...over,
  }
}

describe('ProyLrBuilder — metadata', () => {
  it('has correct sheetName + upstream slices', () => {
    expect(ProyLrBuilder.sheetName).toBe('PROY LR')
    expect(ProyLrBuilder.upstream).toEqual([
      'home', 'balanceSheet', 'incomeStatement', 'fixedAsset', 'keyDrivers',
    ])
  })
})

describe('ProyLrBuilder — build', () => {
  it('returns early if required upstream missing (home null)', () => {
    const wb = makeWb()
    ProyLrBuilder.build(wb, makeState({ home: null }))
    // Values left as-seed (999)
    expect(wb.getWorksheet('PROY LR')!.getCell('C8').value).toBe(999)
  })

  it('returns early if keyDrivers missing', () => {
    const wb = makeWb()
    ProyLrBuilder.build(wb, makeState({ keyDrivers: null }))
    expect(wb.getWorksheet('PROY LR')!.getCell('D8').value).toBe(999)
  })

  it('writes historical revenue (C8) from IS last year', () => {
    const wb = makeWb()
    ProyLrBuilder.build(wb, makeState())
    // tahunTransaksi 2022 → histYear = 2021, IS[6][2021] = 1200
    expect(wb.getWorksheet('PROY LR')!.getCell('C8').value).toBe(1200)
  })

  it('writes projected revenue (D8) as histRev * (1+growth)', () => {
    const wb = makeWb()
    ProyLrBuilder.build(wb, makeState())
    const ws = wb.getWorksheet('PROY LR')!
    const c8 = ws.getCell('C8').value as number
    const d8 = ws.getCell('D8').value as number
    // Revenue growth from IS (avg 900→1000→1100→1200 = ~10%)
    expect(d8).toBeGreaterThan(c8)
  })

  it('writes COGS (D10) negative via Revenue * -cogsRatio', () => {
    const wb = makeWb()
    ProyLrBuilder.build(wb, makeState())
    const ws = wb.getWorksheet('PROY LR')!
    const d10 = ws.getCell('D10').value as number
    expect(d10).toBeLessThan(0)
  })

  it('writes PBT (C36) = EBIT + Other Income + Non-Op at historical column', () => {
    const wb = makeWb()
    ProyLrBuilder.build(wb, makeState())
    const ws = wb.getWorksheet('PROY LR')!
    // C25 = EBIT, C33 = Other Income total, C34 = Non-Op
    const c25 = ws.getCell('C25').value as number
    const c33 = ws.getCell('C33').value as number
    const c34 = ws.getCell('C34').value as number
    const c36 = ws.getCell('C36').value as number
    expect(c36).toBeCloseTo(c25 + c33 + c34, 2)
  })

  it('writes tax (D37) as -PBT * taxRate', () => {
    const wb = makeWb()
    ProyLrBuilder.build(wb, makeState())
    const ws = wb.getWorksheet('PROY LR')!
    const d36 = ws.getCell('D36').value as number
    const d37 = ws.getCell('D37').value as number
    expect(d37).toBeCloseTo(-0.22 * d36, 2)
  })

  it('overwrites all seeded cells (no 999 remains on managed rows)', () => {
    const wb = makeWb()
    ProyLrBuilder.build(wb, makeState())
    const ws = wb.getWorksheet('PROY LR')!
    for (const row of [8, 10, 11, 15, 16, 17, 19, 22, 25, 29, 31, 33, 34, 36, 37, 39]) {
      for (const col of ['C', 'D', 'E', 'F']) {
        const v = ws.getCell(`${col}${row}`).value
        expect(v, `${col}${row} should be overwritten`).not.toBe(999)
      }
    }
  })
})

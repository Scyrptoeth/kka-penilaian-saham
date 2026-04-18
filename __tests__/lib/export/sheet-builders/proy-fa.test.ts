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
  // Session 036: per-account model uses FA_OFFSET-keyed rows. Include
  // 6 original accounts (Land/Building/Equipment/Vehicle/Office/Electrical)
  // at excelRow 8-13 with values stored at offset-keyed positions.
  const rows: Record<number, import('@/types/financial').YearKeyedSeries> = {}
  const beginningSeed = { 8: 100, 9: 200, 10: 300, 11: 400, 12: 500, 13: 50 }
  const additionsSeed = { 8: 10, 9: 20, 10: 30, 11: 40, 12: 50, 13: 5 }
  const depBegSeed = { 8: -30, 9: -60, 10: -90, 11: -120, 12: -150, 13: -15 }
  const depAddSeed = { 8: -10, 9: -20, 10: -30, 11: -40, 12: -50, 13: -5 }
  for (const [base, begVal] of Object.entries(beginningSeed)) {
    const b = Number(base)
    rows[b + 0] = { 2019: begVal, 2020: begVal + 10, 2021: begVal + 20 }
    rows[b + 2000] = {
      2019: additionsSeed[b as unknown as keyof typeof additionsSeed],
      2020: additionsSeed[b as unknown as keyof typeof additionsSeed] + 2,
      2021: additionsSeed[b as unknown as keyof typeof additionsSeed] + 4,
    }
    rows[b + 4000] = {
      2019: depBegSeed[b as unknown as keyof typeof depBegSeed],
      2020: depBegSeed[b as unknown as keyof typeof depBegSeed] - 10,
      2021: depBegSeed[b as unknown as keyof typeof depBegSeed] - 20,
    }
    rows[b + 5000] = {
      2019: depAddSeed[b as unknown as keyof typeof depAddSeed],
      2020: depAddSeed[b as unknown as keyof typeof depAddSeed] - 1,
      2021: depAddSeed[b as unknown as keyof typeof depAddSeed] - 2,
    }
    // NET_VALUE seed — Acq End - Dep End (simple synthetic values for test)
    rows[b + 7000] = { 2019: begVal * 2, 2020: begVal * 2 + 10, 2021: begVal * 2 + 20 }
  }
  return {
    accounts: [
      { catalogId: 'land', excelRow: 8, section: 'fixed_asset' },
      { catalogId: 'building_cip', excelRow: 9, section: 'fixed_asset' },
      { catalogId: 'equipment_lab_machinery', excelRow: 10, section: 'fixed_asset' },
      { catalogId: 'vehicle_heavy_equipment', excelRow: 11, section: 'fixed_asset' },
      { catalogId: 'office_inventory', excelRow: 12, section: 'fixed_asset' },
      { catalogId: 'electrical', excelRow: 13, section: 'fixed_asset' },
    ],
    yearCount: 3,
    language: 'en',
    rows,
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
    aamAdjustments: {}, nilaiPengalihanDilaporkan: 0, interestBearingDebt: 0,
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

  it('translates FA offset keys to Proy FA template rows (original accounts)', () => {
    const wb = makeWb()
    ProyFaBuilder.build(wb, makeState())
    const ws = wb.getWorksheet('PROY FIXED ASSETS')!
    // Land excelRow 8:
    //   Acq Beg (key 8) → template row 8 (delta 0)
    //   Acq Add (key 2008) → template row 17 (delta 9)
    //   Dep Beg (key 4008) → template row 36 (delta 28)
    expect(ws.getCell('C8').value).toBe(120) // last hist year Acq Beg Land
    expect(ws.getCell('C17').value).toBe(14) // last hist year Acq Add Land
    expect(ws.getCell('C36').value).toBe(-50) // Dep Beg Land
  })

  it('writes Acquisition Total subtotal at row 14 summing per-account leaves', () => {
    const wb = makeWb()
    const ws0 = wb.getWorksheet('PROY FIXED ASSETS')!
    for (const row of [8, 9, 10, 11, 12, 13, 14]) {
      for (const col of ['C', 'D', 'E', 'F']) ws0.getCell(`${col}${row}`).value = 999
    }
    ProyFaBuilder.build(wb, makeState())
    const ws = wb.getWorksheet('PROY FIXED ASSETS')!
    // TOTAL_ACQ_BEGINNING at 2021: sum of Acq Begin across 6 accounts
    // Land 120 + Building 220 + Equip 320 + Veh 420 + Office 520 + Elec 70 = 1670
    expect(ws.getCell('C14').value as number).toBeCloseTo(1670, 0)
  })

  it('writes projected column D values at Acq/Dep/Net subtotal rows', () => {
    const wb = makeWb()
    const ws0 = wb.getWorksheet('PROY FIXED ASSETS')!
    for (const row of [8, 14, 23, 32, 42, 51, 60, 69]) {
      for (const col of ['C', 'D', 'E', 'F']) ws0.getCell(`${col}${row}`).value = 999
    }
    ProyFaBuilder.build(wb, makeState())
    const ws = wb.getWorksheet('PROY FIXED ASSETS')!
    expect(ws.getCell('D8').value).not.toBe(999)
    expect(ws.getCell('D14').value).not.toBe(999)
    expect(ws.getCell('D69').value).not.toBe(999)
  })

  it('overwrites all seeded cells for D/E/F at subtotal rows (Session 036 layout)', () => {
    const wb = makeWb()
    const ws0 = wb.getWorksheet('PROY FIXED ASSETS')!
    for (const row of [8, 14, 23, 32, 42, 51, 60, 69]) {
      for (const col of ['D', 'E', 'F']) ws0.getCell(`${col}${row}`).value = 999
    }
    ProyFaBuilder.build(wb, makeState())
    const ws = wb.getWorksheet('PROY FIXED ASSETS')!
    for (const row of [8, 14, 23, 32, 42, 51, 60, 69]) {
      for (const col of ['D', 'E', 'F']) {
        expect(ws.getCell(`${col}${row}`).value, `${col}${row}`).not.toBe(999)
      }
    }
  })

  // Session 036 — Net Value uses per-account NV growth (independent of Acq/Dep
  // subtotal identity). Old NV = Acq - Dep assertion no longer holds.
  it('Net Value subtotal (row 69) is non-null and derived from per-account NV', () => {
    const wb = makeWb()
    const ws0 = wb.getWorksheet('PROY FIXED ASSETS')!
    for (const col of ['C', 'D']) ws0.getCell(`${col}69`).value = 999
    ProyFaBuilder.build(wb, makeState())
    const ws = wb.getWorksheet('PROY FIXED ASSETS')!
    expect(ws.getCell('C69').value).not.toBe(999)
    expect(ws.getCell('D69').value).not.toBe(999)
  })
})

// Session 040 — Extended + custom FA account injection (7-band slot layout)
describe('ProyFaBuilder — extended + custom injection', () => {
  function makeFaWithExtended(language: 'en' | 'id' = 'en'): FixedAssetInputState {
    const baseFa = makeFa()
    // Append one extended (excelRow 100, computer_equipment) and one custom (1000).
    const extRows: Record<number, import('@/types/financial').YearKeyedSeries> = {
      // Extended: computer_equipment excelRow 100
      100:   { 2019: 50, 2020: 55, 2021: 60 },  // Acq Beg
      2100:  { 2019: 5, 2020: 6, 2021: 7 },    // Acq Add (100 + 2000)
      4100:  { 2019: -10, 2020: -12, 2021: -14 }, // Dep Beg
      5100:  { 2019: -2, 2020: -3, 2021: -4 },  // Dep Add
      7100:  { 2019: 40, 2020: 44, 2021: 49 },  // NV seed for NV growth calc
      // Custom: excelRow 1000
      1000:  { 2019: 200, 2020: 220, 2021: 240 },
      3000:  { 2019: 20, 2020: 22, 2021: 24 },
      5000:  { 2019: -20, 2020: -22, 2021: -24 },
      6000:  { 2019: -5, 2020: -6, 2021: -7 },
      8000:  { 2019: 180, 2020: 196, 2021: 215 }, // NV seed (1000 + 7000)
    }
    return {
      ...baseFa,
      accounts: [
        ...baseFa.accounts,
        { catalogId: 'computer_equipment', excelRow: 100, section: 'fixed_asset' },
        { catalogId: 'custom_1000', excelRow: 1000, section: 'fixed_asset', customLabel: 'Custom Machinery' },
      ],
      rows: { ...baseFa.rows, ...extRows },
      language,
    }
  }

  it('writes extended account label at B100 (Acq Begin band slot 0, en)', () => {
    const wb = makeWb()
    ProyFaBuilder.build(wb, makeState({ fixedAsset: makeFaWithExtended('en') }))
    const ws = wb.getWorksheet('PROY FIXED ASSETS')!
    expect(ws.getCell('B100').value).toBe('Computer Equipment')
  })

  it('writes extended label across ALL 7 bands (100, 140, 180, 220, 260, 300, 340)', () => {
    const wb = makeWb()
    ProyFaBuilder.build(wb, makeState({ fixedAsset: makeFaWithExtended('en') }))
    const ws = wb.getWorksheet('PROY FIXED ASSETS')!
    for (const row of [100, 140, 180, 220, 260, 300, 340]) {
      expect(ws.getCell(`B${row}`).value, `B${row}`).toBe('Computer Equipment')
    }
  })

  it('writes extended histYear (C) value at row 100 Acq Begin band = 60', () => {
    const wb = makeWb()
    ProyFaBuilder.build(wb, makeState({ fixedAsset: makeFaWithExtended('en') }))
    const ws = wb.getWorksheet('PROY FIXED ASSETS')!
    expect(ws.getCell('C100').value).toBe(60)
  })

  it('writes projected (D/E/F) numeric values at all 7 bands for extended account', () => {
    const wb = makeWb()
    ProyFaBuilder.build(wb, makeState({ fixedAsset: makeFaWithExtended('en') }))
    const ws = wb.getWorksheet('PROY FIXED ASSETS')!
    for (const row of [100, 140, 180, 220, 260, 300, 340]) {
      for (const col of ['D', 'E', 'F']) {
        const val = ws.getCell(`${col}${row}`).value
        expect(typeof val, `${col}${row}`).toBe('number')
      }
    }
  })

  it('writes custom account at slot 1 (row 101, 141, 181, ...) with customLabel', () => {
    const wb = makeWb()
    ProyFaBuilder.build(wb, makeState({ fixedAsset: makeFaWithExtended('en') }))
    const ws = wb.getWorksheet('PROY FIXED ASSETS')!
    // custom is second extended account → slot index 1 → Acq Begin row 101
    expect(ws.getCell('B101').value).toBe('Custom Machinery')
    expect(ws.getCell('C101').value).toBe(240) // 2021 Acq Beg (custom excelRow 1000)
  })

  it('honors language=id for catalog label lookup across bands', () => {
    const wb = makeWb()
    ProyFaBuilder.build(wb, makeState({ fixedAsset: makeFaWithExtended('id') }))
    const ws = wb.getWorksheet('PROY FIXED ASSETS')!
    expect(ws.getCell('B100').value).toBe('Peralatan Komputer')
    expect(ws.getCell('B340').value).toBe('Peralatan Komputer')
  })

  it('rows 100+ stay empty when no extended/custom accounts (regression guard)', () => {
    const wb = makeWb()
    ProyFaBuilder.build(wb, makeState()) // baseline makeFa() = 6 original only
    const ws = wb.getWorksheet('PROY FIXED ASSETS')!
    // Sample rows across the 7 bands — none should have labels or values
    for (const row of [100, 140, 180, 220, 260, 300, 340]) {
      const b = ws.getCell(`B${row}`).value
      expect(b == null || b === '', `B${row}`).toBe(true)
      for (const col of ['C', 'D', 'E', 'F']) {
        expect(ws.getCell(`${col}${row}`).value == null, `${col}${row}`).toBe(true)
      }
    }
  })
})

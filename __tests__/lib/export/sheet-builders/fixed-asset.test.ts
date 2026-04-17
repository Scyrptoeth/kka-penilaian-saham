import { describe, expect, it, beforeEach } from 'vitest'
import ExcelJS from 'exceljs'
import { FixedAssetBuilder } from '@/lib/export/sheet-builders/fixed-asset'
import type { ExportableState } from '@/lib/export/export-xlsx'
import type { FixedAssetInputState } from '@/data/live/types'
import type { HomeInputs } from '@/types/financial'

function makeWorkbook(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('FIXED ASSET')
  // Seed prototipe labels in all 4 baseline bands for row 8 (Land)
  ws.getCell('B8').value = 'Tanah (prototipe)'
  ws.getCell('B17').value = 'Tanah (prototipe)'
  ws.getCell('B36').value = 'Tanah (prototipe)'
  ws.getCell('B45').value = 'Tanah (prototipe)'
  return wb
}

function makeHome(tahun = 2022): HomeInputs {
  return {
    namaPerusahaan: 'Test Co',
    npwp: '',
    tahunTransaksi: tahun,
    jenisPerusahaan: 'tertutup',
    jenisSubjekPajak: 'badan',
    jumlahSahamBeredar: 1000,
    proporsiSaham: 1,
    dlomPercent: 0,
    dlocPercent: 0,
  } as HomeInputs
}

function makeFaState(
  accounts: FixedAssetInputState['accounts'],
  language: 'en' | 'id' = 'en',
): FixedAssetInputState {
  return {
    accounts,
    yearCount: 3,
    language,
    rows: {},
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
    nilaiPengalihanDilaporkan: 0,
    ...overrides,
  }
}

describe('FixedAssetBuilder — metadata', () => {
  it('has correct sheetName + upstream', () => {
    expect(FixedAssetBuilder.sheetName).toBe('FIXED ASSET')
    expect(FixedAssetBuilder.upstream).toContain('fixedAsset')
  })
})

describe('FixedAssetBuilder.build — labels across all 4 baseline bands', () => {
  let wb: ExcelJS.Workbook
  beforeEach(() => {
    wb = makeWorkbook()
  })

  it('writes English label at all 4 baseline bands for each account', () => {
    const state = makeState({
      fixedAsset: makeFaState([
        { catalogId: 'land', excelRow: 8, section: 'fixed_asset' },
      ], 'en'),
    })

    FixedAssetBuilder.build(wb, state)
    const ws = wb.getWorksheet('FIXED ASSET')!
    // Row 8: Acq Beginning
    expect(ws.getCell('B8').value).toBe('Land')
    // Row 17 = 8 + 9: Acq Additions
    expect(ws.getCell('B17').value).toBe('Land')
    // Row 36 = 8 + 28: Dep Beginning
    expect(ws.getCell('B36').value).toBe('Land')
    // Row 45 = 8 + 37: Dep Additions
    expect(ws.getCell('B45').value).toBe('Land')
  })

  it('writes Indonesian label when language=id', () => {
    const state = makeState({
      fixedAsset: makeFaState([
        { catalogId: 'land', excelRow: 8, section: 'fixed_asset' },
      ], 'id'),
    })

    FixedAssetBuilder.build(wb, state)
    const ws = wb.getWorksheet('FIXED ASSET')!
    expect(ws.getCell('B8').value).toBe('Tanah')
    expect(ws.getCell('B17').value).toBe('Tanah')
  })

  it('prefers customLabel', () => {
    const state = makeState({
      fixedAsset: makeFaState([
        { catalogId: 'land', customLabel: 'Tanah HQ Jakarta', excelRow: 8, section: 'fixed_asset' },
      ], 'en'),
    })

    FixedAssetBuilder.build(wb, state)
    const ws = wb.getWorksheet('FIXED ASSET')!
    expect(ws.getCell('B8').value).toBe('Tanah HQ Jakarta')
    expect(ws.getCell('B36').value).toBe('Tanah HQ Jakarta')
  })
})

describe('FixedAssetBuilder.build — values', () => {
  it('writes baseline year values across 4 bands for each account', () => {
    const wb = makeWorkbook()
    const state = makeState({
      fixedAsset: {
        accounts: [{ catalogId: 'land', excelRow: 8, section: 'fixed_asset' }],
        yearCount: 3,
        language: 'en',
        rows: {
          8:  { 2019: 1000, 2020: 1000, 2021: 1000 }, // Acq Begin
          17: { 2019: 0, 2020: 100, 2021: 0 },        // Acq Add (legacy key 8 + 9)
          36: { 2019: 0, 2020: 0, 2021: 0 },          // Dep Begin (legacy key 8 + 28)
          45: { 2019: 0, 2020: 0, 2021: 0 },          // Dep Add (legacy key 8 + 37)
        },
      },
    })

    FixedAssetBuilder.build(wb, state)
    const ws = wb.getWorksheet('FIXED ASSET')!
    // FA grid columns 2019→C, 2020→D, 2021→E
    expect(ws.getCell('C8').value).toBe(1000)
    expect(ws.getCell('D8').value).toBe(1000)
    expect(ws.getCell('E8').value).toBe(1000)
    expect(ws.getCell('D17').value).toBe(100)
  })
})

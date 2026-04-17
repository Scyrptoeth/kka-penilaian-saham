import { describe, expect, it, beforeEach } from 'vitest'
import ExcelJS from 'exceljs'
import { HomeBuilder } from '@/lib/export/sheet-builders/home'
import type { ExportableState } from '@/lib/export/export-xlsx'
import type { HomeInputs } from '@/types/financial'

function makeWorkbook(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('HOME')
  // Seed prototipe values the builder should overwrite
  ws.getCell('B4').value = 'PT Raja Voltama Elektrik (prototipe)'
  ws.getCell('B5').value = 'tertutup (prototipe)'
  ws.getCell('B6').value = 100000
  ws.getCell('B7').value = 50000
  ws.getCell('B9').value = 2021
  ws.getCell('B12').value = 'saham (prototipe)'
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

describe('HomeBuilder — metadata', () => {
  it('has correct sheetName + upstream slices', () => {
    expect(HomeBuilder.sheetName).toBe('HOME')
    expect(HomeBuilder.upstream).toEqual(['home'])
  })
})

describe('HomeBuilder.build — scalars', () => {
  let wb: ExcelJS.Workbook

  beforeEach(() => {
    wb = makeWorkbook()
  })

  it('writes namaPerusahaan to B4', () => {
    const state = makeState({ home: makeHome({ namaPerusahaan: 'Acme Corp' }) })
    HomeBuilder.build(wb, state)
    expect(wb.getWorksheet('HOME')!.getCell('B4').value).toBe('Acme Corp')
  })

  it('writes jenisPerusahaan to B5', () => {
    const state = makeState({ home: makeHome({ jenisPerusahaan: 'terbuka' }) })
    HomeBuilder.build(wb, state)
    expect(wb.getWorksheet('HOME')!.getCell('B5').value).toBe('terbuka')
  })

  it('writes jumlahSahamBeredar to B6', () => {
    const state = makeState({ home: makeHome({ jumlahSahamBeredar: 123456 }) })
    HomeBuilder.build(wb, state)
    expect(wb.getWorksheet('HOME')!.getCell('B6').value).toBe(123456)
  })

  it('writes jumlahSahamYangDinilai to B7', () => {
    const state = makeState({ home: makeHome({ jumlahSahamYangDinilai: 78900 }) })
    HomeBuilder.build(wb, state)
    expect(wb.getWorksheet('HOME')!.getCell('B7').value).toBe(78900)
  })

  it('writes tahunTransaksi to B9', () => {
    const state = makeState({ home: makeHome({ tahunTransaksi: 2025 }) })
    HomeBuilder.build(wb, state)
    expect(wb.getWorksheet('HOME')!.getCell('B9').value).toBe(2025)
  })

  it('writes objekPenilaian to B12', () => {
    const state = makeState({ home: makeHome({ objekPenilaian: 'modalDisetor' }) })
    HomeBuilder.build(wb, state)
    expect(wb.getWorksheet('HOME')!.getCell('B12').value).toBe('modalDisetor')
  })

  it('does not write to HOME cells outside the scalar mapping (e.g. B15 is a formula)', () => {
    wb.getWorksheet('HOME')!.getCell('B15').value = { formula: '=DLOM!C26' }
    const state = makeState({})
    HomeBuilder.build(wb, state)
    const v = wb.getWorksheet('HOME')!.getCell('B15').value
    expect(v && typeof v === 'object' && 'formula' in v).toBe(true)
  })

  it('idempotent — identical output on repeated build with same state', () => {
    const state = makeState({ home: makeHome({ namaPerusahaan: 'Idem Co' }) })
    HomeBuilder.build(wb, state)
    const first = wb.getWorksheet('HOME')!.getCell('B4').value
    HomeBuilder.build(wb, state)
    const second = wb.getWorksheet('HOME')!.getCell('B4').value
    expect(second).toBe(first)
  })

  it('missing worksheet — no throw (graceful no-op)', () => {
    const blankWb = new ExcelJS.Workbook()
    expect(() => HomeBuilder.build(blankWb, makeState({}))).not.toThrow()
  })
})

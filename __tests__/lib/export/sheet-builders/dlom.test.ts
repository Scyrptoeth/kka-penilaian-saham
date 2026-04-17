import { describe, expect, it, beforeEach } from 'vitest'
import ExcelJS from 'exceljs'
import { DlomBuilder } from '@/lib/export/sheet-builders/dlom'
import type { ExportableState } from '@/lib/export/export-xlsx'
import type { DlomState, WaccState } from '@/lib/store/useKkaStore'
import type { HomeInputs } from '@/types/financial'

function makeWorkbook(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook()
  wb.addWorksheet('DLOM')
  return wb
}

function makeHome(overrides: Partial<HomeInputs> = {}): HomeInputs {
  return {
    namaPerusahaan: 'Test Co',
    npwp: '',
    namaSubjekPajak: '',
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

function makeDlom(overrides: Partial<DlomState> = {}): DlomState {
  return {
    answers: {
      1: 'Sangat Tinggi',
      2: 'Tinggi',
      3: 'Moderat',
      4: 'Rendah',
      5: 'Sangat Rendah',
      6: 'Moderat',
      7: 'Tinggi',
      8: 'Sangat Rendah',
      9: 'Moderat',
      10: 'Rendah',
    },
    kepemilikan: 'Mayoritas',
    percentage: 0.15,
    ...overrides,
  } as DlomState
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

describe('DlomBuilder — metadata', () => {
  it('has correct sheetName + upstream (home is primary gate)', () => {
    expect(DlomBuilder.sheetName).toBe('DLOM')
    // Upstream is ['home']: DLOM sheet depends on home.jenisPerusahaan
    // for C30. state.dlom is optional inside build().
    expect(DlomBuilder.upstream).toEqual(['home'])
  })
})

describe('DlomBuilder.build — home populated only (no dlom)', () => {
  let wb: ExcelJS.Workbook
  beforeEach(() => {
    wb = makeWorkbook()
  })

  it('writes jenisPerusahaan="tertutup" → C30 = "DLOM Perusahaan tertutup "', () => {
    DlomBuilder.build(wb, makeState({ home: makeHome({ jenisPerusahaan: 'tertutup' }) }))
    expect(wb.getWorksheet('DLOM')!.getCell('C30').value).toBe('DLOM Perusahaan tertutup ')
  })

  it('writes jenisPerusahaan="terbuka" → C30 = "DLOM Perusahaan terbuka "', () => {
    DlomBuilder.build(wb, makeState({ home: makeHome({ jenisPerusahaan: 'terbuka' }) }))
    expect(wb.getWorksheet('DLOM')!.getCell('C30').value).toBe('DLOM Perusahaan terbuka ')
  })

  it('leaves answer rows empty when dlom is null', () => {
    DlomBuilder.build(wb, makeState({ dlom: null }))
    const ws = wb.getWorksheet('DLOM')!
    expect(ws.getCell('F7').value).toBeNull()
    expect(ws.getCell('F25').value).toBeNull()
  })

  it('leaves C31 kepemilikan empty when dlom is null', () => {
    DlomBuilder.build(wb, makeState({ dlom: null }))
    expect(wb.getWorksheet('DLOM')!.getCell('C31').value).toBeNull()
  })
})

describe('DlomBuilder.build — home + dlom populated', () => {
  let wb: ExcelJS.Workbook
  beforeEach(() => {
    wb = makeWorkbook()
  })

  it('writes C30 jenisPerusahaan + C31 kepemilikan + all 10 answer rows', () => {
    DlomBuilder.build(wb, makeState({ dlom: makeDlom() }))
    const ws = wb.getWorksheet('DLOM')!
    expect(ws.getCell('C30').value).toBe('DLOM Perusahaan tertutup ')
    expect(ws.getCell('C31').value).toBe('Mayoritas')
    expect(ws.getCell('F7').value).toBe('Sangat Tinggi')
    expect(ws.getCell('F9').value).toBe('Tinggi')
    expect(ws.getCell('F25').value).toBe('Rendah')
  })

  it('writes "Minoritas" kepemilikan correctly', () => {
    DlomBuilder.build(
      wb,
      makeState({ dlom: makeDlom({ kepemilikan: 'Minoritas' }) }),
    )
    expect(wb.getWorksheet('DLOM')!.getCell('C31').value).toBe('Minoritas')
  })

  it('skips answer rows where no answer provided', () => {
    const partial = makeDlom({ answers: { 1: 'Tinggi', 5: 'Rendah' } })
    DlomBuilder.build(wb, makeState({ dlom: partial }))
    const ws = wb.getWorksheet('DLOM')!
    expect(ws.getCell('F7').value).toBe('Tinggi') // answer 1 → F7
    expect(ws.getCell('F9').value).toBeNull() // answer 2 missing
    expect(ws.getCell('F15').value).toBe('Rendah') // answer 5 → F15
  })
})

describe('DlomBuilder.build — edge cases', () => {
  it('missing worksheet — no throw', () => {
    const blankWb = new ExcelJS.Workbook()
    expect(() => DlomBuilder.build(blankWb, makeState({}))).not.toThrow()
  })
})

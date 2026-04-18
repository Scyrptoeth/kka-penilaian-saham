import { describe, expect, it, beforeEach } from 'vitest'
import ExcelJS from 'exceljs'
import { DlocBuilder } from '@/lib/export/sheet-builders/dloc'
import type { ExportableState } from '@/lib/export/export-xlsx'
import type { DlocState } from '@/lib/store/useKkaStore'

function makeWorkbook(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook()
  wb.addWorksheet('DLOC(PFC)')
  return wb
}

function makeDloc(overrides: Partial<DlocState> = {}): DlocState {
  return {
    answers: {
      1: 'Tinggi',
      2: 'Moderat',
      3: 'Rendah',
      4: 'Sangat Tinggi',
      5: 'Sangat Rendah',
    },
    kepemilikan: 'Minoritas',
    percentage: 0.12,
    ...overrides,
  } as DlocState
}

function makeState(overrides: Partial<ExportableState>): ExportableState {
  return {
    home: null,
    balanceSheet: null,
    incomeStatement: null,
    fixedAsset: null,
    accPayables: null,
    wacc: null,
    discountRate: null,
    keyDrivers: null,
    dlom: null,
    dloc: makeDloc(),
    borrowingCapInput: null,
    aamAdjustments: {},
    nilaiPengalihanDilaporkan: 0, interestBearingDebt: 0,
    ...overrides,
  }
}

describe('DlocBuilder — metadata', () => {
  it('has correct sheetName + upstream', () => {
    expect(DlocBuilder.sheetName).toBe('DLOC(PFC)')
    expect(DlocBuilder.upstream).toEqual(['dloc'])
  })
})

describe('DlocBuilder.build — populated', () => {
  let wb: ExcelJS.Workbook
  beforeEach(() => {
    wb = makeWorkbook()
  })

  it('writes B21 kepemilikan + E7,E9,E11,E13,E15 answers', () => {
    DlocBuilder.build(wb, makeState({}))
    const ws = wb.getWorksheet('DLOC(PFC)')!
    expect(ws.getCell('B21').value).toBe('Minoritas')
    expect(ws.getCell('E7').value).toBe('Tinggi')
    expect(ws.getCell('E9').value).toBe('Moderat')
    expect(ws.getCell('E11').value).toBe('Rendah')
    expect(ws.getCell('E13').value).toBe('Sangat Tinggi')
    expect(ws.getCell('E15').value).toBe('Sangat Rendah')
  })

  it('writes "Mayoritas" kepemilikan', () => {
    DlocBuilder.build(wb, makeState({ dloc: makeDloc({ kepemilikan: 'Mayoritas' }) }))
    expect(wb.getWorksheet('DLOC(PFC)')!.getCell('B21').value).toBe('Mayoritas')
  })

  it('skips missing answer factors', () => {
    const partial = makeDloc({ answers: { 1: 'Tinggi', 5: 'Rendah' } })
    DlocBuilder.build(wb, makeState({ dloc: partial }))
    const ws = wb.getWorksheet('DLOC(PFC)')!
    expect(ws.getCell('E7').value).toBe('Tinggi')
    expect(ws.getCell('E9').value).toBeNull()
    expect(ws.getCell('E15').value).toBe('Rendah')
  })
})

describe('DlocBuilder.build — edge cases', () => {
  it('missing worksheet — no throw', () => {
    const blankWb = new ExcelJS.Workbook()
    expect(() => DlocBuilder.build(blankWb, makeState({}))).not.toThrow()
  })
})

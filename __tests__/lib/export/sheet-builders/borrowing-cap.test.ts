import { describe, expect, it, beforeEach } from 'vitest'
import ExcelJS from 'exceljs'
import { BorrowingCapBuilder } from '@/lib/export/sheet-builders/borrowing-cap'
import type { ExportableState } from '@/lib/export/export-xlsx'
import type { BorrowingCapInputState } from '@/lib/store/useKkaStore'

function makeWorkbook(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook()
  wb.addWorksheet('BORROWING CAP')
  return wb
}

function makeBC(overrides: Partial<BorrowingCapInputState> = {}): BorrowingCapInputState {
  return {
    piutangCalk: 1_500_000,
    persediaanCalk: 2_500_000,
    ...overrides,
  }
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
    dloc: null,
    borrowingCapInput: makeBC(),
    aamAdjustments: {},
    nilaiPengalihanDilaporkan: 0,
    ...overrides,
  }
}

describe('BorrowingCapBuilder — metadata', () => {
  it('has correct sheetName + upstream', () => {
    expect(BorrowingCapBuilder.sheetName).toBe('BORROWING CAP')
    expect(BorrowingCapBuilder.upstream).toEqual(['borrowingCapInput'])
  })
})

describe('BorrowingCapBuilder.build', () => {
  let wb: ExcelJS.Workbook
  beforeEach(() => {
    wb = makeWorkbook()
  })

  it('writes piutangCalk to D5 and persediaanCalk to D6', () => {
    BorrowingCapBuilder.build(wb, makeState({}))
    const ws = wb.getWorksheet('BORROWING CAP')!
    expect(ws.getCell('D5').value).toBe(1_500_000)
    expect(ws.getCell('D6').value).toBe(2_500_000)
  })

  it('writes zeros when provided', () => {
    BorrowingCapBuilder.build(
      wb,
      makeState({ borrowingCapInput: makeBC({ piutangCalk: 0, persediaanCalk: 0 }) }),
    )
    const ws = wb.getWorksheet('BORROWING CAP')!
    expect(ws.getCell('D5').value).toBe(0)
    expect(ws.getCell('D6').value).toBe(0)
  })

  it('missing worksheet — no throw', () => {
    const blankWb = new ExcelJS.Workbook()
    expect(() => BorrowingCapBuilder.build(blankWb, makeState({}))).not.toThrow()
  })
})

import { describe, expect, it, beforeEach } from 'vitest'
import ExcelJS from 'exceljs'
import { WaccBuilder } from '@/lib/export/sheet-builders/wacc'
import type { ExportableState } from '@/lib/export/export-xlsx'
import type { WaccState } from '@/lib/store/useKkaStore'

function makeWorkbook(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook()
  wb.addWorksheet('WACC')
  wb.addWorksheet('INCOME STATEMENT')
  return wb
}

function makeWacc(overrides: Partial<WaccState> = {}): WaccState {
  return {
    marketParams: {
      equityRiskPremium: 0.0762,
      ratingBasedDefaultSpread: 0.0226,
      riskFree: 0.027,
    },
    comparableCompanies: [
      { name: 'Company A', betaLevered: 1.2, marketCap: 1000, debt: 500 },
      { name: 'Company B', betaLevered: 0.8, marketCap: 2000, debt: 1000 },
    ],
    taxRate: 0.22,
    bankRates: [
      { name: 'Bank BCA', rate: 0.0825 },
      { name: 'Bank Mandiri', rate: 0.085 },
    ],
    waccOverride: 0.1031,
    ...overrides,
  } as WaccState
}

function makeState(overrides: Partial<ExportableState>): ExportableState {
  return {
    home: null,
    balanceSheet: null,
    incomeStatement: null,
    fixedAsset: null,
    accPayables: null,
    wacc: makeWacc(),
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

describe('WaccBuilder — metadata', () => {
  it('has correct sheetName + upstream', () => {
    expect(WaccBuilder.sheetName).toBe('WACC')
    expect(WaccBuilder.upstream).toEqual(['wacc'])
  })
})

describe('WaccBuilder.build — WACC-sheet scalars', () => {
  let wb: ExcelJS.Workbook
  beforeEach(() => {
    wb = makeWorkbook()
  })

  it('writes equityRiskPremium to WACC!B4', () => {
    WaccBuilder.build(wb, makeState({}))
    expect(wb.getWorksheet('WACC')!.getCell('B4').value).toBe(0.0762)
  })

  it('writes ratingBasedDefaultSpread to WACC!B5', () => {
    WaccBuilder.build(wb, makeState({}))
    expect(wb.getWorksheet('WACC')!.getCell('B5').value).toBe(0.0226)
  })

  it('writes riskFree to WACC!B6', () => {
    WaccBuilder.build(wb, makeState({}))
    expect(wb.getWorksheet('WACC')!.getCell('B6').value).toBe(0.027)
  })

  it('writes waccOverride to WACC!E22', () => {
    WaccBuilder.build(wb, makeState({}))
    expect(wb.getWorksheet('WACC')!.getCell('E22').value).toBe(0.1031)
  })
})

describe('WaccBuilder.build — IS!B33 cross-sheet tax rate', () => {
  it('writes wacc.taxRate to INCOME STATEMENT!B33 (Session 031 regression fix)', () => {
    const wb = makeWorkbook()
    WaccBuilder.build(wb, makeState({ wacc: makeWacc({ taxRate: 0.25 }) }))
    expect(wb.getWorksheet('INCOME STATEMENT')!.getCell('B33').value).toBe(0.25)
  })

  it('does not write IS!B33 when wacc is null (handled by orchestrator clear)', () => {
    // Note: orchestrator would normally clear WACC sheet before build().
    // Direct build() call with null wacc tests graceful behavior.
    const wb = makeWorkbook()
    // Seed existing value so we can verify non-write
    wb.getWorksheet('INCOME STATEMENT')!.getCell('B33').value = 'preserved'
    WaccBuilder.build(wb, makeState({ wacc: null }))
    // When wacc null, writeScalarsFromSlice finds no 'wacc' mappings to
    // resolve → value untouched
    expect(wb.getWorksheet('INCOME STATEMENT')!.getCell('B33').value).toBe('preserved')
  })
})

describe('WaccBuilder.build — dynamic rows (companies + bank rates)', () => {
  let wb: ExcelJS.Workbook
  beforeEach(() => {
    wb = makeWorkbook()
  })

  it('writes comparableCompanies rows starting at row 11', () => {
    WaccBuilder.build(wb, makeState({}))
    const ws = wb.getWorksheet('WACC')!
    expect(ws.getCell('A11').value).toBe('Company A')
    expect(ws.getCell('B11').value).toBe(1.2)
    expect(ws.getCell('A12').value).toBe('Company B')
  })

  it('writes bankRates starting at row 27', () => {
    WaccBuilder.build(wb, makeState({}))
    const ws = wb.getWorksheet('WACC')!
    expect(ws.getCell('A27').value).toBe('Bank BCA')
    expect(ws.getCell('B27').value).toBe(0.0825)
  })
})

describe('WaccBuilder.build — edge cases', () => {
  it('waccOverride=null → E22 skipped gracefully', () => {
    const wb = makeWorkbook()
    wb.getWorksheet('WACC')!.getCell('E22').value = 'untouched'
    WaccBuilder.build(wb, makeState({ wacc: makeWacc({ waccOverride: null }) }))
    expect(wb.getWorksheet('WACC')!.getCell('E22').value).toBe('untouched')
  })

  it('missing WACC sheet — no throw', () => {
    const blankWb = new ExcelJS.Workbook()
    blankWb.addWorksheet('INCOME STATEMENT')
    expect(() => WaccBuilder.build(blankWb, makeState({}))).not.toThrow()
  })

  it('missing IS sheet — no throw on cross-sheet write attempt', () => {
    const blankWb = new ExcelJS.Workbook()
    blankWb.addWorksheet('WACC')
    expect(() => WaccBuilder.build(blankWb, makeState({}))).not.toThrow()
  })
})

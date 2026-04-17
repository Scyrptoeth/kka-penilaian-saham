import { describe, expect, it, beforeEach } from 'vitest'
import ExcelJS from 'exceljs'
import { DiscountRateBuilder } from '@/lib/export/sheet-builders/discount-rate'
import type { ExportableState } from '@/lib/export/export-xlsx'
import type { DiscountRateState } from '@/lib/store/useKkaStore'

function makeWorkbook(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook()
  wb.addWorksheet('DISCOUNT RATE')
  return wb
}

function makeDR(overrides: Partial<DiscountRateState> = {}): DiscountRateState {
  return {
    taxRate: 0.22,
    riskFree: 0.0648,
    beta: 1.2,
    equityRiskPremium: 0.0762,
    countryDefaultSpread: 0.0226,
    derIndustry: 0.5,
    bankRates: [
      { name: 'BCA', rate: 0.0825 },
      { name: 'Mandiri', rate: 0.085 },
    ],
    ...overrides,
  } as DiscountRateState
}

function makeState(overrides: Partial<ExportableState>): ExportableState {
  return {
    home: null,
    balanceSheet: null,
    incomeStatement: null,
    fixedAsset: null,
    accPayables: null,
    wacc: null,
    discountRate: makeDR(),
    keyDrivers: null,
    dlom: null,
    dloc: null,
    borrowingCapInput: null,
    aamAdjustments: {},
    nilaiPengalihanDilaporkan: 0,
    ...overrides,
  }
}

describe('DiscountRateBuilder — metadata', () => {
  it('has correct sheetName + upstream', () => {
    expect(DiscountRateBuilder.sheetName).toBe('DISCOUNT RATE')
    expect(DiscountRateBuilder.upstream).toEqual(['discountRate'])
  })
})

describe('DiscountRateBuilder.build — scalars', () => {
  let wb: ExcelJS.Workbook
  beforeEach(() => {
    wb = makeWorkbook()
  })

  it('writes taxRate to C2', () => {
    DiscountRateBuilder.build(wb, makeState({}))
    expect(wb.getWorksheet('DISCOUNT RATE')!.getCell('C2').value).toBe(0.22)
  })

  it('writes beta to C4', () => {
    DiscountRateBuilder.build(wb, makeState({}))
    expect(wb.getWorksheet('DISCOUNT RATE')!.getCell('C4').value).toBe(1.2)
  })

  it('writes all 6 scalar fields C2..C8', () => {
    DiscountRateBuilder.build(wb, makeState({}))
    const ws = wb.getWorksheet('DISCOUNT RATE')!
    expect(ws.getCell('C2').value).toBe(0.22)
    expect(ws.getCell('C3').value).toBe(0.0648)
    expect(ws.getCell('C4').value).toBe(1.2)
    expect(ws.getCell('C5').value).toBe(0.0762)
    expect(ws.getCell('C6').value).toBe(0.0226)
    expect(ws.getCell('C8').value).toBe(0.5)
  })
})

describe('DiscountRateBuilder.build — bank rates with multiplyBy100 transform', () => {
  it('multiplies rate by 100 (store stores 0.0825, Excel expects 8.25)', () => {
    const wb = makeWorkbook()
    DiscountRateBuilder.build(wb, makeState({}))
    const ws = wb.getWorksheet('DISCOUNT RATE')!
    expect(ws.getCell('K6').value).toBe('BCA')
    expect(ws.getCell('L6').value).toBeCloseTo(8.25, 10)
    expect(ws.getCell('L7').value).toBeCloseTo(8.5, 10)
  })
})

describe('DiscountRateBuilder.build — edge cases', () => {
  it('missing worksheet — no throw', () => {
    const blankWb = new ExcelJS.Workbook()
    expect(() => DiscountRateBuilder.build(blankWb, makeState({}))).not.toThrow()
  })
})

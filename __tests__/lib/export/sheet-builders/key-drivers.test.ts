import { describe, expect, it, beforeEach } from 'vitest'
import ExcelJS from 'exceljs'
import { KeyDriversBuilder } from '@/lib/export/sheet-builders/key-drivers'
import type { ExportableState } from '@/lib/export/export-xlsx'
import type { KeyDriversState } from '@/lib/store/useKkaStore'

function makeWorkbook(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook()
  wb.addWorksheet('KEY DRIVERS')
  return wb
}

function makeKeyDrivers(overrides: Partial<KeyDriversState> = {}): KeyDriversState {
  return {
    financialDrivers: {
      interestRateShortTerm: 0.08,
      interestRateLongTerm: 0.09,
      bankDepositRate: 0.04,
      corporateTaxRate: 0.22,
    },
    operationalDrivers: {
      salesVolumeBase: 100000,
      salesPriceBase: 500,
      salesVolumeIncrements: [0.05, 0.06, 0.07, 0.08, 0.09, 0.1],
      salesPriceIncrements: [0.01, 0.02, 0.03, 0.04, 0.05, 0.06],
      cogsRatio: 0.6,
      sellingExpenseRatio: 0.05,
      gaExpenseRatio: 0.03,
    },
    bsDrivers: {
      accReceivableDays: [30, 31, 32, 33, 34, 35, 36],
      inventoryDays: [40, 41, 42, 43, 44, 45, 46],
      accPayableDays: [50, 51, 52, 53, 54, 55, 56],
    },
    additionalCapex: {
      land: [0, 0, 0, 0, 0, 0, 0],
      building: [100, 200, 300, 400, 500, 600, 700],
      equipment: [0, 0, 0, 0, 0, 0, 0],
      others: [0, 0, 0, 0, 0, 0, 0],
    },
    ...overrides,
  } as KeyDriversState
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
    keyDrivers: makeKeyDrivers(),
    dlom: null,
    dloc: null,
    borrowingCapInput: null,
    aamAdjustments: {},
    nilaiPengalihanDilaporkan: 0,
    ...overrides,
  }
}

describe('KeyDriversBuilder — metadata', () => {
  it('has correct sheetName + upstream', () => {
    expect(KeyDriversBuilder.sheetName).toBe('KEY DRIVERS')
    expect(KeyDriversBuilder.upstream).toEqual(['keyDrivers'])
  })
})

describe('KeyDriversBuilder.build — scalars', () => {
  let wb: ExcelJS.Workbook
  beforeEach(() => {
    wb = makeWorkbook()
  })

  it('writes interestRateShortTerm to C8', () => {
    KeyDriversBuilder.build(wb, makeState({}))
    expect(wb.getWorksheet('KEY DRIVERS')!.getCell('C8').value).toBe(0.08)
  })

  it('writes corporateTaxRate to C11', () => {
    KeyDriversBuilder.build(wb, makeState({}))
    expect(wb.getWorksheet('KEY DRIVERS')!.getCell('C11').value).toBe(0.22)
  })

  it('writes salesVolumeBase to D14', () => {
    KeyDriversBuilder.build(wb, makeState({}))
    expect(wb.getWorksheet('KEY DRIVERS')!.getCell('D14').value).toBe(100000)
  })

  it('writes cogsRatio scalar to D20', () => {
    KeyDriversBuilder.build(wb, makeState({}))
    expect(wb.getWorksheet('KEY DRIVERS')!.getCell('D20').value).toBe(0.6)
  })
})

describe('KeyDriversBuilder.build — arrays', () => {
  let wb: ExcelJS.Workbook
  beforeEach(() => {
    wb = makeWorkbook()
  })

  it('writes salesVolumeIncrements across E15..J15', () => {
    KeyDriversBuilder.build(wb, makeState({}))
    const ws = wb.getWorksheet('KEY DRIVERS')!
    expect(ws.getCell('E15').value).toBe(0.05)
    expect(ws.getCell('J15').value).toBe(0.1)
  })

  it('writes accReceivableDays across D28..J28', () => {
    KeyDriversBuilder.build(wb, makeState({}))
    const ws = wb.getWorksheet('KEY DRIVERS')!
    expect(ws.getCell('D28').value).toBe(30)
    expect(ws.getCell('J28').value).toBe(36)
  })

  it('expands cogsRatio scalar to E20..J20 via _cogsRatioProjected synthetic field', () => {
    KeyDriversBuilder.build(wb, makeState({}))
    const ws = wb.getWorksheet('KEY DRIVERS')!
    expect(ws.getCell('E20').value).toBe(0.6)
    expect(ws.getCell('J20').value).toBe(0.6)
  })

  it('writes additionalCapex.building across D34..J34', () => {
    KeyDriversBuilder.build(wb, makeState({}))
    const ws = wb.getWorksheet('KEY DRIVERS')!
    expect(ws.getCell('D34').value).toBe(100)
    expect(ws.getCell('J34').value).toBe(700)
  })
})

describe('KeyDriversBuilder.build — edge cases', () => {
  it('missing worksheet — no throw', () => {
    const blankWb = new ExcelJS.Workbook()
    expect(() => KeyDriversBuilder.build(blankWb, makeState({}))).not.toThrow()
  })

  it('idempotent — same output on repeated build', () => {
    const wb = makeWorkbook()
    const state = makeState({})
    KeyDriversBuilder.build(wb, state)
    const first = wb.getWorksheet('KEY DRIVERS')!.getCell('C8').value
    KeyDriversBuilder.build(wb, state)
    const second = wb.getWorksheet('KEY DRIVERS')!.getCell('C8').value
    expect(second).toBe(first)
  })
})

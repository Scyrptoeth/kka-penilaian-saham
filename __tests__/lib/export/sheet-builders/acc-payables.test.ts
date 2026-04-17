import { describe, expect, it, beforeEach } from 'vitest'
import ExcelJS from 'exceljs'
import { AccPayablesBuilder } from '@/lib/export/sheet-builders/acc-payables'
import type { ExportableState } from '@/lib/export/export-xlsx'
import type { AccPayablesInputState } from '@/data/live/types'

function makeWorkbook(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('ACC PAYABLES')
  // Seed Beginning formula (template-style) to confirm it stays intact
  ws.getCell('C9').value = { formula: '=C12' }
  ws.getCell('C12').value = { formula: '=C9+C10+C11' }
  return wb
}

function makeAccPayables(
  overrides: Partial<AccPayablesInputState> = {},
): AccPayablesInputState {
  return {
    rows: {
      10: { 2019: 100, 2020: 200, 2021: 300 }, // ST Addition
      11: { 2019: -50, 2020: -70, 2021: -90 }, // ST Repayment (negative)
      14: { 2019: 5, 2020: 6, 2021: 7 }, // ST Interest
      19: { 2019: 1000, 2020: 2000, 2021: 3000 }, // LT Addition
      20: { 2019: -500, 2020: -700, 2021: -900 }, // LT Repayment
      23: { 2019: 50, 2020: 60, 2021: 70 }, // LT Interest
    },
    ...overrides,
  } as AccPayablesInputState
}

function makeState(overrides: Partial<ExportableState>): ExportableState {
  return {
    home: null,
    balanceSheet: null,
    incomeStatement: null,
    fixedAsset: null,
    accPayables: makeAccPayables(),
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

describe('AccPayablesBuilder — metadata', () => {
  it('has correct sheetName + upstream', () => {
    expect(AccPayablesBuilder.sheetName).toBe('ACC PAYABLES')
    expect(AccPayablesBuilder.upstream).toEqual(['accPayables'])
  })
})

describe('AccPayablesBuilder.build — leaf values', () => {
  let wb: ExcelJS.Workbook
  beforeEach(() => {
    wb = makeWorkbook()
  })

  it('writes ST Addition row 10 across C/D/E (2019/2020/2021)', () => {
    AccPayablesBuilder.build(wb, makeState({}))
    const ws = wb.getWorksheet('ACC PAYABLES')!
    expect(ws.getCell('C10').value).toBe(100)
    expect(ws.getCell('D10').value).toBe(200)
    expect(ws.getCell('E10').value).toBe(300)
  })

  it('writes ST Repayment row 11 as signed (negative) values', () => {
    AccPayablesBuilder.build(wb, makeState({}))
    const ws = wb.getWorksheet('ACC PAYABLES')!
    expect(ws.getCell('C11').value).toBe(-50)
    expect(ws.getCell('E11').value).toBe(-90)
  })

  it('writes LT Addition row 19 across C/D/E', () => {
    AccPayablesBuilder.build(wb, makeState({}))
    const ws = wb.getWorksheet('ACC PAYABLES')!
    expect(ws.getCell('C19').value).toBe(1000)
    expect(ws.getCell('D19').value).toBe(2000)
  })

  it('writes interest rows 14 and 23', () => {
    AccPayablesBuilder.build(wb, makeState({}))
    const ws = wb.getWorksheet('ACC PAYABLES')!
    expect(ws.getCell('C14').value).toBe(5)
    expect(ws.getCell('C23').value).toBe(50)
  })
})

describe('AccPayablesBuilder.build — template formulas preserved', () => {
  let wb: ExcelJS.Workbook
  beforeEach(() => {
    wb = makeWorkbook()
  })

  it('does NOT overwrite C9 (Beginning formula)', () => {
    AccPayablesBuilder.build(wb, makeState({}))
    const v = wb.getWorksheet('ACC PAYABLES')!.getCell('C9').value
    expect(v && typeof v === 'object' && 'formula' in v).toBe(true)
  })

  it('does NOT overwrite C12 (Ending formula)', () => {
    AccPayablesBuilder.build(wb, makeState({}))
    const v = wb.getWorksheet('ACC PAYABLES')!.getCell('C12').value
    expect(v && typeof v === 'object' && 'formula' in v).toBe(true)
  })
})

describe('AccPayablesBuilder.build — edge cases', () => {
  it('partial year data — only present years written', () => {
    const wb = makeWorkbook()
    const partial: AccPayablesInputState = {
      rows: { 10: { 2020: 50 } }, // only 2020, no 2019/2021
    }
    AccPayablesBuilder.build(wb, makeState({ accPayables: partial }))
    const ws = wb.getWorksheet('ACC PAYABLES')!
    expect(ws.getCell('C10').value).toBe(null) // 2019 → unwritten
    expect(ws.getCell('D10').value).toBe(50) // 2020 → written
    expect(ws.getCell('E10').value).toBe(null) // 2021 → unwritten
  })

  it('missing worksheet — no throw', () => {
    const blankWb = new ExcelJS.Workbook()
    expect(() => AccPayablesBuilder.build(blankWb, makeState({}))).not.toThrow()
  })

  it('idempotent — same output on repeated build', () => {
    const wb = makeWorkbook()
    const state = makeState({})
    AccPayablesBuilder.build(wb, state)
    const first = wb.getWorksheet('ACC PAYABLES')!.getCell('C10').value
    AccPayablesBuilder.build(wb, state)
    const second = wb.getWorksheet('ACC PAYABLES')!.getCell('C10').value
    expect(second).toBe(first)
  })
})

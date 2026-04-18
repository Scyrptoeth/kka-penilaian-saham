import { describe, expect, it, beforeEach } from 'vitest'
import ExcelJS from 'exceljs'
import { AccPayablesBuilder } from '@/lib/export/sheet-builders/acc-payables'
import type { ExportableState } from '@/lib/export/export-xlsx'
import type { AccPayablesInputState, ApSchedule } from '@/data/live/types'

function makeWorkbook(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook()
  wb.addWorksheet('ACC PAYABLES')
  return wb
}

function defaultSchedules(): ApSchedule[] {
  return [
    { id: 'st_default', section: 'st_bank_loans', slotIndex: 0 },
    { id: 'lt_default', section: 'lt_bank_loans', slotIndex: 0 },
  ]
}

function makeAccPayables(
  overrides: Partial<AccPayablesInputState> = {},
): AccPayablesInputState {
  return {
    schedules: defaultSchedules(),
    // Simulated sentinel-precomputed values (mirrors DynamicApEditor persist
    // behaviour: Beg + End computed at persist time from Addition).
    rows: {
      9: { 2019: 0, 2020: 100, 2021: 300 },     // ST Beg
      10: { 2019: 100, 2020: 200, 2021: 300 },  // ST Addition (signed)
      12: { 2019: 100, 2020: 300, 2021: 600 },  // ST End
      18: { 2019: 0, 2020: 1000, 2021: 3000 },  // LT Beg
      19: { 2019: 1000, 2020: 2000, 2021: 3000 }, // LT Addition
      21: { 2019: 1000, 2020: 3000, 2021: 6000 }, // LT End
    },
    ...overrides,
  }
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
    interestBearingDebt: null,
    changesInWorkingCapital: null,
    ...overrides,
  } as ExportableState
}

describe('AccPayablesBuilder — metadata', () => {
  it('has correct sheetName + upstream', () => {
    expect(AccPayablesBuilder.sheetName).toBe('ACC PAYABLES')
    expect(AccPayablesBuilder.upstream).toEqual(['accPayables'])
  })
})

describe('AccPayablesBuilder.build — baseline schedules (slot 0)', () => {
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

  it('writes ST Beginning row 9 (sentinel pre-computed)', () => {
    AccPayablesBuilder.build(wb, makeState({}))
    const ws = wb.getWorksheet('ACC PAYABLES')!
    expect(ws.getCell('C9').value).toBe(0)
    expect(ws.getCell('D9').value).toBe(100)
  })

  it('writes ST Ending row 12 as live formula =C9+C10 with cached result', () => {
    AccPayablesBuilder.build(wb, makeState({}))
    const ws = wb.getWorksheet('ACC PAYABLES')!
    const c12 = ws.getCell('C12').value as { formula: string; result: number }
    expect(typeof c12).toBe('object')
    expect(c12.formula).toBe('C9+C10')
    expect(c12.result).toBe(100)
  })

  it('writes LT Addition row 19 + Ending row 21 as formula', () => {
    AccPayablesBuilder.build(wb, makeState({}))
    const ws = wb.getWorksheet('ACC PAYABLES')!
    expect(ws.getCell('C19').value).toBe(1000)
    const e21 = ws.getCell('E21').value as { formula: string; result: number }
    expect(e21.formula).toBe('E18+E19')
    expect(e21.result).toBe(6000)
  })
})

describe('AccPayablesBuilder.build — extended schedules (slot 1+)', () => {
  it('writes ST slot 1 Addition at synthetic row 140', () => {
    const wb = makeWorkbook()
    const state = makeState({
      accPayables: {
        schedules: [
          ...defaultSchedules(),
          { id: 'st_2', section: 'st_bank_loans', slotIndex: 1 },
        ],
        rows: {
          140: { 2020: 500_000 },   // ST slot 1 Addition
          100: { 2020: 0 },         // ST slot 1 Beg
          180: { 2020: 500_000 },   // ST slot 1 End (sentinel)
        },
      },
    })

    AccPayablesBuilder.build(wb, state)
    const ws = wb.getWorksheet('ACC PAYABLES')!
    expect(ws.getCell('D140').value).toBe(500_000)
    expect(ws.getCell('D100').value).toBe(0)
    const d180 = ws.getCell('D180').value as { formula: string; result: number }
    expect(d180.formula).toBe('D100+D140')
    expect(d180.result).toBe(500_000)
  })

  it('writes LT slot 2 schedule at synthetic rows 221/261/301', () => {
    const wb = makeWorkbook()
    const state = makeState({
      accPayables: {
        schedules: [
          ...defaultSchedules(),
          { id: 'lt_2', section: 'lt_bank_loans', slotIndex: 2 },
        ],
        rows: {
          261: { 2021: 750_000 },  // LT slot 2 Addition
        },
      },
    })

    AccPayablesBuilder.build(wb, state)
    const ws = wb.getWorksheet('ACC PAYABLES')!
    expect(ws.getCell('E261').value).toBe(750_000)
    const e301 = ws.getCell('E301').value as { formula: string }
    expect(e301.formula).toBe('E221+E261')
  })

  it('writes custom label for extended schedules', () => {
    const wb = makeWorkbook()
    const state = makeState({
      accPayables: {
        schedules: [
          { id: 'st_default', section: 'st_bank_loans', slotIndex: 0 },
          {
            id: 'st_obligasi',
            section: 'st_bank_loans',
            slotIndex: 1,
            customLabel: 'Obligasi A',
          },
        ],
        rows: {},
      },
    })

    AccPayablesBuilder.build(wb, state)
    const ws = wb.getWorksheet('ACC PAYABLES')!
    expect(ws.getCell('B100').value).toBe('Obligasi A')
    expect(ws.getCell('B140').value).toBe('Obligasi A')
    expect(ws.getCell('B180').value).toBe('Obligasi A')
  })
})

describe('AccPayablesBuilder.build — edge cases', () => {
  it('missing worksheet — no throw', () => {
    const blankWb = new ExcelJS.Workbook()
    expect(() => AccPayablesBuilder.build(blankWb, makeState({}))).not.toThrow()
  })

  it('null accPayables — no throw, no writes', () => {
    const wb = makeWorkbook()
    expect(() =>
      AccPayablesBuilder.build(wb, makeState({ accPayables: null })),
    ).not.toThrow()
  })

  it('empty schedules array — no writes', () => {
    const wb = makeWorkbook()
    const state = makeState({
      accPayables: { schedules: [], rows: {} },
    })
    AccPayablesBuilder.build(wb, state)
    const ws = wb.getWorksheet('ACC PAYABLES')!
    // No writes anywhere — all cells stay null
    expect(ws.getCell('C10').value).toBeNull()
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

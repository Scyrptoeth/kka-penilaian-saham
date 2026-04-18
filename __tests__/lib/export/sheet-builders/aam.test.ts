import { describe, expect, it, beforeEach } from 'vitest'
import ExcelJS from 'exceljs'
import { AamBuilder } from '@/lib/export/sheet-builders/aam'
import type { ExportableState } from '@/lib/export/export-xlsx'
import type { BalanceSheetInputState } from '@/data/live/types'
import type { HomeInputs } from '@/types/financial'

function makeWorkbook(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('AAM')
  // Seed prototipe-style label in col B at AAM row 9 (maps to BS row 8 = cash)
  ws.getCell('B9').value = 'Kas dan setara kas (prototipe)'
  ws.getCell('B11').value = 'Piutang (prototipe)'
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

function makeBsState(
  accounts: BalanceSheetInputState['accounts'],
  language: 'en' | 'id' = 'en',
): BalanceSheetInputState {
  return {
    accounts,
    yearCount: 4,
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
    nilaiPengalihanDilaporkan: 0, interestBearingDebt: 0,
    ...overrides,
  }
}

describe('AamBuilder — metadata', () => {
  it('has correct sheetName', () => {
    expect(AamBuilder.sheetName).toBe('AAM')
  })

  it('depends on balanceSheet + home upstream', () => {
    expect(AamBuilder.upstream).toContain('balanceSheet')
    expect(AamBuilder.upstream).toContain('home')
  })
})

describe('AamBuilder.build — labels via reverse BS_ROW_TO_AAM_D_ROW', () => {
  let wb: ExcelJS.Workbook
  beforeEach(() => {
    wb = makeWorkbook()
  })

  it('writes English label at AAM row 9 for BS cash (row 8)', () => {
    const state = makeState({
      balanceSheet: makeBsState([
        { catalogId: 'cash', excelRow: 8, section: 'current_assets' },
        { catalogId: 'account_receivable', excelRow: 10, section: 'current_assets' },
      ], 'en'),
    })

    AamBuilder.build(wb, state)
    const ws = wb.getWorksheet('AAM')!
    // BS row 8 (cash) → AAM row 9
    expect(ws.getCell('B9').value).toBe('Cash on Hands')
    // BS row 10 (AR) → AAM row 11
    expect(ws.getCell('B11').value).toBe('Account Receivable')
  })

  it('writes Indonesian label when language=id', () => {
    const state = makeState({
      balanceSheet: makeBsState([
        { catalogId: 'cash', excelRow: 8, section: 'current_assets' },
      ], 'id'),
    })

    AamBuilder.build(wb, state)
    const ws = wb.getWorksheet('AAM')!
    expect(ws.getCell('B9').value).toBe('Kas')
  })

  it('prefers customLabel', () => {
    const state = makeState({
      balanceSheet: makeBsState([
        { catalogId: 'cash', customLabel: 'Petty Cash HQ', excelRow: 8, section: 'current_assets' },
      ], 'en'),
    })

    AamBuilder.build(wb, state)
    const ws = wb.getWorksheet('AAM')!
    expect(ws.getCell('B9').value).toBe('Petty Cash HQ')
  })
})

describe('AamBuilder.build — adjustments', () => {
  it('writes per-row adjustments to col D', () => {
    const wb = makeWorkbook()
    const state = makeState({
      balanceSheet: makeBsState([
        { catalogId: 'cash', excelRow: 8, section: 'current_assets' },
      ], 'en'),
      // BS row 8 → AAM D9 per BS_ROW_TO_AAM_D_ROW
      aamAdjustments: { 8: 500_000 },
    })

    AamBuilder.build(wb, state)
    const ws = wb.getWorksheet('AAM')!
    expect(ws.getCell('D9').value).toBe(500_000)
  })

  it('no-ops when adjustments are empty', () => {
    const wb = makeWorkbook()
    const state = makeState({
      balanceSheet: makeBsState([
        { catalogId: 'cash', excelRow: 8, section: 'current_assets' },
      ]),
      aamAdjustments: {},
    })

    AamBuilder.build(wb, state)
    const ws = wb.getWorksheet('AAM')!
    // D9 should not have been written (remains whatever template had, here null)
    expect(ws.getCell('D9').value).toBeFalsy()
  })
})

// Session 042 Task 2 — AAM extended-catalog injection
//
// Users with extended BS accounts (excelRow ≥ 100 or custom ≥ 1000) need
// per-row adjustments in AAM too. We allocate synthetic AAM row ranges
// per section/IBD classification, write C/D/E, and append contribution
// to existing template subtotal + NAV + IBD formulas.
describe('AamBuilder.build — extended BS accounts (Session 042 Task 2)', () => {
  function makeAamTemplate(): ExcelJS.Workbook {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('AAM')
    // Seed representative subtotal + NAV + IBD formulas from real template
    ws.getCell('C16').value = { formula: 'SUM(C9:C14)' }
    ws.getCell('E16').value = { formula: 'SUM(E9:E14)' }
    ws.getCell('E22').value = { formula: 'SUM(E20:E21)' }
    ws.getCell('C32').value = { formula: 'SUM(C28:C31)' }
    ws.getCell('E32').value = { formula: 'SUM(E28:E31)' }
    ws.getCell('C37').value = { formula: '+C35+C36' }
    ws.getCell('E37').value = { formula: '+E35+E36' }
    ws.getCell('C47').value = { formula: 'C40+C45+C41' }
    ws.getCell('E47').value = { formula: 'E40+E45+E41+E46' }
    ws.getCell('E51').value = { formula: '+E24-(E29+E30+E31)-E36' }
    ws.getCell('E52').value = { formula: '+C28+C35' }
    return wb
  }

  it('writes label + C value + E=C+D formula for extended CA account at synthetic row', () => {
    const wb = makeAamTemplate()
    const state = makeState({
      home: makeHome(2022),
      balanceSheet: {
        accounts: [{ catalogId: 'petty_cash', excelRow: 100, section: 'current_assets' }],
        yearCount: 4,
        language: 'en',
        rows: { 100: { 2021: 123_456 } },
      },
      aamAdjustments: { 100: -10_000 },
    })

    AamBuilder.build(wb, state)
    const ws = wb.getWorksheet('AAM')!
    // CA extended range starts at row 100; first slot = row 100
    expect(ws.getCell('B100').value).toBe('petty_cash')
    expect(ws.getCell('C100').value).toBe(123_456)
    expect(ws.getCell('D100').value).toBe(-10_000)
    const e100 = ws.getCell('E100').value as { formula: string }
    expect(typeof e100).toBe('object')
    expect(e100.formula).toBe('C100+D100')
  })

  it('appends +SUM(extendedRange) to CA subtotal at row 16 when CA accounts present', () => {
    const wb = makeAamTemplate()
    const state = makeState({
      home: makeHome(2022),
      balanceSheet: {
        accounts: [{ catalogId: 'petty_cash', excelRow: 100, section: 'current_assets' }],
        yearCount: 4,
        language: 'en',
        rows: { 100: { 2021: 123_456 } },
      },
    })

    AamBuilder.build(wb, state)
    const ws = wb.getWorksheet('AAM')!
    const c16 = ws.getCell('C16').value as { formula: string }
    const e16 = ws.getCell('E16').value as { formula: string }
    expect(c16.formula).toContain('SUM(C100:C119)')
    expect(e16.formula).toContain('SUM(E100:E119)')
  })

  it('routes extended current_liabilities by IBD classification to separate ranges', () => {
    const wb = makeAamTemplate()
    const state = makeState({
      home: makeHome(2022),
      balanceSheet: {
        accounts: [
          { catalogId: 'obligasi_st', excelRow: 200, section: 'current_liabilities' },
          { catalogId: 'accrued_st', excelRow: 201, section: 'current_liabilities' },
        ],
        yearCount: 4,
        language: 'en',
        rows: {
          200: { 2021: 1_000_000 },
          201: { 2021: 50_000 },
        },
      },
      // 201 is marked non-IBD via exclusion
      interestBearingDebt: {
        excludedCurrentLiabilities: [201],
        excludedNonCurrentLiabilities: [],
      },
      aamAdjustments: {},
    })

    AamBuilder.build(wb, state)
    const ws = wb.getWorksheet('AAM')!
    // 200 (IBD) → AAM range 140-159
    expect(ws.getCell('B140').value).toBe('obligasi_st')
    expect(ws.getCell('C140').value).toBe(1_000_000)
    // 201 (non-IBD) → AAM range 160-179
    expect(ws.getCell('B160').value).toBe('accrued_st')
    expect(ws.getCell('C160').value).toBe(50_000)
    // NAV row 51 appends -SUM for non-IBD CL range only
    const e51 = ws.getCell('E51').value as { formula: string }
    expect(e51.formula).toContain('-SUM(E160:E179)')
    // IBD row 52 appends +SUM for IBD CL range only
    const e52 = ws.getCell('E52').value as { formula: string }
    expect(e52.formula).toContain('+SUM(C140:C159)')
  })

  it('extends Total Non-Current Assets (row 22 E-side) with NCA extended range', () => {
    const wb = makeAamTemplate()
    const state = makeState({
      home: makeHome(2022),
      balanceSheet: {
        accounts: [
          { catalogId: 'deferred_tax', excelRow: 160, section: 'other_non_current_assets' },
        ],
        yearCount: 4,
        language: 'en',
        rows: { 160: { 2021: 75_000 } },
      },
    })

    AamBuilder.build(wb, state)
    const ws = wb.getWorksheet('AAM')!
    // NCA extended at row 120 (first slot)
    expect(ws.getCell('B120').value).toBe('deferred_tax')
    const e22 = ws.getCell('E22').value as { formula: string }
    expect(e22.formula).toContain('SUM(E120:E139)')
  })

  it('routes extended non_current_liabilities by IBD classification for NAV + IBD formulas', () => {
    const wb = makeAamTemplate()
    const state = makeState({
      home: makeHome(2022),
      balanceSheet: {
        accounts: [
          { catalogId: 'obligasi_lt', excelRow: 220, section: 'non_current_liabilities' },
        ],
        yearCount: 4,
        language: 'en',
        rows: { 220: { 2021: 2_500_000 } },
      },
      // Not in exclusion set → IBD
      interestBearingDebt: {
        excludedCurrentLiabilities: [],
        excludedNonCurrentLiabilities: [],
      },
    })

    AamBuilder.build(wb, state)
    const ws = wb.getWorksheet('AAM')!
    // NCL IBD extended at rows 180-199
    expect(ws.getCell('B180').value).toBe('obligasi_lt')
    const e52 = ws.getCell('E52').value as { formula: string }
    expect(e52.formula).toContain('+SUM(C180:C199)')
    // Non-IBD NCL range 200-219 NOT touched
    const e51 = ws.getCell('E51').value as { formula: string }
    expect(e51.formula).not.toContain('E200:E219')
  })

  it('is a no-op when no extended accounts are present', () => {
    const wb = makeAamTemplate()
    const state = makeState({
      home: makeHome(2022),
      balanceSheet: {
        accounts: [
          { catalogId: 'cash', excelRow: 8, section: 'current_assets' },
        ],
        yearCount: 4,
        language: 'en',
        rows: { 8: { 2021: 500_000 } },
      },
    })

    AamBuilder.build(wb, state)
    const ws = wb.getWorksheet('AAM')!
    // Subtotal + NAV + IBD formulas preserved verbatim
    const c16 = ws.getCell('C16').value as { formula: string }
    expect(c16.formula).toBe('SUM(C9:C14)')
    const e51 = ws.getCell('E51').value as { formula: string }
    expect(e51.formula).toBe('+E24-(E29+E30+E31)-E36')
  })

  it('extends Equity subtotal at row 47 when equity extended accounts present', () => {
    const wb = makeAamTemplate()
    const state = makeState({
      home: makeHome(2022),
      balanceSheet: {
        accounts: [
          { catalogId: 'agio', excelRow: 300, section: 'equity' },
        ],
        yearCount: 4,
        language: 'en',
        rows: { 300: { 2021: 100_000 } },
      },
    })

    AamBuilder.build(wb, state)
    const ws = wb.getWorksheet('AAM')!
    expect(ws.getCell('B220').value).toBe('agio')
    const c47 = ws.getCell('C47').value as { formula: string }
    const e47 = ws.getCell('E47').value as { formula: string }
    expect(c47.formula).toContain('SUM(C220:C239)')
    expect(e47.formula).toContain('SUM(E220:E239)')
  })

  it('writes label using resolveLabel (customLabel > catalog > id)', () => {
    const wb = makeAamTemplate()
    const state = makeState({
      home: makeHome(2022),
      balanceSheet: {
        accounts: [
          { catalogId: 'petty_cash', customLabel: 'Petty Cash HQ', excelRow: 100, section: 'current_assets' },
        ],
        yearCount: 4,
        language: 'en',
        rows: {},
      },
    })

    AamBuilder.build(wb, state)
    const ws = wb.getWorksheet('AAM')!
    expect(ws.getCell('B100').value).toBe('Petty Cash HQ')
  })
})

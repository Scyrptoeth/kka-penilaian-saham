import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { clearSheetCompletely } from '@/lib/export/sheet-utils'
import { isPopulated } from '@/lib/export/sheet-builders/populated'
import type { ExportableState } from '@/lib/export/export-xlsx'

function createEmptyState(): ExportableState {
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
    borrowingCapInput: null,
    aamAdjustments: {},
    nilaiPengalihanDilaporkan: 0,
  }
}

describe('clearSheetCompletely', () => {
  it('clears cell values', () => {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('TEST')
    ws.getCell('A1').value = 'hello'
    ws.getCell('B2').value = 42

    clearSheetCompletely(ws)

    expect(ws.getCell('A1').value).toBeNull()
    expect(ws.getCell('B2').value).toBeNull()
  })

  it('clears cell formulas', () => {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('TEST')
    ws.getCell('A1').value = 1
    ws.getCell('A2').value = 2
    ws.getCell('A3').value = { formula: '=A1+A2', result: 3 }

    clearSheetCompletely(ws)

    expect(ws.getCell('A3').value).toBeNull()
  })

  it('clears merges', () => {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('TEST')
    ws.getCell('A1').value = 'merged'
    ws.mergeCells('A1:B2')
    expect((ws.model.merges ?? []).length).toBeGreaterThan(0)

    clearSheetCompletely(ws)

    expect(ws.model.merges ?? []).toEqual([])
  })

  it('clears conditional formatting', () => {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('TEST')
    ws.conditionalFormattings.push({
      ref: 'A1:A10',
      rules: [
        {
          type: 'cellIs',
          operator: 'greaterThan',
          formulae: ['0'],
          priority: 1,
        } as unknown as ExcelJS.ConditionalFormattingRule,
      ],
    })
    expect(ws.conditionalFormattings.length).toBeGreaterThan(0)

    clearSheetCompletely(ws)

    expect(ws.conditionalFormattings).toEqual([])
  })

  it('clears tables', () => {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('TEST')
    ws.addTable({
      name: 'T1',
      ref: 'A1',
      columns: [{ name: 'Col1', filterButton: false }],
      rows: [[1], [2], [3]],
    })
    expect(ws.getTables().length).toBe(1)

    clearSheetCompletely(ws)

    expect(ws.getTables()).toEqual([])
  })

  it('preserves sheet name', () => {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('BALANCE SHEET')
    ws.getCell('A1').value = 'x'

    clearSheetCompletely(ws)

    expect(ws.name).toBe('BALANCE SHEET')
    // And sheet is still findable via workbook API
    expect(wb.getWorksheet('BALANCE SHEET')).toBe(ws)
  })
})

describe('isPopulated', () => {
  it('returns true when all slices populated', () => {
    const state = createEmptyState()
    state.home = { namaPerusahaan: 'x' } as unknown as ExportableState['home']
    state.balanceSheet = { rows: {} } as unknown as ExportableState['balanceSheet']

    expect(isPopulated(['home', 'balanceSheet'], state)).toBe(true)
  })

  it('returns false when any slice null', () => {
    const state = createEmptyState()
    state.home = { namaPerusahaan: 'x' } as unknown as ExportableState['home']
    // balanceSheet stays null

    expect(isPopulated(['home', 'balanceSheet'], state)).toBe(false)
  })

  it('treats empty aamAdjustments as unpopulated', () => {
    const state = createEmptyState()
    // aamAdjustments = {} by default

    expect(isPopulated(['aamAdjustments'], state)).toBe(false)
  })

  it('treats non-empty aamAdjustments as populated', () => {
    const state = createEmptyState()
    state.aamAdjustments = { 8: 1_000_000 }

    expect(isPopulated(['aamAdjustments'], state)).toBe(true)
  })

  it('returns true for empty upstream array', () => {
    const state = createEmptyState()
    expect(isPopulated([], state)).toBe(true)
  })

  it('combines aamAdjustments with other slices', () => {
    const state = createEmptyState()
    state.home = { namaPerusahaan: 'x' } as unknown as ExportableState['home']
    state.balanceSheet = { rows: {} } as unknown as ExportableState['balanceSheet']
    state.aamAdjustments = { 8: 100 }

    expect(isPopulated(['home', 'balanceSheet', 'aamAdjustments'], state)).toBe(true)

    state.aamAdjustments = {}
    expect(isPopulated(['home', 'balanceSheet', 'aamAdjustments'], state)).toBe(false)
  })
})

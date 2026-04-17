import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { clearSheetCompletely, flattenSharedFormulas } from '@/lib/export/sheet-utils'
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

describe('flattenSharedFormulas', () => {
  it('replaces shared-formula master with cached result as plain value', async () => {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('TEST')
    ws.getCell('A1').value = 10
    ws.getCell('B1').value = 20
    // Simulate a shared formula master spanning A2:C2
    ws.getCell('A2').value = {
      formula: 'A1+B1',
      result: 30,
      ref: 'A2:C2',
      shareType: 'shared',
    } as ExcelJS.CellValue

    flattenSharedFormulas(ws)

    expect(ws.getCell('A2').value).toBe(30)
  })

  it('replaces shared-formula clones with their cached result', async () => {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('TEST')
    ws.getCell('A1').value = {
      formula: 'B1+C1',
      result: 42,
      ref: 'A1:D1',
      shareType: 'shared',
    } as ExcelJS.CellValue
    // Clone at C1 — clone.model.result typically carries cached eval
    const clone = ws.getCell('C1')
    clone.value = { sharedFormula: 'A1' } as ExcelJS.CellValue
    // Force a known cached result on the clone's model shape (as openpyxl/ExcelJS does)
    ;(clone.model as unknown as { result: unknown }).result = 99

    flattenSharedFormulas(ws)

    expect(ws.getCell('A1').value).toBe(42)
    expect(ws.getCell('C1').value).toBe(99)
  })

  it('leaves non-shared formulas untouched', async () => {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('TEST')
    ws.getCell('A1').value = { formula: 'B1+1', result: 5 } as ExcelJS.CellValue
    ws.getCell('B1').value = 4

    flattenSharedFormulas(ws)

    const after = ws.getCell('A1').value as { formula: string; result: number }
    expect(after).toMatchObject({ formula: 'B1+1', result: 5 })
  })

  it('nulls error-valued shared cells (#REF! / error objects)', async () => {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('TEST')
    ws.getCell('A1').value = {
      formula: 'B1/C1',
      result: '#DIV/0!',
      ref: 'A1:A2',
      shareType: 'shared',
    } as ExcelJS.CellValue

    flattenSharedFormulas(ws)

    expect(ws.getCell('A1').value).toBeNull()
  })

  it('is a no-op on a sheet with no shared formulas', async () => {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('TEST')
    ws.getCell('A1').value = 1
    ws.getCell('A2').value = 'label'
    ws.getCell('A3').value = { formula: 'A1+1', result: 2 } as ExcelJS.CellValue

    flattenSharedFormulas(ws)

    expect(ws.getCell('A1').value).toBe(1)
    expect(ws.getCell('A2').value).toBe('label')
    expect((ws.getCell('A3').value as { formula: string }).formula).toBe('A1+1')
  })

  it('enables safe overwrite of cell that was a shared-formula master', async () => {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('TEST')
    ws.getCell('F9').value = {
      formula: 'F7+F8',
      result: -100,
      ref: 'F9:K9',
      shareType: 'shared',
    } as ExcelJS.CellValue
    ws.getCell('H9').value = { sharedFormula: 'F9' } as ExcelJS.CellValue

    flattenSharedFormulas(ws)
    // After flatten, both cells are plain — overwriting master is safe
    ws.getCell('F9').value = 42

    const buf = await wb.xlsx.writeBuffer()
    const wb2 = new ExcelJS.Workbook()
    await wb2.xlsx.load(buf as ArrayBuffer)
    expect(wb2.getWorksheet('TEST')?.getCell('F9').value).toBe(42)
  })
})

import { describe, expect, it, vi } from 'vitest'
import ExcelJS from 'exceljs'
import { runSheetBuilders, SHEET_BUILDERS } from '@/lib/export/sheet-builders/registry'
import type { SheetBuilder } from '@/lib/export/sheet-builders/types'
import type { ExportableState } from '@/lib/export/export-xlsx'

function createEmptyState(): ExportableState {
  return {
    home: null,
    balanceSheet: null,
    incomeStatement: null,
    fixedAsset: null,
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

function createWorkbookWithSheet(name: string): {
  wb: ExcelJS.Workbook
  ws: ExcelJS.Worksheet
} {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(name)
  ws.getCell('A1').value = 'prototipe'
  return { wb, ws }
}

describe('runSheetBuilders', () => {
  it('does nothing when SHEET_BUILDERS is empty (migration checkpoint)', () => {
    // This test pins behavior while builders are being migrated in T3-T7.
    // Real assertion: the exported orchestrator must not touch sheets it
    // doesn't know about yet — legacy pipeline still owns them.
    const { wb, ws } = createWorkbookWithSheet('UNKNOWN SHEET')
    const state = createEmptyState()

    runSheetBuilders(wb, state)

    expect(ws.getCell('A1').value).toBe('prototipe')
  })

  it('calls build() when upstream is populated', () => {
    const { wb, ws } = createWorkbookWithSheet('TEST SHEET')
    const state = createEmptyState()
    state.home = { namaPerusahaan: 'x' } as unknown as ExportableState['home']

    const buildSpy = vi.fn()
    const builder: SheetBuilder = {
      sheetName: 'TEST SHEET',
      upstream: ['home'],
      build: buildSpy,
    }

    runWithRegistry([builder], () => runSheetBuilders(wb, state))

    expect(buildSpy).toHaveBeenCalledTimes(1)
    expect(buildSpy).toHaveBeenCalledWith(wb, state)
    // build() was called → sheet content is the builder's concern, not cleared
    expect(ws.getCell('A1').value).toBe('prototipe')
  })

  it('clears sheet when upstream has null slice', () => {
    const { wb, ws } = createWorkbookWithSheet('TEST SHEET')
    ws.mergeCells('A1:B2')
    const state = createEmptyState()
    // home stays null

    const buildSpy = vi.fn()
    const builder: SheetBuilder = {
      sheetName: 'TEST SHEET',
      upstream: ['home'],
      build: buildSpy,
    }

    runWithRegistry([builder], () => runSheetBuilders(wb, state))

    expect(buildSpy).not.toHaveBeenCalled()
    expect(ws.getCell('A1').value).toBeNull()
    expect(ws.model.merges ?? []).toEqual([])
  })

  it('skips builder when its target sheet is missing from workbook', () => {
    const wb = new ExcelJS.Workbook()
    wb.addWorksheet('OTHER')
    const state = createEmptyState()
    state.home = { namaPerusahaan: 'x' } as unknown as ExportableState['home']

    const buildSpy = vi.fn()
    const builder: SheetBuilder = {
      sheetName: 'MISSING SHEET',
      upstream: ['home'],
      build: buildSpy,
    }

    runWithRegistry([builder], () => runSheetBuilders(wb, state))

    expect(buildSpy).not.toHaveBeenCalled()
  })
})

describe('SHEET_BUILDERS registry state', () => {
  it('is readonly at the type level (frozen array is acceptable)', () => {
    // Runtime sanity: array exists. Type is readonly via declaration.
    expect(Array.isArray(SHEET_BUILDERS)).toBe(true)
  })
})

describe('formula reactivity probe (documents ExcelJS behavior)', () => {
  it('preserves cross-sheet formula through clear + repopulate', async () => {
    // Smoke test: two sheets, SRC populated with raw values, TGT has a
    // cross-sheet formula pointing at SRC. Confirm that nulling SRC then
    // writing new values leaves the TGT formula intact — essential
    // invariant for T8 (cross-sheet cleanup).
    const wb = new ExcelJS.Workbook()
    const src = wb.addWorksheet('SRC')
    const tgt = wb.addWorksheet('TGT')
    src.getCell('A1').value = 100
    tgt.getCell('A1').value = { formula: "='SRC'!A1", result: 100 }

    // Null SRC cell, then rewrite. TGT formula must stay as a formula
    // (not be evaluated eagerly at clear time).
    src.getCell('A1').value = null
    src.getCell('A1').value = 200

    const tgtValue = tgt.getCell('A1').value as { formula: string } | null
    expect(tgtValue).not.toBeNull()
    expect(tgtValue?.formula).toBe("='SRC'!A1")
  })
})

// Helper: temporarily swap SHEET_BUILDERS contents for a test block.
// Since the export is readonly at type level only, we mutate the backing
// array reference via a Reflect trick. This is test-only scaffolding.
function runWithRegistry(builders: SheetBuilder[], fn: () => void): void {
  const target = SHEET_BUILDERS as unknown as SheetBuilder[]
  const saved = [...target]
  target.length = 0
  target.push(...builders)
  try {
    fn()
  } finally {
    target.length = 0
    target.push(...saved)
  }
}

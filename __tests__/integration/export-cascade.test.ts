/**
 * Cascade integration test — verifies that when every store slice is
 * null/empty, the state-driven SheetBuilders clear their target sheets
 * to blank shells via `clearSheetCompletely`. Non-migrated sheets stay
 * untouched because the legacy pipeline is not invoked here.
 *
 * Coverage grows with each session:
 *   - Session 031 (5 sheets): BS, IS, FA, AAM, SIMULASI POTENSI (AAM)
 *   - Session 032 (+8 sheets): HOME, KEY DRIVERS, ACC PAYABLES, DLOM,
 *     DLOC(PFC), WACC, DISCOUNT RATE, BORROWING CAP
 *   - Session 033 (+7 sheets): NOPLAT, CASH FLOW STATEMENT, FCF, ROIC,
 *     GROWTH REVENUE, GROWTH RATE, FINANCIAL RATIO
 *
 * Further migrations (Sessions 034+) will extend `MIGRATED_SHEETS`
 * with projection builders, valuation/dashboard builders, etc.
 */

import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { runSheetBuilders } from '@/lib/export/sheet-builders/registry'
import type { ExportableState } from '@/lib/export/export-xlsx'

const TEMPLATE_PATH = resolve(__dirname, '../../public/templates/kka-template.xlsx')

const MIGRATED_SHEETS = [
  // Session 031
  'BALANCE SHEET',
  'INCOME STATEMENT',
  'FIXED ASSET',
  'AAM',
  'SIMULASI POTENSI (AAM)',
  // Session 032
  'HOME',
  'KEY DRIVERS',
  'ACC PAYABLES',
  'DLOM',
  'DLOC(PFC)',
  'WACC',
  'DISCOUNT RATE',
  'BORROWING CAP',
  // Session 033
  'NOPLAT',
  'CASH FLOW STATEMENT',
  'FCF',
  'ROIC',
  'GROWTH REVENUE',
  'GROWTH RATE',
  'FINANCIAL RATIO',
  // Session 034
  'PROY LR',
  'PROY FIXED ASSETS',
  'PROY BALANCE SHEET',
  'PROY NOPLAT',
  'PROY CASH FLOW STATEMENT',
  'DCF',
  'EEM',
  'CFI',
] as const

function makeEmptyState(): ExportableState {
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

async function loadTemplate(): Promise<ExcelJS.Workbook> {
  const buffer = readFileSync(TEMPLATE_PATH)
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer)
  return wb
}

describe('Export cascade — all-null state', () => {
  it('migrated sheets have SOME prototipe content BEFORE runSheetBuilders', async () => {
    const wb = await loadTemplate()
    // Sanity: template ships with SOME content on each migrated sheet —
    // at minimum a header/title row or a value cell. Exact addresses
    // vary per sheet, so scan the first ~20 rows for any truthy cell.
    const sampleFirstTruthyCell = (sheetName: string): boolean => {
      const ws = wb.getWorksheet(sheetName)
      if (!ws) return false
      for (let r = 1; r <= 25; r++) {
        for (const c of ['A', 'B', 'C', 'D', 'E']) {
          const v = ws.getCell(`${c}${r}`).value
          if (v !== null && v !== undefined && v !== '') return true
        }
      }
      return false
    }

    for (const name of MIGRATED_SHEETS) {
      expect(sampleFirstTruthyCell(name), `${name} template starts non-empty`).toBe(true)
    }
  })

  it('clears migrated sheets to blank shells when every upstream slice is null', async () => {
    const wb = await loadTemplate()
    const state = makeEmptyState()

    runSheetBuilders(wb, state)

    for (const name of MIGRATED_SHEETS) {
      const ws = wb.getWorksheet(name)
      expect(ws, `worksheet ${name} should exist`).toBeDefined()

      // Sample several cells that are known to carry prototipe content in
      // the template. After clearSheetCompletely they must all be null.
      const samplePositions = ['B8', 'D8', 'C8', 'B100', 'F6', 'B6']
      for (const addr of samplePositions) {
        const cell = ws!.getCell(addr)
        expect(
          cell.value,
          `${name}!${addr} should be null after clearSheetCompletely`,
        ).toBeNull()
      }

      // Sheet name preserved — workbook.getWorksheet still returns it
      expect(ws!.name).toBe(name)
    }
  })

  it('leaves non-migrated sheets UNTOUCHED during runSheetBuilders only', async () => {
    const wb = await loadTemplate()
    const state = makeEmptyState()

    // Snapshot a non-migrated sheet's cell BEFORE
    const dcf = wb.getWorksheet('DCF')!
    const dcfBeforeB5 = dcf.getCell('B5').value

    runSheetBuilders(wb, state)

    // Still the same — runSheetBuilders only touches registered sheets
    expect(dcf.getCell('B5').value).toEqual(dcfBeforeB5)
  })
})

import { describe, expect, it, beforeEach } from 'vitest'
import ExcelJS from 'exceljs'
import { writeComputedRowsToSheet } from '@/lib/export/sheet-builders/computed-writer'
import type { SheetManifest } from '@/data/manifests/types'
import type { YearKeyedSeries } from '@/types/financial'

const MOCK_MANIFEST: SheetManifest = {
  title: 'Mock',
  slug: 'noplat',
  years: [2019, 2020, 2021],
  columns: { 2019: 'C', 2020: 'D', 2021: 'E' },
  rows: [
    { label: 'HEADER A', type: 'header' },
    { excelRow: 6, label: 'Row 6 — data' },
    { excelRow: 7, label: 'Row 7 — data' },
    { label: '', type: 'separator' },
    { excelRow: 10, label: 'Row 10 — subtotal', type: 'subtotal', computedFrom: [6, 7] },
  ],
}

function makeWorkbook(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('MOCK')
  // Seed prototipe values we expect to be overwritten
  ws.getCell('C6').value = 999
  ws.getCell('D6').value = 999
  ws.getCell('E6').value = 999
  ws.getCell('C7').value = 999
  ws.getCell('D7').value = 999
  ws.getCell('E7').value = 999
  ws.getCell('C10').value = 999
  ws.getCell('D10').value = 999
  ws.getCell('E10').value = 999
  return wb
}

function makeRows(): Record<number, YearKeyedSeries> {
  return {
    6: { 2019: 100, 2020: 200, 2021: 300 },
    7: { 2019: 10, 2020: 20, 2021: 30 },
    10: { 2019: 110, 2020: 220, 2021: 330 },
  }
}

describe('writeComputedRowsToSheet', () => {
  let wb: ExcelJS.Workbook
  let ws: ExcelJS.Worksheet

  beforeEach(() => {
    wb = makeWorkbook()
    ws = wb.getWorksheet('MOCK')!
  })

  it('writes values at <col><excelRow> for each manifest row with data', () => {
    writeComputedRowsToSheet(ws, MOCK_MANIFEST, makeRows(), [2019, 2020, 2021])
    expect(ws.getCell('C6').value).toBe(100)
    expect(ws.getCell('D6').value).toBe(200)
    expect(ws.getCell('E6').value).toBe(300)
    expect(ws.getCell('C7').value).toBe(10)
    expect(ws.getCell('D7').value).toBe(20)
    expect(ws.getCell('E7').value).toBe(30)
    expect(ws.getCell('C10').value).toBe(110)
    expect(ws.getCell('D10').value).toBe(220)
    expect(ws.getCell('E10').value).toBe(330)
  })

  it('skips rows without excelRow (headers/separators)', () => {
    const beforeA1 = ws.getCell('A1').value
    writeComputedRowsToSheet(ws, MOCK_MANIFEST, makeRows(), [2019, 2020, 2021])
    // Headers + separators have no excelRow → should not accidentally write
    // anywhere outside the declared row numbers. Spot-check A1 unchanged.
    expect(ws.getCell('A1').value).toBe(beforeA1)
  })

  it('skips year entries where allRows[row][year] is null or undefined', () => {
    const sparseRows: Record<number, YearKeyedSeries> = {
      6: { 2019: 100, 2021: 300 }, // no 2020
      7: { 2019: 10, 2020: 20, 2021: 30 },
    }
    writeComputedRowsToSheet(ws, MOCK_MANIFEST, sparseRows, [2019, 2020, 2021])
    expect(ws.getCell('C6').value).toBe(100)
    // 2020 missing → cell left as originally seeded (999) because helper skips
    expect(ws.getCell('D6').value).toBe(999)
    expect(ws.getCell('E6').value).toBe(300)
  })

  it('idempotent — repeated calls produce identical output', () => {
    writeComputedRowsToSheet(ws, MOCK_MANIFEST, makeRows(), [2019, 2020, 2021])
    const first = ws.getCell('C6').value
    writeComputedRowsToSheet(ws, MOCK_MANIFEST, makeRows(), [2019, 2020, 2021])
    expect(ws.getCell('C6').value).toBe(first)
  })

  it('missing row data — no throw, cells left unchanged', () => {
    const empty: Record<number, YearKeyedSeries> = {}
    expect(() =>
      writeComputedRowsToSheet(ws, MOCK_MANIFEST, empty, [2019, 2020, 2021]),
    ).not.toThrow()
    expect(ws.getCell('C6').value).toBe(999)
  })
})

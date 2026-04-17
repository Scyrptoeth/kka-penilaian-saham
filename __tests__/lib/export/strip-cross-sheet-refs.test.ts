import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { stripCrossSheetRefsToBlankSheets } from '@/lib/export/export-xlsx'

/**
 * Partial-data export guard. When a SheetBuilder decides to clear its
 * sheet (upstream slice not populated), any formula in OTHER populated
 * sheets that still references the cleared sheet becomes a dangling
 * reference — Excel would render #REF! or stale cached values. This
 * helper strips those formulas, replacing them with their cached
 * values (pattern mirrors sanitizeDanglingFormulas).
 */
describe('stripCrossSheetRefsToBlankSheets', () => {
  it('strips quoted cross-sheet ref to blanked sheet, replaces with cached result', async () => {
    const wb = new ExcelJS.Workbook()
    const pop = wb.addWorksheet('POPULATED')
    wb.addWorksheet('BLANK SHEET')

    pop.getCell('A1').value = {
      formula: `'BLANK SHEET'!A1`,
      result: 42,
    } as ExcelJS.CellValue

    stripCrossSheetRefsToBlankSheets(wb, ['BLANK SHEET'])

    const after = pop.getCell('A1').value
    expect(after).toBe(42)
  })

  it('strips unquoted cross-sheet ref (single-word sheet name)', async () => {
    const wb = new ExcelJS.Workbook()
    const pop = wb.addWorksheet('POPULATED')
    wb.addWorksheet('HOME')

    pop.getCell('A1').value = {
      formula: `HOME!B4`,
      result: 'PT Raja Voltama',
    } as ExcelJS.CellValue

    stripCrossSheetRefsToBlankSheets(wb, ['HOME'])

    const after = pop.getCell('A1').value
    expect(after).toBe('PT Raja Voltama')
  })

  it('leaves formulas pointing to populated sheets untouched', async () => {
    const wb = new ExcelJS.Workbook()
    const pop = wb.addWorksheet('POPULATED')
    wb.addWorksheet('BLANK SHEET')
    wb.addWorksheet('ALSO POPULATED')

    pop.getCell('A1').value = {
      formula: `'ALSO POPULATED'!A1`,
      result: 99,
    } as ExcelJS.CellValue

    stripCrossSheetRefsToBlankSheets(wb, ['BLANK SHEET'])

    const after = pop.getCell('A1').value as { formula: string; result: number }
    expect(after).toMatchObject({ formula: `'ALSO POPULATED'!A1`, result: 99 })
  })

  it('is a no-op when clearedSheets is empty', async () => {
    const wb = new ExcelJS.Workbook()
    const pop = wb.addWorksheet('POPULATED')
    wb.addWorksheet('BLANK SHEET')

    pop.getCell('A1').value = {
      formula: `'BLANK SHEET'!A1`,
      result: 42,
    } as ExcelJS.CellValue

    stripCrossSheetRefsToBlankSheets(wb, [])

    const after = pop.getCell('A1').value as { formula: string; result: number }
    expect(after).toMatchObject({ formula: `'BLANK SHEET'!A1`, result: 42 })
  })

  it('replaces #REF! cached error with null (safe fallback)', async () => {
    const wb = new ExcelJS.Workbook()
    const pop = wb.addWorksheet('POPULATED')
    wb.addWorksheet('BLANK SHEET')

    pop.getCell('A1').value = {
      formula: `'BLANK SHEET'!A1`,
      result: '#REF!',
    } as ExcelJS.CellValue

    stripCrossSheetRefsToBlankSheets(wb, ['BLANK SHEET'])

    const after = pop.getCell('A1').value
    expect(after).toBeNull()
  })

  it('handles multiple clearedSheets simultaneously', async () => {
    const wb = new ExcelJS.Workbook()
    const pop = wb.addWorksheet('POPULATED')
    wb.addWorksheet('BLANK A')
    wb.addWorksheet('BLANK B')

    pop.getCell('A1').value = {
      formula: `'BLANK A'!A1+'BLANK B'!B2`,
      result: 7,
    } as ExcelJS.CellValue
    pop.getCell('A2').value = {
      formula: `'BLANK A'!C3`,
      result: 13,
    } as ExcelJS.CellValue

    stripCrossSheetRefsToBlankSheets(wb, ['BLANK A', 'BLANK B'])

    expect(pop.getCell('A1').value).toBe(7)
    expect(pop.getCell('A2').value).toBe(13)
  })

  it('does not match partial sheet-name overlaps (word-boundary safety)', async () => {
    const wb = new ExcelJS.Workbook()
    const pop = wb.addWorksheet('POPULATED')
    wb.addWorksheet('AAM')
    wb.addWorksheet('SIMULASI POTENSI (AAM)')

    // Formula references SIMULASI POTENSI (AAM) — should NOT be stripped
    // when only AAM is cleared (no quote match + AAM doesn't appear standalone)
    pop.getCell('A1').value = {
      formula: `'SIMULASI POTENSI (AAM)'!E11`,
      result: 1000,
    } as ExcelJS.CellValue

    stripCrossSheetRefsToBlankSheets(wb, ['AAM'])

    const after = pop.getCell('A1').value as { formula: string; result: number }
    expect(after).toMatchObject({
      formula: `'SIMULASI POTENSI (AAM)'!E11`,
      result: 1000,
    })
  })

  it('survives round-trip through writeBuffer + load', async () => {
    const wb = new ExcelJS.Workbook()
    const pop = wb.addWorksheet('POPULATED')
    wb.addWorksheet('BLANK SHEET')

    pop.getCell('A1').value = {
      formula: `'BLANK SHEET'!A1`,
      result: 42,
    } as ExcelJS.CellValue

    stripCrossSheetRefsToBlankSheets(wb, ['BLANK SHEET'])

    const buf = await wb.xlsx.writeBuffer()
    const wb2 = new ExcelJS.Workbook()
    await wb2.xlsx.load(buf as ArrayBuffer)
    const popAfter = wb2.getWorksheet('POPULATED')!
    expect(popAfter.getCell('A1').value).toBe(42)
  })
})

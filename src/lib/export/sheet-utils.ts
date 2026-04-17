import type ExcelJS from 'exceljs'

/**
 * Clear a worksheet to a blank shell while preserving its sheet name so
 * workbook.getWorksheet(name) still returns the same object. Used when a
 * sheet's upstream store slices are null — the user has not opened the
 * corresponding editor on the website, so the exported sheet must appear
 * empty (no prototipe PT Raja Voltama leakage).
 *
 * Drops:
 *   - Cell values and formulas (all rows/cols reset to null)
 *   - Merges
 *   - Images (logo, charts)
 *   - Conditional formatting rules
 *   - Tables (structured tables)
 *   - Sheet views (freeze panes, zoom, tab selection state)
 *   - Print area
 */
export function clearSheetCompletely(sheet: ExcelJS.Worksheet): void {
  // 1. Unmerge all. model.merges is a string[] like ['A1:B2', 'C3:D4'];
  //    we copy first because unMergeCells mutates the list.
  const merges = [...(sheet.model.merges ?? [])]
  for (const range of merges) {
    try {
      sheet.unMergeCells(range)
    } catch {
      // range already partially handled or invalid; ignore
    }
  }

  // 2. Null all cell values (formulas + plain values both cleared)
  sheet.eachRow({ includeEmpty: true }, (row) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.value = null
    })
  })

  // 3. Drop conditional formatting. Property exists at runtime but isn't on
  //    the public .d.ts — cast through the internal shape.
  const sheetInternal = sheet as unknown as {
    conditionalFormattings?: unknown[]
    tables?: Record<string, unknown>
    getImages?: () => Array<{ imageId: string }>
    removeImage?: (id: string) => void
  }
  if (sheetInternal.conditionalFormattings) {
    sheetInternal.conditionalFormattings = []
  }

  // 4. Remove embedded images
  if (typeof sheetInternal.getImages === 'function') {
    const images = sheetInternal.getImages() ?? []
    for (const img of images) {
      sheetInternal.removeImage?.(img.imageId)
    }
  }

  // 5. Remove structured tables (mirror stripDecorativeTables pattern)
  const tables = sheetInternal.tables
  if (tables) {
    for (const name of Object.keys(tables)) {
      try {
        sheet.removeTable(name)
      } catch {
        delete tables[name]
      }
    }
  }

  // 6. Reset views (freeze panes, selection, zoom)
  sheet.views = []

  // 7. Clear print area
  if (sheet.pageSetup) {
    sheet.pageSetup.printArea = undefined
  }
}

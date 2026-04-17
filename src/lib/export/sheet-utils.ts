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

/**
 * Flatten every shared-formula cell on a sheet into a plain-value cell.
 * Replaces both masters (`shareType: 'shared'` + `ref: 'A1:B4'`) and their
 * clones (`sharedFormula: '<masterAddr>'`) with their cached `result`
 * (from `cell.value.result` or `cell.model.result`).
 *
 * Why this exists: many builders overwrite specific cells (e.g. CfiBuilder
 * writes F9). When a target cell is a shared-formula MASTER spanning F9:K9,
 * overwriting the master orphans every clone — ExcelJS then rejects the
 * workbook at `writeBuffer` time with "Shared Formula master must exist
 * above and or left of clone for cell <addr>".
 *
 * Flattening before `builder.build()` neutralizes the shared structure
 * while preserving the last-computed values. Phase C state-parity stays
 * intact because `snapshot.value` resolves shared masters and clones to
 * the same cached result on both template and exported workbooks.
 *
 * Error-shaped cached values (`{error: '#DIV/0!'}` objects, `#REF!`
 * strings) degrade to `null` — matches `sanitizeDanglingFormulas` safety.
 */
export function flattenSharedFormulas(sheet: ExcelJS.Worksheet): void {
  interface FlattenTarget {
    cell: ExcelJS.Cell
    cachedValue: number | string | null
  }
  const targets: FlattenTarget[] = []

  sheet.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      const v = cell.value as unknown
      if (!v || typeof v !== 'object') return
      const hasShareType =
        'shareType' in (v as Record<string, unknown>) &&
        (v as { shareType?: string }).shareType === 'shared'
      const hasSharedFormula = 'sharedFormula' in (v as Record<string, unknown>)
      if (!hasShareType && !hasSharedFormula) return

      // Prefer cell.value.result; fall back to cell.model.result for clones
      // whose value object doesn't carry the cached evaluation.
      const vResult = (v as { result?: unknown }).result
      let cached: unknown = vResult
      if (cached === undefined) {
        const model = cell.model as unknown as { result?: unknown }
        cached = model?.result
      }
      const safe: number | string | null =
        typeof cached === 'number' || typeof cached === 'string'
          ? cached
          : null
      // Reject error-string cached results (#REF! etc.)
      const isErrorString =
        typeof safe === 'string' && /^#[A-Z!\/0-9?]+$/.test(safe)
      targets.push({ cell, cachedValue: isErrorString ? null : safe })
    })
  })

  for (const { cell, cachedValue } of targets) {
    cell.value = cachedValue
  }
}

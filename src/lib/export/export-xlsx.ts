/**
 * Template-based Excel export — clone the source workbook, clear prototype
 * input cells, inject user data from Zustand store, and generate a
 * downloadable .xlsx Blob.  All 3,084 formulas remain intact.
 *
 * Uses ExcelJS (MIT, 0 known vulns — LESSON-003).
 */

import ExcelJS from 'exceljs'
import type { HomeInputs } from '@/types'
import type {
  BalanceSheetInputState,
  IncomeStatementInputState,
  FixedAssetInputState,
} from '@/data/live/types'
import type {
  WaccState,
  DiscountRateState,
  KeyDriversState,
  DlomState,
  DlocState,
  BorrowingCapInputState,
} from '@/lib/store/useKkaStore'
import {
  ALL_SCALAR_MAPPINGS,
  ALL_GRID_MAPPINGS,
  ALL_ARRAY_MAPPINGS,
  ALL_DYNAMIC_ROWS_MAPPINGS,
  DLOM_ANSWER_ROWS,
  DLOC_ANSWER_ROWS,
  BS_ROW_TO_AAM_D_ROW,
  offsetCol,
  type ScalarCellMapping,
} from './cell-mapping'
import {
  BS_CATALOG_ALL,
  type BsSection,
} from '@/data/catalogs/balance-sheet-catalog'

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** State shape expected by the export function — mirrors Zustand store slices. */
export interface ExportableState {
  home: HomeInputs | null
  balanceSheet: BalanceSheetInputState | null
  incomeStatement: IncomeStatementInputState | null
  fixedAsset: FixedAssetInputState | null
  wacc: WaccState | null
  discountRate: DiscountRateState | null
  keyDrivers: KeyDriversState | null
  dlom: DlomState | null
  dloc: DlocState | null
  borrowingCapInput: BorrowingCapInputState | null
  aamAdjustments: Record<number, number>
  nilaiPengalihanDilaporkan: number
}

/**
 * Export the user's data to an .xlsx file based on the source template.
 * Returns a Blob ready for download.
 */
export async function exportToXlsx(state: ExportableState): Promise<Blob> {
  // 1. Fetch template
  const response = await fetch('/templates/kka-template.xlsx')
  if (!response.ok) throw new Error(`Failed to load template: ${response.status}`)
  const buffer = await response.arrayBuffer()

  // 2. Load workbook
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  // 3. Clear all input cells (remove prototype PT Raja Voltama data)
  clearAllInputCells(workbook)

  // 4. Inject user data
  injectScalarCells(workbook, state)
  injectGridCells(workbook, state)
  injectArrayCells(workbook, state)
  injectDynamicRows(workbook, state)
  injectDlomAnswers(workbook, state)
  injectDlocAnswers(workbook, state)
  injectDlomJenisPerusahaan(workbook, state)
  injectAamAdjustments(workbook, state)

  // 5. Inject extended BS catalog accounts as native rows + extend section
  //    subtotals. Replaces the RINCIAN NERACA detail sheet pattern (Session 025).
  injectExtendedBsAccounts(workbook, state)
  extendBsSectionSubtotals(workbook, state)

  // 6. Apply website-nav 1:1 sheet visibility (Session 024 audit decision)
  applySheetVisibility(workbook)

  // 7. Strip dangling formulas the template inherited from its prior Excel
  //    life (external-workbook refs like `'[3]BALANCE SHEET'!A3` and stale
  //    `#REF!`). ExcelJS drops the externalLinks/ parts on round-trip but
  //    leaves the formula strings behind — Excel then shows the repair
  //    dialog on open. Replace with the cached last-known value.
  sanitizeDanglingFormulas(workbook)

  // 8. Generate output
  const outBuffer = await workbook.xlsx.writeBuffer()
  return new Blob([outBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.xlsx',
  })
}

/**
 * Trigger a browser download of the exported Blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  // Cleanup after a short delay to allow download to start
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 100)
}

/**
 * Build a timestamped filename for the export.
 */
export function buildExportFilename(namaPerusahaan: string): string {
  const date = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const sanitized = namaPerusahaan.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '-')
  return `KKA-${sanitized}-${date}.xlsx`
}

// ---------------------------------------------------------------------------
// Internal: Sheet visibility (website nav 1:1)
// ---------------------------------------------------------------------------

/**
 * Sheets that map to a website nav item and MUST be visible in export.
 * Mirrors `src/components/layout/nav-tree.ts` (29 items as of Session 024).
 */
const WEBSITE_NAV_SHEETS: readonly string[] = [
  // Input Master
  'HOME',
  // Input Data
  'FIXED ASSET',
  'BALANCE SHEET',
  'INCOME STATEMENT',
  'KEY DRIVERS',
  'ACC PAYABLES',
  // Analisis
  'FINANCIAL RATIO',
  'FCF',
  'NOPLAT',
  'GROWTH REVENUE',
  'ROIC',
  'GROWTH RATE',
  'CASH FLOW STATEMENT',
  // Proyeksi
  'PROY LR',
  'PROY FIXED ASSETS',
  'PROY BALANCE SHEET',
  'PROY NOPLAT',
  'PROY CASH FLOW STATEMENT',
  // Penilaian
  'DLOM',
  'DLOC(PFC)',
  'WACC',
  'DISCOUNT RATE',
  'BORROWING CAP',
  'DCF',
  'AAM',
  'EEM',
  'CFI',
  'SIMULASI POTENSI (AAM)',
  // Ringkasan
  'DASHBOARD',
] as const

/**
 * Set every worksheet to `visible` if it is in WEBSITE_NAV_SHEETS, otherwise
 * `hidden`. All non-nav DJP-template helper/dataset sheets are hidden.
 */
export function applySheetVisibility(workbook: ExcelJS.Workbook): void {
  const visibleSet = new Set<string>(WEBSITE_NAV_SHEETS)

  for (const ws of workbook.worksheets) {
    ws.state = visibleSet.has(ws.name) ? 'visible' : 'hidden'
  }
}

// ---------------------------------------------------------------------------
// Internal: Dangling-formula sanitizer
// ---------------------------------------------------------------------------

/** Formulas referencing stripped external workbooks (`[N]...`) or `#REF!`. */
const DANGLING_FORMULA_RE = /\[\d+\]|#REF!/

/**
 * Replace every formula that references a dropped external workbook
 * (`'[3]BALANCE SHEET'!A3` style) or contains a stale `#REF!` with the
 * cell's cached value. Leaves live formulas untouched.
 *
 * Why: the source template (kka-template.xlsx) was historically linked to
 * other workbooks via Excel's external-link feature. ExcelJS does not
 * round-trip `xl/externalLinks/` — on save it drops those parts, but the
 * formula strings referencing `[1]..[4]` stay in the worksheet XML. Excel
 * then detects the broken links on open and surfaces the repair dialog.
 * The cached `<v>` is already present, so swapping the formula for its
 * static value is a lossless-to-the-eye transform.
 */
export function sanitizeDanglingFormulas(workbook: ExcelJS.Workbook): void {
  for (const ws of workbook.worksheets) {
    // 1. Cell formulas — strip formula, keep cached value
    ws.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        const v = cell.value as unknown
        if (!v || typeof v !== 'object') return

        // Cells storing a raw error value (t="e") with no formula — clear.
        // Excel accepts these as-is, but clearing avoids visible #REF! cells
        // on hidden dataset sheets that nobody needs.
        const errorVal = (v as { error?: unknown }).error
        const hasFormula = 'formula' in v || 'sharedFormula' in v
        if (!hasFormula && typeof errorVal === 'string' && DANGLING_FORMULA_RE.test(errorVal)) {
          cell.value = null
          return
        }

        const formula =
          'formula' in v ? (v as { formula?: unknown }).formula :
          'sharedFormula' in v ? (v as { sharedFormula?: unknown }).sharedFormula :
          undefined
        if (typeof formula !== 'string') return
        if (!DANGLING_FORMULA_RE.test(formula)) return

        // Strip the formula, keep the cached value. `result` holds the last
        // computed value for formula cells; fall back to null when absent.
        // If the cached value is itself an Excel error (string '#REF!' or
        // ExcelJS error-object `{ error: '#REF!' }`), null it — storing a
        // bare error would reintroduce "unreadable content" on open.
        const cached = (v as { result?: unknown }).result
        const isErrorString =
          typeof cached === 'string' && /^#[A-Z!\/0-9?]+$/.test(cached)
        const isErrorObject =
          !!cached &&
          typeof cached === 'object' &&
          'error' in cached &&
          typeof (cached as { error: unknown }).error === 'string'
        const safe = isErrorString || isErrorObject ? null : cached
        cell.value = (safe ?? null) as ExcelJS.CellValue
      })
    })

    // 2. Conditional-formatting rules — drop rules whose formulae reference
    //    dropped externals or #REF!. WACC!A4:A5 has exactly one such rule
    //    (`#REF!="Country"`) inherited from a now-missing table source.
    type CfRule = { formulae?: unknown }
    type Cf = { rules?: CfRule[] }
    const cfs = (ws as unknown as { conditionalFormattings?: Cf[] }).conditionalFormattings
    if (Array.isArray(cfs)) {
      for (const cf of cfs) {
        if (!Array.isArray(cf.rules)) continue
        cf.rules = cf.rules.filter((rule) => {
          const fs = rule.formulae
          if (!Array.isArray(fs)) return true
          return !fs.some((f) => typeof f === 'string' && DANGLING_FORMULA_RE.test(f))
        })
      }
      // Remove conditional-formatting entries that lost all their rules
      ;(ws as unknown as { conditionalFormattings: Cf[] }).conditionalFormattings = cfs.filter(
        (cf) => Array.isArray(cf.rules) && cf.rules.length > 0,
      )
    }
  }
}

// ---------------------------------------------------------------------------
// Internal: Clear
// ---------------------------------------------------------------------------

function clearAllInputCells(workbook: ExcelJS.Workbook): void {
  // Clear scalar cells
  for (const m of ALL_SCALAR_MAPPINGS) {
    const ws = workbook.getWorksheet(m.excelSheet)
    if (ws) ws.getCell(m.excelCell).value = null
  }

  // Clear grid cells
  for (const g of ALL_GRID_MAPPINGS) {
    const ws = workbook.getWorksheet(g.excelSheet)
    if (!ws) continue
    for (const row of g.leafRows) {
      for (const col of Object.values(g.yearColumns)) {
        ws.getCell(`${col}${row}`).value = null
      }
    }
  }

  // Clear array cells
  for (const a of ALL_ARRAY_MAPPINGS) {
    const ws = workbook.getWorksheet(a.excelSheet)
    if (!ws) continue
    for (let i = 0; i < a.length; i++) {
      ws.getCell(`${offsetCol(a.startColumn, i)}${a.row}`).value = null
    }
  }

  // Clear dynamic rows
  for (const d of ALL_DYNAMIC_ROWS_MAPPINGS) {
    const ws = workbook.getWorksheet(d.excelSheet)
    if (!ws) continue
    for (let r = d.startRow; r < d.startRow + d.maxRows; r++) {
      for (const col of Object.keys(d.columns)) {
        ws.getCell(`${col}${r}`).value = null
      }
    }
  }

  // Clear DLOM answers (F7,F9,...,F25)
  const dlomWs = workbook.getWorksheet('DLOM')
  if (dlomWs) {
    for (const row of DLOM_ANSWER_ROWS) {
      dlomWs.getCell(`F${row}`).value = null
    }
    dlomWs.getCell('C31').value = null
  }

  // Clear DLOC answers (E7,E9,...,E15)
  const dlocWs = workbook.getWorksheet('DLOC(PFC)')
  if (dlocWs) {
    for (const row of DLOC_ANSWER_ROWS) {
      dlocWs.getCell(`E${row}`).value = null
    }
    dlocWs.getCell('B21').value = null
  }
}

// ---------------------------------------------------------------------------
// Internal: Inject scalars
// ---------------------------------------------------------------------------

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function resolveSlice(state: ExportableState, mapping: ScalarCellMapping): unknown {
  if (mapping.storeSlice === '_root') {
    return (state as unknown as Record<string, unknown>)[mapping.storeField]
  }
  const slice = (state as unknown as Record<string, unknown>)[mapping.storeSlice]
  if (slice === null || slice === undefined) return undefined
  return getNestedValue(slice as Record<string, unknown>, mapping.storeField)
}

function injectScalarCells(workbook: ExcelJS.Workbook, state: ExportableState): void {
  for (const m of ALL_SCALAR_MAPPINGS) {
    const ws = workbook.getWorksheet(m.excelSheet)
    if (!ws) continue

    let value = resolveSlice(state, m)
    if (value === undefined || value === null) continue

    if (m.exportTransform === 'multiplyBy100' && typeof value === 'number') {
      value = value * 100
    }

    ws.getCell(m.excelCell).value = value as ExcelJS.CellValue
  }
}

// ---------------------------------------------------------------------------
// Internal: Inject grids (BS, IS, FA)
// ---------------------------------------------------------------------------

function injectGridCells(workbook: ExcelJS.Workbook, state: ExportableState): void {
  for (const g of ALL_GRID_MAPPINGS) {
    const ws = workbook.getWorksheet(g.excelSheet)
    if (!ws) continue

    const slice = (state as unknown as Record<string, unknown>)[g.storeSlice] as
      | { rows: Record<number, Record<number, number>> }
      | null
    if (!slice) continue

    for (const row of g.leafRows) {
      const yearValues = slice.rows[row]
      if (!yearValues) continue
      for (const [yearStr, col] of Object.entries(g.yearColumns)) {
        const year = Number(yearStr)
        const val = yearValues[year]
        if (val !== undefined && val !== null) {
          ws.getCell(`${col}${row}`).value = val
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Internal: Inject arrays (KEY DRIVERS projection arrays)
// ---------------------------------------------------------------------------

function injectArrayCells(workbook: ExcelJS.Workbook, state: ExportableState): void {
  for (const a of ALL_ARRAY_MAPPINGS) {
    const ws = workbook.getWorksheet(a.excelSheet)
    if (!ws) continue

    const slice = (state as unknown as Record<string, unknown>)[a.storeSlice]
    if (slice === null || slice === undefined) continue

    let values: number[] | undefined

    // Handle synthetic projected ratio fields (_cogsRatioProjected, etc.)
    if (a.storeField.startsWith('_') && a.storeField.endsWith('Projected')) {
      const baseField = a.storeField
        .replace(/^_/, '')
        .replace(/Projected$/, '')
      const baseFieldPath = `operationalDrivers.${baseField}`
      const baseValue = getNestedValue(slice as Record<string, unknown>, baseFieldPath)
      if (typeof baseValue === 'number') {
        values = Array(a.length).fill(baseValue) as number[]
      }
    } else {
      const raw = getNestedValue(slice as Record<string, unknown>, a.storeField)
      if (Array.isArray(raw)) {
        values = raw as number[]
      }
    }

    if (!values) continue

    for (let i = 0; i < a.length && i < values.length; i++) {
      const col = offsetCol(a.startColumn, i)
      ws.getCell(`${col}${a.row}`).value = values[i]
    }
  }
}

// ---------------------------------------------------------------------------
// Internal: Inject dynamic rows (WACC companies, bank rates)
// ---------------------------------------------------------------------------

function injectDynamicRows(workbook: ExcelJS.Workbook, state: ExportableState): void {
  for (const d of ALL_DYNAMIC_ROWS_MAPPINGS) {
    const ws = workbook.getWorksheet(d.excelSheet)
    if (!ws) continue

    const slice = (state as unknown as Record<string, unknown>)[d.storeSlice]
    if (slice === null || slice === undefined) continue

    const items = getNestedValue(slice as Record<string, unknown>, d.storeField)
    if (!Array.isArray(items)) continue

    const count = Math.min(items.length, d.maxRows)
    for (let i = 0; i < count; i++) {
      const item = items[i] as Record<string, unknown>
      const row = d.startRow + i
      for (const [col, field] of Object.entries(d.columns)) {
        let value = item[field]
        if (value === undefined || value === null) continue
        if (d.columnTransforms?.[col] === 'multiplyBy100' && typeof value === 'number') {
          value = value * 100
        }
        ws.getCell(`${col}${row}`).value = value as ExcelJS.CellValue
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Internal: DLOM / DLOC answers
// ---------------------------------------------------------------------------

function injectDlomAnswers(workbook: ExcelJS.Workbook, state: ExportableState): void {
  if (!state.dlom) return
  const ws = workbook.getWorksheet('DLOM')
  if (!ws) return

  for (let factor = 1; factor <= 10; factor++) {
    const answer = state.dlom.answers[factor]
    if (!answer) continue
    const row = DLOM_ANSWER_ROWS[factor - 1]
    ws.getCell(`F${row}`).value = answer
  }
}

function injectDlocAnswers(workbook: ExcelJS.Workbook, state: ExportableState): void {
  if (!state.dloc) return
  const ws = workbook.getWorksheet('DLOC(PFC)')
  if (!ws) return

  for (let factor = 1; factor <= 5; factor++) {
    const answer = state.dloc.answers[factor]
    if (!answer) continue
    const row = DLOC_ANSWER_ROWS[factor - 1]
    ws.getCell(`E${row}`).value = answer
  }
}

/**
 * DLOM jenisPerusahaan indicator at C30.
 * Excel formula B30 reads: IF(C30="DLOM Perusahaan tertutup ",1,2)
 * Trailing space in the string is intentional (matches Excel original).
 */
function injectDlomJenisPerusahaan(workbook: ExcelJS.Workbook, state: ExportableState): void {
  if (!state.home) return
  const ws = workbook.getWorksheet('DLOM')
  if (!ws) return

  const jenis = state.home.jenisPerusahaan as string
  // Must match exact Excel string including trailing space
  ws.getCell('C30').value =
    jenis === 'tertutup'
      ? 'DLOM Perusahaan tertutup '
      : 'DLOM Perusahaan terbuka '
}

// ---------------------------------------------------------------------------
// Internal: AAM per-row adjustments
// ---------------------------------------------------------------------------

/**
 * Inject per-row AAM adjustments into the AAM sheet D column.
 * Each BS row number maps to a specific AAM Excel row via BS_ROW_TO_AAM_D_ROW.
 */
function injectAamAdjustments(workbook: ExcelJS.Workbook, state: ExportableState): void {
  const adj = state.aamAdjustments
  if (!adj || Object.keys(adj).length === 0) return

  const ws = workbook.getWorksheet('AAM')
  if (!ws) return

  for (const [bsRowStr, value] of Object.entries(adj)) {
    if (value === 0) continue
    const bsRow = Number(bsRowStr)
    const aamRow = BS_ROW_TO_AAM_D_ROW[bsRow]
    if (aamRow !== undefined) {
      ws.getCell(`D${aamRow}`).value = value
    }
  }
}

// ---------------------------------------------------------------------------
// Internal: Extended BS catalog injection (Session 025, Approach E3)
//
// User-added accounts beyond template baseline use synthetic excelRow ≥ 100
// per BS_CATALOG_ALL. We write their values+labels at those synthetic rows
// directly in the BALANCE SHEET sheet (no row insertion, no cross-sheet ref
// shifting). Then we APPEND `+SUM(<col>{start}:<col>{end})` to each section's
// subtotal formula so extended accounts contribute to all downstream
// computations.
// ---------------------------------------------------------------------------

interface BsSectionInjectMap {
  section: BsSection
  extendedRowStart: number
  extendedRowEnd: number
  /** Cell row whose formula gets `+SUM(extendedRange)` appended per year col. */
  subtotalRow: number
}

/** Section → (extended row range, subtotal row). Order matches BS template. */
const BS_SECTION_INJECT: readonly BsSectionInjectMap[] = [
  { section: 'current_assets',           extendedRowStart: 100, extendedRowEnd: 139, subtotalRow: 16 },
  { section: 'intangible_assets',        extendedRowStart: 140, extendedRowEnd: 159, subtotalRow: 25 },
  { section: 'other_non_current_assets', extendedRowStart: 160, extendedRowEnd: 199, subtotalRow: 25 },
  { section: 'current_liabilities',      extendedRowStart: 200, extendedRowEnd: 219, subtotalRow: 35 },
  { section: 'non_current_liabilities',  extendedRowStart: 220, extendedRowEnd: 239, subtotalRow: 40 },
  { section: 'equity',                   extendedRowStart: 300, extendedRowEnd: 319, subtotalRow: 49 },
  // fixed_assets section: not injected here — values come from FA store via
  // cross-sheet ref `'FIXED ASSET'!C32` in the BS template formulas.
] as const

/**
 * Write extended BS accounts (excelRow ≥ 100) to their synthetic rows in the
 * BALANCE SHEET sheet. Each row gets: label in column B, numeric values in
 * year columns. Original template cells (rows 8-49) untouched.
 */
export function injectExtendedBsAccounts(
  workbook: ExcelJS.Workbook,
  state: ExportableState,
): void {
  if (!state.balanceSheet) return
  const ws = workbook.getWorksheet('BALANCE SHEET')
  if (!ws) return

  const grid = ALL_GRID_MAPPINGS.find((g) => g.excelSheet === 'BALANCE SHEET')
  if (!grid) return

  for (const acc of state.balanceSheet.accounts) {
    if (acc.excelRow < 100) continue // original rows handled by injectGridCells

    // Label (column B): customLabel > catalog labelEn > catalogId fallback
    const catalog = BS_CATALOG_ALL.find((c) => c.id === acc.catalogId)
    const label = acc.customLabel ?? (catalog ? catalog.labelEn : acc.catalogId)
    ws.getCell(`B${acc.excelRow}`).value = label

    // Values per year column
    const yearValues = state.balanceSheet.rows[acc.excelRow]
    if (!yearValues) continue
    for (const [yearStr, col] of Object.entries(grid.yearColumns)) {
      const val = yearValues[Number(yearStr)]
      if (val !== undefined && val !== null) {
        ws.getCell(`${col}${acc.excelRow}`).value = val
      }
    }
  }
}

/**
 * For each BS section with ≥1 extended account, append `+SUM(<col>{start}:
 * <col>{end})` to that section's subtotal formula across all year columns.
 *
 * Two sections (intangible_assets, other_non_current_assets) share subtotal
 * row 25 — each appends its own SUM term, so the row may receive 1 or 2
 * appended terms depending on which sections have extended accounts.
 */
export function extendBsSectionSubtotals(
  workbook: ExcelJS.Workbook,
  state: ExportableState,
): void {
  if (!state.balanceSheet) return
  const ws = workbook.getWorksheet('BALANCE SHEET')
  if (!ws) return

  const grid = ALL_GRID_MAPPINGS.find((g) => g.excelSheet === 'BALANCE SHEET')
  if (!grid) return

  // Identify which sections actually have extended accounts in the user's data.
  const sectionsWithExtended = new Set<BsSection>()
  for (const acc of state.balanceSheet.accounts) {
    if (acc.excelRow >= 100) sectionsWithExtended.add(acc.section)
  }
  if (sectionsWithExtended.size === 0) return

  for (const map of BS_SECTION_INJECT) {
    if (!sectionsWithExtended.has(map.section)) continue

    for (const col of Object.values(grid.yearColumns)) {
      const cell = ws.getCell(`${col}${map.subtotalRow}`)
      const existing = cell.value
      const sumTerm = `SUM(${col}${map.extendedRowStart}:${col}${map.extendedRowEnd})`

      // Build new formula: append the SUM term to existing formula or value.
      let newFormula: string
      if (existing && typeof existing === 'object' && 'formula' in existing) {
        // ExcelJS stores formulas as { formula: '...' } objects
        newFormula = `${(existing as { formula: string }).formula}+${sumTerm}`
      } else if (typeof existing === 'string' && existing.startsWith('=')) {
        newFormula = `${existing.slice(1)}+${sumTerm}`
      } else if (typeof existing === 'number') {
        // Subtotal cell has a hard-coded number (template missing formula?).
        // Wrap into a formula that preserves the original value as a constant.
        newFormula = `${existing}+${sumTerm}`
      } else {
        // Empty cell — start fresh
        newFormula = sumTerm
      }

      cell.value = { formula: newFormula }
    }
  }
}

// ---------------------------------------------------------------------------
// "RINCIAN NERACA" — DELETED in Session 025
//
// Extended BS accounts now write directly to BALANCE SHEET as native rows
// (see injectExtendedBsAccounts + extendBsSectionSubtotals above). The
// separate RINCIAN detail sheet is no longer needed; the
// `addBsDetailSheet` function was removed. If any external consumer needs
// it, recover from git history (commit 97863cd or earlier).
// ---------------------------------------------------------------------------

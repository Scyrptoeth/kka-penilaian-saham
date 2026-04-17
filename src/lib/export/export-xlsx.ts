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
  AccPayablesInputState,
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
import {
  IS_CATALOG,
  type IsSection,
} from '@/data/catalogs/income-statement-catalog'
import {
  FA_CATALOG,
  FA_OFFSET,
} from '@/data/catalogs/fixed-asset-catalog'
import {
  MIGRATED_SHEET_NAMES,
  runSheetBuilders,
} from './sheet-builders/registry'

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** State shape expected by the export function — mirrors Zustand store slices. */
export interface ExportableState {
  home: HomeInputs | null
  balanceSheet: BalanceSheetInputState | null
  incomeStatement: IncomeStatementInputState | null
  fixedAsset: FixedAssetInputState | null
  accPayables: AccPayablesInputState | null
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

  // 3. Clear all input cells (remove prototype PT Raja Voltama data).
  //    Migrated sheets (owned by SHEET_BUILDERS) are skipped here because
  //    the builder either populates them from scratch or clears them
  //    completely via clearSheetCompletely() — either way the legacy
  //    leaf-cell null-writes would be redundant.
  clearAllInputCells(workbook, MIGRATED_SHEET_NAMES)

  // 4. Inject user data via legacy per-type injectors. Migrated sheets are
  //    skipped at this layer; their SheetBuilder owns them end-to-end.
  injectScalarCells(workbook, state, MIGRATED_SHEET_NAMES)
  injectGridCells(workbook, state, MIGRATED_SHEET_NAMES)
  if (!MIGRATED_SHEET_NAMES.has('BALANCE SHEET')) {
    injectBsCrossRefValues(workbook, state)
  }
  injectArrayCells(workbook, state, MIGRATED_SHEET_NAMES)
  injectDynamicRows(workbook, state, MIGRATED_SHEET_NAMES)
  if (!MIGRATED_SHEET_NAMES.has('DLOM')) {
    injectDlomAnswers(workbook, state)
    injectDlomJenisPerusahaan(workbook, state)
  }
  if (!MIGRATED_SHEET_NAMES.has('DLOC(PFC)')) {
    injectDlocAnswers(workbook, state)
  }
  if (!MIGRATED_SHEET_NAMES.has('AAM')) {
    injectAamAdjustments(workbook, state)
  }

  // 5. Extended BS catalog injection (Session 025) — skipped when BS is
  //    owned by BalanceSheetBuilder, which calls the same helpers itself.
  if (!MIGRATED_SHEET_NAMES.has('BALANCE SHEET')) {
    injectExtendedBsAccounts(workbook, state)
    extendBsSectionSubtotals(workbook, state)
  }

  // 5b. IS extended catalog (Session 028 Approach δ) — skipped when IS is
  //     owned by IncomeStatementBuilder.
  if (!MIGRATED_SHEET_NAMES.has('INCOME STATEMENT')) {
    injectExtendedIsAccounts(workbook, state)
    replaceIsSectionSentinels(workbook, state)
  }

  // 5c. FA extended catalog (Session 028 Approach η) — skipped when FA is
  //     owned by FixedAssetBuilder.
  if (!MIGRATED_SHEET_NAMES.has('FIXED ASSET')) {
    injectExtendedFaAccounts(workbook, state)
    extendFaSectionSubtotals(workbook, state)
  }

  // 5d. Session 030/031 — state-driven sheet builders. For each registered
  //     builder: populate the sheet when upstream slices satisfy
  //     isPopulated(), otherwise clear it to a blank shell. Non-registered
  //     sheets remain untouched — legacy pipeline above owns them.
  runSheetBuilders(workbook, state)

  // 6. Apply website-nav 1:1 sheet visibility (Session 024 audit decision)
  applySheetVisibility(workbook)

  // 7. Strip dangling formulas the template inherited from its prior Excel
  //    life (external-workbook refs like `'[3]BALANCE SHEET'!A3` and stale
  //    `#REF!`). ExcelJS drops the externalLinks/ parts on round-trip but
  //    leaves the formula strings behind — Excel then shows the repair
  //    dialog on open. Replace with the cached last-known value.
  sanitizeDanglingFormulas(workbook)

  // 8. Remove decorative tables. The template's FINANCIAL RATIO sheet
  //    defines four styled Tables (Table7/8/9/11) purely for visual
  //    grouping. ExcelJS round-trip mis-serialises their metadata
  //    (`headerRowCount="0"` with column names that have no header row),
  //    which Excel detects on open and flags as
  //    "Removed Records: AutoFilter from table*.xml". Since the tables
  //    provide no functional filtering/sorting, dropping them entirely
  //    eliminates the repair prompt without affecting the workbook.
  stripDecorativeTables(workbook)

  // 9. Generate output
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
 * Exported so Phase C verification and external audits share the same list.
 */
export const WEBSITE_NAV_SHEETS: readonly string[] = [
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
// Internal: Strip cross-sheet refs pointing to sheets a builder cleared
// ---------------------------------------------------------------------------

/**
 * Partial-data export guard. When a `SheetBuilder` determines that its
 * upstream slice is unpopulated, it calls `clearSheetCompletely` —
 * leaving every cell in that sheet empty. Any formula in OTHER sheets
 * that still references the cleared sheet becomes dangling: Excel would
 * render a stale cached value or `#REF!` on open.
 *
 * This helper scans formula cells on non-cleared sheets, detects refs
 * to any sheet in `clearedSheets`, and replaces the formula with its
 * cached `result`. The substitution is lossless-to-the-eye (Excel shows
 * the last-computed value instead of a broken formula) and matches the
 * approach of `sanitizeDanglingFormulas`.
 *
 * Sheet-reference syntax covered:
 *   - Quoted:   `'SHEET NAME'!A1` (names containing spaces/special chars)
 *   - Unquoted: `SHEETNAME!A1`   (single-word alphanumeric names)
 *
 * Word-boundary anchor on the unquoted pattern prevents substring
 * collisions (e.g. `AAM` cleared must not strip `'SIMULASI POTENSI (AAM)'!`
 * references — the quoted sheet name is semantically distinct).
 */
export function stripCrossSheetRefsToBlankSheets(
  workbook: ExcelJS.Workbook,
  clearedSheets: readonly string[],
): void {
  if (clearedSheets.length === 0) return

  const escape = (s: string): string =>
    s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const patterns = clearedSheets.flatMap((name) => {
    const esc = escape(name)
    return [
      new RegExp(`'${esc}'!`),     // quoted form
      new RegExp(`\\b${esc}!`),    // unquoted form, word-boundary anchored
    ]
  })

  const clearedSet = new Set(clearedSheets)

  for (const ws of workbook.worksheets) {
    if (clearedSet.has(ws.name)) continue // leave the cleared sheet itself alone

    ws.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        const v = cell.value as unknown
        if (!v || typeof v !== 'object') return

        const formula =
          'formula' in v ? (v as { formula?: unknown }).formula :
          'sharedFormula' in v ? (v as { sharedFormula?: unknown }).sharedFormula :
          undefined
        if (typeof formula !== 'string') return

        if (!patterns.some((p) => p.test(formula))) return

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
  }
}

// ---------------------------------------------------------------------------
// Internal: Strip decorative tables
// ---------------------------------------------------------------------------

/**
 * Remove every Table definition from every worksheet. The source template
 * defines four Tables on FINANCIAL RATIO that are decorative only (styled
 * section headers). ExcelJS cannot faithfully round-trip their metadata:
 * it produces `<table headerRowCount="0">` with column names that have no
 * header cells, which Excel then flags on open as
 * "Removed Records: AutoFilter from /xl/tables/tableN.xml".
 *
 * Removing the Table wrapper preserves every cell value and style —
 * only the invisible structured-table metadata goes away.
 */
export function stripDecorativeTables(workbook: ExcelJS.Workbook): void {
  for (const ws of workbook.worksheets) {
    const tables = (ws as unknown as { tables?: Record<string, unknown> }).tables
    if (!tables) continue
    for (const name of Object.keys(tables)) {
      try {
        ws.removeTable(name)
      } catch {
        // Fallback: delete directly if removeTable throws on malformed
        // table model (ExcelJS's own round-trip leaves some tables in a
        // state where removeTable rejects them).
        delete (tables as Record<string, unknown>)[name]
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Internal: Clear
// ---------------------------------------------------------------------------

function clearAllInputCells(
  workbook: ExcelJS.Workbook,
  skipSheets: ReadonlySet<string> = new Set(),
): void {
  // Clear scalar cells (skip scalars that target a migrated sheet)
  for (const m of ALL_SCALAR_MAPPINGS) {
    if (skipSheets.has(m.excelSheet)) continue
    const ws = workbook.getWorksheet(m.excelSheet)
    if (ws) ws.getCell(m.excelCell).value = null
  }

  // Clear grid cells (skip migrated sheets — builder owns the full sheet)
  for (const g of ALL_GRID_MAPPINGS) {
    if (skipSheets.has(g.excelSheet)) continue
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
    if (skipSheets.has(a.excelSheet)) continue
    const ws = workbook.getWorksheet(a.excelSheet)
    if (!ws) continue
    for (let i = 0; i < a.length; i++) {
      ws.getCell(`${offsetCol(a.startColumn, i)}${a.row}`).value = null
    }
  }

  // Clear dynamic rows
  for (const d of ALL_DYNAMIC_ROWS_MAPPINGS) {
    if (skipSheets.has(d.excelSheet)) continue
    const ws = workbook.getWorksheet(d.excelSheet)
    if (!ws) continue
    for (let r = d.startRow; r < d.startRow + d.maxRows; r++) {
      for (const col of Object.keys(d.columns)) {
        ws.getCell(`${col}${r}`).value = null
      }
    }
  }

  // Clear DLOM answers (F7,F9,...,F25)
  if (!skipSheets.has('DLOM')) {
    const dlomWs = workbook.getWorksheet('DLOM')
    if (dlomWs) {
      for (const row of DLOM_ANSWER_ROWS) {
        dlomWs.getCell(`F${row}`).value = null
      }
      dlomWs.getCell('C31').value = null
    }
  }

  // Clear DLOC answers (E7,E9,...,E15)
  if (!skipSheets.has('DLOC(PFC)')) {
    const dlocWs = workbook.getWorksheet('DLOC(PFC)')
    if (dlocWs) {
      for (const row of DLOC_ANSWER_ROWS) {
        dlocWs.getCell(`E${row}`).value = null
      }
      dlocWs.getCell('B21').value = null
    }
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

function injectScalarCells(
  workbook: ExcelJS.Workbook,
  state: ExportableState,
  skipSheets: ReadonlySet<string> = new Set(),
): void {
  for (const m of ALL_SCALAR_MAPPINGS) {
    if (skipSheets.has(m.excelSheet)) continue
    const ws = workbook.getWorksheet(m.excelSheet)
    if (!ws) continue

    writeScalarMapping(ws, state, m)
  }
}

function writeScalarMapping(
  ws: ExcelJS.Worksheet,
  state: ExportableState,
  m: ScalarCellMapping,
): void {
  let value = resolveSlice(state, m)
  if (value === undefined || value === null) return
  if (m.exportTransform === 'multiplyBy100' && typeof value === 'number') {
    value = value * 100
  }
  ws.getCell(m.excelCell).value = value as ExcelJS.CellValue
}

/**
 * Builder-facing helper: write all scalar mappings whose destination
 * is `excelSheet`. Used by individual SheetBuilders (Session 031+) to
 * reuse the resolveSlice + multiplyBy100 semantics without re-implementing
 * them per builder file.
 *
 * Note: a scalar mapping's `excelSheet` is its DESTINATION. A builder
 * whose `sheetName` matches will collect scalars that *write into* its
 * sheet regardless of which store slice sources the value. For scalars
 * sourced FROM a slice but targeting a DIFFERENT sheet (e.g. WACC's
 * taxRate → IS!B33), the source-slice builder uses
 * `writeScalarsFromSlice` instead.
 */
export function writeScalarsForSheet(
  workbook: ExcelJS.Workbook,
  state: ExportableState,
  excelSheet: string,
): void {
  const ws = workbook.getWorksheet(excelSheet)
  if (!ws) return
  for (const m of ALL_SCALAR_MAPPINGS) {
    if (m.excelSheet !== excelSheet) continue
    writeScalarMapping(ws, state, m)
  }
}

/**
 * Builder-facing helper: write every scalar mapping whose source is
 * `storeSlice`, regardless of destination sheet. Used by WaccBuilder
 * to include the `wacc.taxRate → IS!B33` cross-sheet write alongside
 * its own WACC-sheet scalars. Resolves the Session 031 regression where
 * `injectScalarCells` filtering by destination left cross-sheet writes
 * to already-migrated sheets orphaned.
 */
export function writeScalarsFromSlice(
  workbook: ExcelJS.Workbook,
  state: ExportableState,
  storeSlice: string,
): void {
  for (const m of ALL_SCALAR_MAPPINGS) {
    if (m.storeSlice !== storeSlice) continue
    const ws = workbook.getWorksheet(m.excelSheet)
    if (!ws) continue
    writeScalarMapping(ws, state, m)
  }
}

/** Builder-facing helper: write all array mappings targeting `excelSheet`. */
export function writeArraysForSheet(
  workbook: ExcelJS.Workbook,
  state: ExportableState,
  excelSheet: string,
): void {
  const ws = workbook.getWorksheet(excelSheet)
  if (!ws) return
  for (const a of ALL_ARRAY_MAPPINGS) {
    if (a.excelSheet !== excelSheet) continue
    writeArrayMapping(ws, state, a)
  }
}

/** Builder-facing helper: write all dynamic-row mappings targeting `excelSheet`. */
export function writeDynamicRowsForSheet(
  workbook: ExcelJS.Workbook,
  state: ExportableState,
  excelSheet: string,
): void {
  const ws = workbook.getWorksheet(excelSheet)
  if (!ws) return
  for (const d of ALL_DYNAMIC_ROWS_MAPPINGS) {
    if (d.excelSheet !== excelSheet) continue
    writeDynamicRowsMapping(ws, state, d)
  }
}

/** Builder-facing helper: write grid mapping for one sheet. */
export function writeGridForSheet(
  workbook: ExcelJS.Workbook,
  state: ExportableState,
  excelSheet: string,
): void {
  const ws = workbook.getWorksheet(excelSheet)
  if (!ws) return
  const grid = ALL_GRID_MAPPINGS.find((g) => g.excelSheet === excelSheet)
  if (!grid) return
  const slice = (state as unknown as Record<string, unknown>)[grid.storeSlice] as
    | { rows: Record<number, Record<number, number>> }
    | null
  if (!slice) return
  for (const row of grid.leafRows) {
    const yearValues = slice.rows[row]
    if (!yearValues) continue
    for (const [yearStr, col] of Object.entries(grid.yearColumns)) {
      const year = Number(yearStr)
      const val = yearValues[year]
      if (val !== undefined && val !== null) {
        ws.getCell(`${col}${row}`).value = val
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Internal: Inject grids (BS, IS, FA)
// ---------------------------------------------------------------------------

/**
 * Inject BS cross-reference values (rows 20 & 21) computed from Fixed
 * Asset store data. These rows are never persisted to the BS store by
 * design — DynamicBsEditor derives them at render time from FA rows 32
 * (Total Ending Acquisition Cost, positive) and 60 (Total Ending Accum
 * Depreciation, negated for BS's negative-accum-dep convention).
 *
 * Without this injection, cells BS!C20:F21 stay empty after export,
 * causing BS!C22:F22 (Fixed Assets, Net = C20+C21) to evaluate to 0 and
 * cascading zero into TOTAL ASSETS + all downstream ratios.
 *
 * Mirrors `computeBsCrossRefValues` in DynamicBsEditor exactly so the
 * exported workbook matches the website display.
 */
export function injectBsCrossRefValues(workbook: ExcelJS.Workbook, state: ExportableState): void {
  const faRows = state.fixedAsset?.rows
  if (!faRows) return
  const ws = workbook.getWorksheet('BALANCE SHEET')
  if (!ws) return

  const yearColumns = BALANCE_SHEET_GRID_COLUMNS
  const acqEnding = faRows[32]
  const depEnding = faRows[60]

  if (acqEnding) {
    for (const [yearStr, col] of Object.entries(yearColumns)) {
      const v = acqEnding[Number(yearStr)]
      if (v !== undefined && v !== null) ws.getCell(`${col}20`).value = v
    }
  }
  if (depEnding) {
    for (const [yearStr, col] of Object.entries(yearColumns)) {
      const v = depEnding[Number(yearStr)]
      if (v !== undefined && v !== null) ws.getCell(`${col}21`).value = -v
    }
  }
}

/** BS grid year → column map, shared by injectGridCells and cross-ref injector. */
const BALANCE_SHEET_GRID_COLUMNS: Readonly<Record<number, string>> = {
  2018: 'C',
  2019: 'D',
  2020: 'E',
  2021: 'F',
}

function injectGridCells(
  workbook: ExcelJS.Workbook,
  state: ExportableState,
  skipSheets: ReadonlySet<string> = new Set(),
): void {
  for (const g of ALL_GRID_MAPPINGS) {
    if (skipSheets.has(g.excelSheet)) continue
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

function injectArrayCells(
  workbook: ExcelJS.Workbook,
  state: ExportableState,
  skipSheets: ReadonlySet<string> = new Set(),
): void {
  for (const a of ALL_ARRAY_MAPPINGS) {
    if (skipSheets.has(a.excelSheet)) continue
    const ws = workbook.getWorksheet(a.excelSheet)
    if (!ws) continue
    writeArrayMapping(ws, state, a)
  }
}

function writeArrayMapping(
  ws: ExcelJS.Worksheet,
  state: ExportableState,
  a: import('./cell-mapping').ArrayCellMapping,
): void {
  const slice = (state as unknown as Record<string, unknown>)[a.storeSlice]
  if (slice === null || slice === undefined) return

  let values: number[] | undefined

  if (a.storeField.startsWith('_') && a.storeField.endsWith('Projected')) {
    const baseField = a.storeField.replace(/^_/, '').replace(/Projected$/, '')
    const baseFieldPath = `operationalDrivers.${baseField}`
    const baseValue = getNestedValue(slice as Record<string, unknown>, baseFieldPath)
    if (typeof baseValue === 'number') {
      values = Array(a.length).fill(baseValue) as number[]
    }
  } else {
    const raw = getNestedValue(slice as Record<string, unknown>, a.storeField)
    if (Array.isArray(raw)) values = raw as number[]
  }

  if (!values) return
  for (let i = 0; i < a.length && i < values.length; i++) {
    const col = offsetCol(a.startColumn, i)
    ws.getCell(`${col}${a.row}`).value = values[i]
  }
}

// ---------------------------------------------------------------------------
// Internal: Inject dynamic rows (WACC companies, bank rates)
// ---------------------------------------------------------------------------

function injectDynamicRows(
  workbook: ExcelJS.Workbook,
  state: ExportableState,
  skipSheets: ReadonlySet<string> = new Set(),
): void {
  for (const d of ALL_DYNAMIC_ROWS_MAPPINGS) {
    if (skipSheets.has(d.excelSheet)) continue
    const ws = workbook.getWorksheet(d.excelSheet)
    if (!ws) continue
    writeDynamicRowsMapping(ws, state, d)
  }
}

function writeDynamicRowsMapping(
  ws: ExcelJS.Worksheet,
  state: ExportableState,
  d: import('./cell-mapping').DynamicRowsMapping,
): void {
  const slice = (state as unknown as Record<string, unknown>)[d.storeSlice]
  if (slice === null || slice === undefined) return

  const items = getNestedValue(slice as Record<string, unknown>, d.storeField)
  if (!Array.isArray(items)) return

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

// ---------------------------------------------------------------------------
// Internal: DLOM / DLOC answers
// ---------------------------------------------------------------------------

export function injectDlomAnswers(workbook: ExcelJS.Workbook, state: ExportableState): void {
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

export function injectDlocAnswers(workbook: ExcelJS.Workbook, state: ExportableState): void {
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
export function injectDlomJenisPerusahaan(workbook: ExcelJS.Workbook, state: ExportableState): void {
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
 *
 * Exported for reuse by `AamBuilder` (Session 031) — the builder wraps
 * this helper with label writing and sheet-clear semantics.
 */
export function injectAamAdjustments(workbook: ExcelJS.Workbook, state: ExportableState): void {
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

// ---------------------------------------------------------------------------
// Session 028 — IS extended catalog native injection (Approach δ)
//
// Unlike BS (where extended rows 100-139 hold leaf values distinct from
// baseline leaves at rows 8-15), IS sentinel cells D6/D7/D15/D30 are
// ALREADY the aggregated totals of all extended rows (pre-computed at
// persist time by DynamicIsEditor). Appending `+SUM(extendedRange)` to
// derived rows (the BS pattern) would double-count.
//
// Instead, we REPLACE the sentinel cell value with a live
// `=SUM(D<start>:D<end>)` formula whenever the user has ≥1 extended
// account in that section. The formula references the native rows we
// just wrote via `injectExtendedIsAccounts`. Three benefits:
//   1. No double-count — sentinel is the ONLY source of section total.
//   2. Full Excel reactivity — user edits D105 in Excel, D6 auto-recomputes.
//   3. Derived formulas (D8 = SUM(D6:D7), etc.) untouched and correct.
//
// Net-interest section (rows 500-519) is special: accounts mix `income`
// and `expense` via `interestType` flag, so a simple contiguous SUM range
// cannot express the signed total. We keep D26/D27 as hardcoded sentinels
// (from DynamicIsEditor pre-computation) and still write extended rows
// 500-519 for breakdown visibility.
// ---------------------------------------------------------------------------

interface IsSectionInjectMap {
  section: IsSection
  extendedRowStart: number
  extendedRowEnd: number
  /** Sentinel cell row to overwrite with SUM formula. `null` = skip (mixed-sign). */
  sentinelRow: number | null
}

/** Section → (extended row range, sentinel row). Order matches IS template. */
const IS_SECTION_INJECT: readonly IsSectionInjectMap[] = [
  { section: 'revenue',           extendedRowStart: 100, extendedRowEnd: 119, sentinelRow: 6  },
  { section: 'cost',              extendedRowStart: 200, extendedRowEnd: 219, sentinelRow: 7  },
  { section: 'operating_expense', extendedRowStart: 300, extendedRowEnd: 319, sentinelRow: 15 },
  { section: 'non_operating',     extendedRowStart: 400, extendedRowEnd: 419, sentinelRow: 30 },
  { section: 'net_interest',      extendedRowStart: 500, extendedRowEnd: 519, sentinelRow: null },
] as const

/**
 * Write extended IS accounts (excelRow ≥ 100) to their synthetic rows in
 * the INCOME STATEMENT sheet. Each row gets: label in column B, numeric
 * values in year columns (C/D/E/F = 2018/2019/2020/2021). Original
 * template cells (rows 6-35) untouched — sentinel numbers written there
 * by `injectGridCells` will be overwritten by `replaceIsSectionSentinels`
 * for non-net-interest sections.
 */
export function injectExtendedIsAccounts(
  workbook: ExcelJS.Workbook,
  state: ExportableState,
): void {
  if (!state.incomeStatement) return
  const ws = workbook.getWorksheet('INCOME STATEMENT')
  if (!ws) return

  const grid = ALL_GRID_MAPPINGS.find((g) => g.excelSheet === 'INCOME STATEMENT')
  if (!grid) return

  for (const acc of state.incomeStatement.accounts) {
    if (acc.excelRow < 100) continue // defensive guard — legacy positions handled by injectGridCells

    // Label (column B): customLabel > catalog labelEn > catalogId fallback
    const catalog = IS_CATALOG.find((c) => c.id === acc.catalogId)
    const label = acc.customLabel ?? (catalog ? catalog.labelEn : acc.catalogId)
    ws.getCell(`B${acc.excelRow}`).value = label

    // Values per year column
    const yearValues = state.incomeStatement.rows[acc.excelRow]
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
 * For each IS section with `sentinelRow != null` AND ≥1 extended account,
 * overwrite the sentinel cell (D6/D7/D15/D30 across year columns C/D/E/F)
 * with a live `=SUM(col{start}:col{end})` formula. This replaces the
 * hardcoded sentinel number written by `injectGridCells`, turning the
 * export into a reactive workbook where user edits to extended rows
 * propagate automatically through derived formulas and downstream sheets.
 *
 * `net_interest` is skipped (sentinelRow: null) because rows 500-519 mix
 * `income` and `expense` interestType — a simple SUM range can't express
 * the signed total. D26/D27 sentinels remain as hardcoded numbers.
 */
export function replaceIsSectionSentinels(
  workbook: ExcelJS.Workbook,
  state: ExportableState,
): void {
  if (!state.incomeStatement) return
  const ws = workbook.getWorksheet('INCOME STATEMENT')
  if (!ws) return

  const grid = ALL_GRID_MAPPINGS.find((g) => g.excelSheet === 'INCOME STATEMENT')
  if (!grid) return

  // Identify which sections have extended accounts in the user's data.
  const sectionsWithExtended = new Set<IsSection>()
  for (const acc of state.incomeStatement.accounts) {
    if (acc.excelRow >= 100) sectionsWithExtended.add(acc.section)
  }
  if (sectionsWithExtended.size === 0) return

  for (const map of IS_SECTION_INJECT) {
    if (map.sentinelRow === null) continue
    if (!sectionsWithExtended.has(map.section)) continue

    for (const col of Object.values(grid.yearColumns)) {
      const sumFormula = `SUM(${col}${map.extendedRowStart}:${col}${map.extendedRowEnd})`
      ws.getCell(`${col}${map.sentinelRow}`).value = { formula: sumFormula }
    }
  }
}

// ---------------------------------------------------------------------------
// Session 028 — FA extended catalog native injection (Approach η: 7-band mirror)
//
// The FIXED ASSET sheet has a characteristic 7-block layout: one leaf
// account appears SEVEN times across the sheet (Acq Beginning / Additions
// / Ending + Dep Beginning / Additions / Ending + Net Value). The
// original 6 categories occupy rows 8-13 (band 1), 17-22 (band 2),
// 26-31 (band 3), 36-41 (band 4), 45-50 (band 5), 54-59 (band 6),
// 63-68 (band 7), with subtotals at rows 14/23/32/42/51/60/69.
//
// For extended accounts (base excelRow ≥ 100), we allocate 7 parallel
// bands above the template content (rows 100-379, 40 slots per band).
// Each extended account is assigned a SLOT INDEX by its position in the
// filtered accounts array; that index is added to each band's start row
// to determine the actual sheet position for that account in that block.
//
// Bands 1/2/4/5 hold user-input values. The store already records these
// at offset keys: base+0 / base+2000 / base+4000 / base+5000.
// Bands 3/6/7 hold formulas that mirror the template's per-row computed
// values: Acq End = AcqBegin + AcqAdd, Dep End = DepBegin + DepAdd,
// Net Value = AcqEnd − DepEnd.
//
// Subtotal extension: each of the 7 section subtotals gets `+SUM(<band>)`
// appended across all year columns, matching the BS pattern (LESSON-067).
// ---------------------------------------------------------------------------

type FaBandKey =
  | 'ACQ_BEGIN'
  | 'ACQ_ADD'
  | 'ACQ_END'
  | 'DEP_BEGIN'
  | 'DEP_ADD'
  | 'DEP_END'
  | 'NET_VALUE'

interface FaBandMap {
  /** Band row start on sheet */
  start: number
  /** Band extended-row end (start + 39 for 40 slots) */
  end: number
  /** Store key offset for value lookup (null = formula-only computed band) */
  storeOffset: number | null
  /** For computed bands: sign + operand band keys */
  computed?: {
    op: '+' | '-'
    /** Band keys whose slot rows are referenced in the formula */
    operands: [FaBandKey, FaBandKey]
  }
}

/** 7-band layout on FIXED ASSET sheet. 40 slots per band. */
const FA_BAND: Record<FaBandKey, FaBandMap> = {
  ACQ_BEGIN:  { start: 100, end: 139, storeOffset: FA_OFFSET.ACQ_BEGINNING },
  ACQ_ADD:    { start: 140, end: 179, storeOffset: FA_OFFSET.ACQ_ADDITIONS },
  ACQ_END:    { start: 180, end: 219, storeOffset: null,
                computed: { op: '+', operands: ['ACQ_BEGIN', 'ACQ_ADD'] } },
  DEP_BEGIN:  { start: 220, end: 259, storeOffset: FA_OFFSET.DEP_BEGINNING },
  DEP_ADD:    { start: 260, end: 299, storeOffset: FA_OFFSET.DEP_ADDITIONS },
  DEP_END:    { start: 300, end: 339, storeOffset: null,
                computed: { op: '+', operands: ['DEP_BEGIN', 'DEP_ADD'] } },
  NET_VALUE:  { start: 340, end: 379, storeOffset: null,
                computed: { op: '-', operands: ['ACQ_END', 'DEP_END'] } },
}

/** Maps each band to its section-subtotal row on the FIXED ASSET template. */
const FA_BAND_SUBTOTAL_ROW: Record<FaBandKey, number> = {
  ACQ_BEGIN: 14,
  ACQ_ADD:   23,
  ACQ_END:   32,
  DEP_BEGIN: 42,
  DEP_ADD:   51,
  DEP_END:   60,
  NET_VALUE: 69,
}

/** Ordered band keys — evaluation order matches the template's flow. */
const FA_BAND_ORDER: readonly FaBandKey[] = [
  'ACQ_BEGIN', 'ACQ_ADD', 'ACQ_END',
  'DEP_BEGIN', 'DEP_ADD', 'DEP_END',
  'NET_VALUE',
] as const

/**
 * Write extended FA accounts (excelRow ≥ 100) to their synthetic slot
 * positions across all 7 bands on FIXED ASSET sheet. Input-value bands
 * read from `state.fixedAsset.rows[base + storeOffset]`; computed bands
 * get per-slot formulas that reference the corresponding input-band
 * slot rows.
 *
 * Labels (col B) are written to all 7 bands for consistency with the
 * template which repeats category names across blocks.
 */
export function injectExtendedFaAccounts(
  workbook: ExcelJS.Workbook,
  state: ExportableState,
): void {
  if (!state.fixedAsset) return
  const ws = workbook.getWorksheet('FIXED ASSET')
  if (!ws) return

  const grid = ALL_GRID_MAPPINGS.find((g) => g.excelSheet === 'FIXED ASSET')
  if (!grid) return

  const extendedAccounts = state.fixedAsset.accounts.filter((a) => a.excelRow >= 100)
  if (extendedAccounts.length === 0) return

  extendedAccounts.forEach((acc, slotIndex) => {
    const catalog = FA_CATALOG.find((c) => c.id === acc.catalogId)
    const label = acc.customLabel ?? (catalog ? catalog.labelEn : acc.catalogId)

    for (const bandKey of FA_BAND_ORDER) {
      const band = FA_BAND[bandKey]
      const row = band.start + slotIndex

      // Label in col B for every band
      ws.getCell(`B${row}`).value = label

      if (band.storeOffset !== null) {
        // Input band — write value from store
        const storeKey = acc.excelRow + band.storeOffset
        const yearValues = state.fixedAsset!.rows[storeKey]
        if (!yearValues) continue
        for (const [yearStr, col] of Object.entries(grid.yearColumns)) {
          const val = yearValues[Number(yearStr)]
          if (val !== undefined && val !== null) {
            ws.getCell(`${col}${row}`).value = val
          }
        }
      } else if (band.computed) {
        // Computed band — per-year-column formula referencing operand rows
        const [opA, opB] = band.computed.operands
        const rowA = FA_BAND[opA].start + slotIndex
        const rowB = FA_BAND[opB].start + slotIndex
        const sign = band.computed.op
        for (const col of Object.values(grid.yearColumns)) {
          const formula = `+${col}${rowA}${sign}${col}${rowB}`
          ws.getCell(`${col}${row}`).value = { formula }
        }
      }
    }
  })
}

/**
 * Append `+SUM(<col>{start}:<col>{end})` to each of the 7 FA section
 * subtotals (C14/23/32/42/51/60/69) across all year columns, so user-
 * added extended accounts flow into the section totals. No-op when no
 * extended accounts exist. Mirrors the BS pattern from Session 025.
 */
export function extendFaSectionSubtotals(
  workbook: ExcelJS.Workbook,
  state: ExportableState,
): void {
  if (!state.fixedAsset) return
  const ws = workbook.getWorksheet('FIXED ASSET')
  if (!ws) return

  const grid = ALL_GRID_MAPPINGS.find((g) => g.excelSheet === 'FIXED ASSET')
  if (!grid) return

  const hasExtended = state.fixedAsset.accounts.some((a) => a.excelRow >= 100)
  if (!hasExtended) return

  for (const bandKey of FA_BAND_ORDER) {
    const band = FA_BAND[bandKey]
    const subtotalRow = FA_BAND_SUBTOTAL_ROW[bandKey]

    for (const col of Object.values(grid.yearColumns)) {
      const cell = ws.getCell(`${col}${subtotalRow}`)
      const existing = cell.value
      const sumTerm = `SUM(${col}${band.start}:${col}${band.end})`

      let newFormula: string
      if (existing && typeof existing === 'object' && 'formula' in existing) {
        newFormula = `${(existing as { formula: string }).formula}+${sumTerm}`
      } else if (typeof existing === 'string' && existing.startsWith('=')) {
        newFormula = `${existing.slice(1)}+${sumTerm}`
      } else if (typeof existing === 'number') {
        newFormula = `${existing}+${sumTerm}`
      } else {
        newFormula = sumTerm
      }

      cell.value = { formula: newFormula }
    }
  }
}

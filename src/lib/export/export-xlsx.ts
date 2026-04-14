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
  type BsAccountEntry,
  type BsSection,
} from '@/data/catalogs/balance-sheet-catalog'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'

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

  // 5. Add "RINCIAN NERACA" detail sheet with ALL BS accounts
  if (state.balanceSheet && state.home) {
    addBsDetailSheet(workbook, state.balanceSheet, state.home.tahunTransaksi)
  }

  // 6. Generate output
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
// Internal: "RINCIAN NERACA" detail sheet — ALL BS accounts with values
// ---------------------------------------------------------------------------

const SECTION_ORDER: readonly BsSection[] = [
  'current_assets',
  // fixed_assets removed — now cross-referenced from FA store, not user accounts
  'other_non_current_assets',
  'intangible_assets',
  'current_liabilities',
  'non_current_liabilities',
  'equity',
]

const SECTION_HEADER_LABELS: Record<BsSection, string> = {
  current_assets: 'CURRENT ASSETS (Aset Lancar)',
  fixed_assets: 'FIXED ASSETS (Aset Tetap)',
  other_non_current_assets: 'OTHER NON-CURRENT ASSETS (Aset Tidak Lancar Lainnya)',
  intangible_assets: 'INTANGIBLE ASSETS (Aset Tak Berwujud)',
  current_liabilities: 'CURRENT LIABILITIES (Liabilitas Jangka Pendek)',
  non_current_liabilities: 'NON-CURRENT LIABILITIES (Liabilitas Jangka Panjang)',
  equity: 'EQUITY (Ekuitas)',
}

/**
 * Add a "RINCIAN NERACA" worksheet to the workbook containing ALL user BS
 * accounts with their individual values, grouped by section. Each section
 * ends with a SUM formula subtotal. Fully editable by the user.
 */
export function addBsDetailSheet(
  workbook: ExcelJS.Workbook,
  bs: BalanceSheetInputState,
  tahunTransaksi: number,
): void {
  if (!bs.accounts || bs.accounts.length === 0) return

  const years = computeHistoricalYears(tahunTransaksi, bs.yearCount ?? 1)
  const ws = workbook.addWorksheet('RINCIAN NERACA')

  // Formatting constants
  const headerFont: Partial<ExcelJS.Font> = { bold: true, size: 11 }
  const sectionFont: Partial<ExcelJS.Font> = { bold: true, size: 10, color: { argb: 'FF1E293B' } }
  const subtotalFont: Partial<ExcelJS.Font> = { bold: true, size: 10 }
  const idrFormat = '#,##0'

  // Column widths: A = label (40), B+ = years (18 each)
  ws.getColumn(1).width = 45
  for (let i = 0; i < years.length; i++) {
    ws.getColumn(i + 2).width = 20
  }

  let r = 1

  // Title
  ws.getCell(`A${r}`).value = 'RINCIAN NERACA (Balance Sheet Detail)'
  ws.getCell(`A${r}`).font = { bold: true, size: 13 }
  r += 2

  // Year headers
  ws.getCell(`A${r}`).value = 'Nama Akun'
  ws.getCell(`A${r}`).font = headerFont
  for (let i = 0; i < years.length; i++) {
    const col = String.fromCharCode(66 + i) // B, C, D, ...
    ws.getCell(`${col}${r}`).value = years[i]
    ws.getCell(`${col}${r}`).font = headerFont
    ws.getCell(`${col}${r}`).alignment = { horizontal: 'right' }
  }
  r++

  // Group accounts by section
  const bySection = new Map<BsSection, BsAccountEntry[]>()
  for (const acc of bs.accounts) {
    const existing = bySection.get(acc.section) ?? []
    existing.push(acc)
    bySection.set(acc.section, existing)
  }

  for (const section of SECTION_ORDER) {
    const sectionAccounts = bySection.get(section)
    if (!sectionAccounts || sectionAccounts.length === 0) continue

    // Section header
    r++
    ws.getCell(`A${r}`).value = SECTION_HEADER_LABELS[section]
    ws.getCell(`A${r}`).font = sectionFont
    ws.getCell(`A${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }
    for (let i = 0; i < years.length; i++) {
      ws.getCell(`${String.fromCharCode(66 + i)}${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }
    }
    r++

    const firstDataRow = r

    // Account rows
    for (const acc of sectionAccounts) {
      const catalog = BS_CATALOG_ALL.find((c) => c.id === acc.catalogId)
      const label = acc.customLabel ?? (catalog ? `${catalog.labelEn} / ${catalog.labelId}` : acc.catalogId)
      ws.getCell(`A${r}`).value = `  ${label}`

      const yearValues = bs.rows[acc.excelRow]
      for (let i = 0; i < years.length; i++) {
        const col = String.fromCharCode(66 + i)
        const val = yearValues?.[years[i]]
        if (val !== undefined && val !== null) {
          ws.getCell(`${col}${r}`).value = val
          ws.getCell(`${col}${r}`).numFmt = idrFormat
          ws.getCell(`${col}${r}`).alignment = { horizontal: 'right' }
        }
      }
      r++
    }

    const lastDataRow = r - 1

    // Subtotal with SUM formula
    ws.getCell(`A${r}`).value = `  Subtotal ${SECTION_HEADER_LABELS[section].split(' (')[0]}`
    ws.getCell(`A${r}`).font = subtotalFont
    for (let i = 0; i < years.length; i++) {
      const col = String.fromCharCode(66 + i)
      ws.getCell(`${col}${r}`).value = { formula: `SUM(${col}${firstDataRow}:${col}${lastDataRow})` }
      ws.getCell(`${col}${r}`).numFmt = idrFormat
      ws.getCell(`${col}${r}`).font = subtotalFont
      ws.getCell(`${col}${r}`).alignment = { horizontal: 'right' }
      ws.getCell(`${col}${r}`).border = { top: { style: 'thin' } }
    }
    r++
  }
}

import type ExcelJS from 'exceljs'
import type { ExportableState } from './export-xlsx'
import { BS_CATALOG_ALL } from '@/data/catalogs/balance-sheet-catalog'
import type { BsSection } from '@/data/catalogs/balance-sheet-catalog'
import { resolveLabel } from './sheet-builders/label-writer'

// ---------------------------------------------------------------------------
// Session 042 Task 2 — AAM extended-catalog injection
//
// The AAM template (rows 1-75 inclusive) has fixed mapping
// `BS_ROW_TO_AAM_D_ROW` covering baseline BS accounts 8-14, 22-23, 31-34,
// 38-39. Extended/custom BS accounts (excelRow ≥ 100 or ≥ 1000) had no
// home in AAM prior to Session 042.
//
// We allocate synthetic AAM rows ≥ 100 per section, split CL/NCL by IBD
// classification (driven by `state.interestBearingDebt` exclusion sets —
// single source of truth per LESSON-119), and append contribution to
// existing template subtotal / NAV / IBD formulas.
//
// Design D2: per extended account —
//   - Column B: label via resolveLabel
//   - Column C: static BS value for latest historical year (tahunTransaksi-1)
//   - Column D: per-row adjustment from state.aamAdjustments (if present)
//   - Column E: live formula `=C{row}+D{row}` (user edits D → E recomputes)
//
// Subtotal / NAV / IBD append pattern mirrors Session 025 BS Approach E3.
// ---------------------------------------------------------------------------

interface AamExtendedBand {
  /** Synthetic AAM row range [start, end] inclusive. */
  readonly range: readonly [number, number]
  /** Subtotal row whose formulas get +SUM(range) appended. */
  readonly subtotalRow: number
  /** Which columns on the subtotal row receive the append. */
  readonly subtotalColumns: readonly ('C' | 'E')[]
}

// The ranges are chosen to sit comfortably past AAM template bottom
// (~row 75) with 20-slot budgets per band.
const AAM_BAND_CA: AamExtendedBand = {
  range: [100, 119],
  subtotalRow: 16,
  subtotalColumns: ['C', 'E'],
}
const AAM_BAND_NCA: AamExtendedBand = {
  range: [120, 139],
  subtotalRow: 22,
  // C22 uses cross-sheet ref 'BALANCE SHEET'!F25 which already includes
  // BS extended NCA via Session 025 append. Appending here would
  // double-count. E22 uses SUM(E20:E21) which does NOT include extended
  // so it must pick up the range.
  subtotalColumns: ['E'],
}
const AAM_BAND_CL_IBD: AamExtendedBand = {
  range: [140, 159],
  subtotalRow: 32,
  subtotalColumns: ['C', 'E'],
}
const AAM_BAND_CL_NON_IBD: AamExtendedBand = {
  range: [160, 179],
  subtotalRow: 32,
  subtotalColumns: ['C', 'E'],
}
const AAM_BAND_NCL_IBD: AamExtendedBand = {
  range: [180, 199],
  subtotalRow: 37,
  subtotalColumns: ['C', 'E'],
}
const AAM_BAND_NCL_NON_IBD: AamExtendedBand = {
  range: [200, 219],
  subtotalRow: 37,
  subtotalColumns: ['C', 'E'],
}
const AAM_BAND_EQUITY: AamExtendedBand = {
  range: [220, 239],
  subtotalRow: 47,
  subtotalColumns: ['C', 'E'],
}

// Row 51 NAV subtracts non-IBD liabilities: -SUM over the two non-IBD
// ranges. Column E only — NAV is computed in col E.
const AAM_NAV_ROW = 51
// Row 52 IBD sums IBD liabilities: +SUM over the two IBD ranges.
// Column C — template formula `=+C28+C35` references col C.
const AAM_IBD_ROW = 52

interface AppendedRange {
  /** Column of the formula cell being mutated. */
  readonly cellCol: 'C' | 'E'
  /** Column that the SUM range iterates (may differ from cellCol — e.g.
   * AAM row 52 formula at E52 references `C28+C35`, so SUM also over col C). */
  readonly sumCol: 'C' | 'E'
  readonly row: number
  readonly start: number
  readonly end: number
  /** `+` = add, `-` = subtract. */
  readonly sign: '+' | '-'
}

function classifyAccount(
  section: string,
  excelRow: number,
  excludedCurrentLiabilities: ReadonlySet<number>,
  excludedNonCurrentLiabilities: ReadonlySet<number>,
): AamExtendedBand | null {
  switch (section as BsSection) {
    case 'current_assets':
      return AAM_BAND_CA
    case 'intangible_assets':
    case 'other_non_current_assets':
      return AAM_BAND_NCA
    case 'current_liabilities':
      return excludedCurrentLiabilities.has(excelRow)
        ? AAM_BAND_CL_NON_IBD
        : AAM_BAND_CL_IBD
    case 'non_current_liabilities':
      return excludedNonCurrentLiabilities.has(excelRow)
        ? AAM_BAND_NCL_NON_IBD
        : AAM_BAND_NCL_IBD
    case 'equity':
      return AAM_BAND_EQUITY
    // fixed_assets handled by BS cross-ref in existing template (FA→BS→AAM)
    case 'fixed_assets':
    default:
      return null
  }
}

/**
 * Inject extended BS accounts (excelRow ≥ 100 or custom ≥ 1000) into AAM.
 *
 * For each eligible account:
 *   - Pick the AAM band based on section + IBD classification
 *   - Slot index = index of account within its band's eligible set (preserves
 *     insertion order from state.balanceSheet.accounts)
 *   - Synthetic AAM row = band.range[0] + slotIndex
 *   - Write label B, value C, adjustment D (optional), formula E
 *
 * After all writes, append SUM-based contribution to affected subtotal /
 * NAV / IBD formulas.
 */
export function injectAamExtendedAccounts(
  workbook: ExcelJS.Workbook,
  state: ExportableState,
): void {
  const bs = state.balanceSheet
  const home = state.home
  if (!bs || !home) return

  const ws = workbook.getWorksheet('AAM')
  if (!ws) return

  const ibdScope = state.interestBearingDebt
  const excludedCL = new Set(ibdScope?.excludedCurrentLiabilities ?? [])
  const excludedNCL = new Set(ibdScope?.excludedNonCurrentLiabilities ?? [])

  // Filter extended accounts and group by target band to allocate slots.
  const extendedAccounts = bs.accounts.filter((a) => a.excelRow >= 100)
  if (extendedAccounts.length === 0) return

  // Latest historical year (AAM C column semantic — matches template
  // `='BALANCE SHEET'!F<row>` which references the latest historical col).
  const latestYear = home.tahunTransaksi - 1

  const adjustments = state.aamAdjustments ?? {}
  const slotCounters = new Map<AamExtendedBand, number>()
  const usedBands = new Set<AamExtendedBand>()

  for (const acc of extendedAccounts) {
    const band = classifyAccount(
      acc.section as string,
      acc.excelRow,
      excludedCL,
      excludedNCL,
    )
    if (!band) continue

    const slot = slotCounters.get(band) ?? 0
    const targetRow = band.range[0] + slot
    if (targetRow > band.range[1]) continue // band overflow — silently skip
    slotCounters.set(band, slot + 1)
    usedBands.add(band)

    // Column B — label
    ws.getCell(`B${targetRow}`).value = resolveLabel(acc, BS_CATALOG_ALL, bs.language)

    // Column C — static BS value for latest historical year
    const cValue = bs.rows[acc.excelRow]?.[latestYear]
    if (cValue !== undefined && cValue !== null) {
      ws.getCell(`C${targetRow}`).value = cValue
    }

    // Column D — per-row adjustment
    const adj = adjustments[acc.excelRow]
    if (adj !== undefined && adj !== 0) {
      ws.getCell(`D${targetRow}`).value = adj
    }

    // Column E — live formula =C+D
    ws.getCell(`E${targetRow}`).value = {
      formula: `C${targetRow}+D${targetRow}`,
    }
  }

  // Append contribution to subtotal formulas for used bands.
  const pending: AppendedRange[] = []
  for (const band of usedBands) {
    for (const col of band.subtotalColumns) {
      pending.push({
        cellCol: col,
        sumCol: col,
        row: band.subtotalRow,
        start: band.range[0],
        end: band.range[1],
        sign: '+',
      })
    }
  }

  // NAV row 51 (E51 = E24 - non-IBD CL - non-IBD NCL): subtract non-IBD ranges.
  if (usedBands.has(AAM_BAND_CL_NON_IBD)) {
    pending.push({
      cellCol: 'E',
      sumCol: 'E',
      row: AAM_NAV_ROW,
      start: AAM_BAND_CL_NON_IBD.range[0],
      end: AAM_BAND_CL_NON_IBD.range[1],
      sign: '-',
    })
  }
  if (usedBands.has(AAM_BAND_NCL_NON_IBD)) {
    pending.push({
      cellCol: 'E',
      sumCol: 'E',
      row: AAM_NAV_ROW,
      start: AAM_BAND_NCL_NON_IBD.range[0],
      end: AAM_BAND_NCL_NON_IBD.range[1],
      sign: '-',
    })
  }

  // IBD row 52 (E52 = +C28+C35): add IBD ranges; formula cell at E52
  // but SUM references col C to match template convention.
  if (usedBands.has(AAM_BAND_CL_IBD)) {
    pending.push({
      cellCol: 'E',
      sumCol: 'C',
      row: AAM_IBD_ROW,
      start: AAM_BAND_CL_IBD.range[0],
      end: AAM_BAND_CL_IBD.range[1],
      sign: '+',
    })
  }
  if (usedBands.has(AAM_BAND_NCL_IBD)) {
    pending.push({
      cellCol: 'E',
      sumCol: 'C',
      row: AAM_IBD_ROW,
      start: AAM_BAND_NCL_IBD.range[0],
      end: AAM_BAND_NCL_IBD.range[1],
      sign: '+',
    })
  }

  for (const append of pending) {
    appendSumToCell(ws, append)
  }
}

function appendSumToCell(
  ws: ExcelJS.Worksheet,
  append: AppendedRange,
): void {
  const cell = ws.getCell(`${append.cellCol}${append.row}`)
  const current = cell.value
  const appendFragment = `${append.sign}SUM(${append.sumCol}${append.start}:${append.sumCol}${append.end})`
  let existingFormula: string | null = null

  if (
    current !== null &&
    typeof current === 'object' &&
    'formula' in current &&
    typeof (current as { formula?: unknown }).formula === 'string'
  ) {
    existingFormula = (current as { formula: string }).formula
  }

  const newFormula = existingFormula
    ? `${existingFormula}${appendFragment}`
    : appendFragment.replace(/^\+/, '') // strip leading +

  cell.value = { formula: newFormula }
}

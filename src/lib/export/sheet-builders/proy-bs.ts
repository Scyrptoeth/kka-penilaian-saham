import type { SheetBuilder } from './types'
import { computeFullProjectionPipeline } from '@/lib/calculations/projection-pipeline'
import { BS_CATALOG_ALL } from '@/data/catalogs/balance-sheet-catalog'
import { resolveLabel } from './label-writer'

const SHEET_NAME = 'PROY BALANCE SHEET'

/**
 * Session 036 — Input BS row → Proy BS template row mapping.
 *
 * computeProyBsLive emits rows keyed by Input BS manifest row numbers
 * (8, 10, 16, 27, 35, 49, 51, etc.). The PT Raja Voltama prototipe
 * Proy BS template uses different row numbers (9, 13, 21, 33, 45, 60,
 * 62, etc.). This map translates when writing.
 *
 * Extended/custom accounts (excelRow >= 100 or >= 1000) have no template
 * slot; deferred to future session extended injection.
 */
const INPUT_BS_TO_PROY_BS_TEMPLATE: Record<number, number> = {
  // Current Assets leaves
  8: 9,   // Cash on Hands
  9: 11,  // Cash in Banks / Deposito
  10: 13, // Account Receivable
  11: 15, // Other Receivable / Deposito
  12: 17, // Inventory
  14: 19, // Others (Prepaid)
  16: 21, // Total Current Assets

  // Non-Current Assets
  20: 25, // Fixed Assets Beginning
  21: 26, // Accumulated Depreciation
  22: 28, // Fixed Assets Net
  23: 29, // Other Non-Current
  24: 30, // Intangible Assets
  25: 31, // Total Non-Current Assets

  // TOTAL ASSETS
  27: 33,

  // Current Liabilities
  31: 37, // Bank Loan-ST
  32: 39, // Account Payables
  33: 41, // Tax Payable
  34: 43, // Others CL
  35: 45, // Total CL

  // Non-Current Liabilities
  38: 48, // Bank Loan-LT
  39: 50, // Other NCL
  40: 52, // Total NCL
  // 41 Total Liabilities intentionally unmapped — not shown on Proy BS template

  // Equity
  43: 55, // Paid-Up Capital
  46: 57, // Surplus
  47: 58, // Current Profit
  48: 59, // Retained Earnings Ending
  49: 60, // Shareholders Equity Subtotal
  51: 62, // Total L&E

  63: 63, // Balance Control (same row)
}

export const ProyBsBuilder: SheetBuilder = {
  sheetName: SHEET_NAME,
  upstream: ['home', 'balanceSheet', 'incomeStatement', 'fixedAsset', 'keyDrivers'],
  build(workbook, state) {
    const ws = workbook.getWorksheet(SHEET_NAME)
    if (
      !ws ||
      !state.home ||
      !state.balanceSheet ||
      !state.incomeStatement ||
      !state.fixedAsset ||
      !state.keyDrivers
    ) {
      return
    }

    const pipeline = computeFullProjectionPipeline({
      home: state.home,
      balanceSheet: state.balanceSheet,
      incomeStatement: state.incomeStatement,
      fixedAsset: state.fixedAsset,
      keyDrivers: state.keyDrivers,
      changesInWorkingCapital: state.changesInWorkingCapital,
    })

    const { proyBsRows, lastHistYear, projYears } = pipeline

    const cols: Array<[string, number]> = [
      ['C', lastHistYear],
      ['D', projYears[0] ?? 0],
      ['E', projYears[1] ?? 0],
      ['F', projYears[2] ?? 0],
    ]

    for (const [col, year] of cols) {
      if (!year) continue
      for (const keyStr of Object.keys(proyBsRows)) {
        const inputBsRow = Number(keyStr)
        const templateRow = INPUT_BS_TO_PROY_BS_TEMPLATE[inputBsRow]
        if (templateRow === undefined) continue // extended/custom handled below
        const val = proyBsRows[inputBsRow]?.[year]
        if (val !== undefined && Number.isFinite(val)) {
          ws.getCell(`${col}${templateRow}`).value = val
        }
      }
    }

    // Session 040 — Extended catalog (excelRow ≥ 100) + custom (≥ 1000)
    // injection at synthetic rows. Subtotals already include extended
    // contributions via deriveComputedRows + dynamic manifest computedFrom,
    // so we only write leaf labels + values — no formula modification.
    // Diverges from Session 025 BS pattern (which appends +SUM to live
    // subtotal formulas) because PROY BS writes STATIC computed values.
    const { accounts, language } = state.balanceSheet
    for (const acc of accounts) {
      if (acc.excelRow < 100) continue // baseline handled above
      ws.getCell(`B${acc.excelRow}`).value = resolveLabel(acc, BS_CATALOG_ALL, language)
      const series = proyBsRows[acc.excelRow]
      if (!series) continue
      for (const [col, year] of cols) {
        if (!year) continue
        const val = series[year]
        if (val !== undefined && Number.isFinite(val)) {
          ws.getCell(`${col}${acc.excelRow}`).value = val
        }
      }
    }
  },
}

/**
 * Cash Flow Statement live compute adapter.
 *
 * Maps upstream data (BS, IS, FA, AP) into CFS manifest leaf rows.
 * The caller feeds the result into `deriveComputedRows` with the CFS
 * manifest, which then produces the subtotals (rows 10, 11, 19, 28, 30).
 *
 * Sign conventions:
 *   - IS leaves: user-positive (expenses entered as positive numbers)
 *   - BS leaves: natural values (positive)
 *   - FA leaves: natural values (positive)
 *   - AP rows: natural values (nullable, defaults to 0)
 *
 * Column offset (LESSON-013):
 *   BS uses 4 years (2018-2021, cols C-F)
 *   CFS uses 3 years (2019-2021, cols C-E)
 *   CFS row 9 (CL delta) year 1 needs BS prior year (2018)
 *
 * Row 8 asymmetry (workbook design choice):
 *   Year 1: -(absolute CA level)  — no prior-year subtraction
 *   Year 2+: -(CA delta)          — standard YoY change
 *   Row 9 uses delta for ALL years including year 1.
 */

import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { FIXED_ASSET_MANIFEST } from '@/data/manifests/fixed-asset'
import type { YearKeyedSeries } from '@/types/financial'

/** BS current-asset rows used by CFS (excludes cash rows 8, 9) */
const BS_CA_ROWS = [10, 11, 12, 14] as const

/** BS current-liability rows used by CFS */
const BS_CL_ROWS = [31, 32, 33, 34] as const

/** BS cash rows (Cash on Hand + Cash in Bank) */
const BS_CASH_ROWS = [8, 9] as const

function sumRows(
  data: Record<number, YearKeyedSeries>,
  rows: readonly number[],
  year: number,
): number {
  return rows.reduce((sum, r) => sum + (data[r]?.[year] ?? 0), 0)
}

/**
 * Compute CFS leaf/pseudo-leaf rows from upstream data.
 *
 * Returns all CFS manifest rows EXCEPT those with `computedFrom`
 * (rows 10, 11, 19, 28, 30 — handled by `deriveComputedRows`).
 *
 * @param bsRows   BS leaf values (natural sign, keyed by BS excelRow)
 * @param isLeaves IS leaf values (user-positive — expenses entered positive)
 * @param faLeaves FA leaf values (natural sign, nullable if FA not entered)
 * @param apRows   ACC PAYABLES leaf values (nullable, defaults financing to 0)
 * @param cfsYears CFS year span, e.g. [2019, 2020, 2021]
 * @param bsYears  BS year span, e.g. [2018, 2019, 2020, 2021] — first entry
 *                 is the prior year needed for CL delta and Cash Beginning
 */
export function computeCashFlowLiveRows(
  bsRows: Record<number, YearKeyedSeries>,
  isLeaves: Record<number, YearKeyedSeries>,
  faLeaves: Record<number, YearKeyedSeries> | null,
  apRows: Record<number, YearKeyedSeries> | null,
  cfsYears: readonly number[],
  bsYears: readonly number[],
): Record<number, YearKeyedSeries> {
  // IS store now contains pre-computed sentinel values (EBITDA at row 18, etc.)

  // Compute FA subtotals — need Total Additions (row 23) for CapEx
  // Sentinel subtotals in store override re-derived values (include extended accounts)
  const faRecomputed = faLeaves
    ? deriveComputedRows(FIXED_ASSET_MANIFEST.rows, faLeaves, cfsYears)
    : null
  const faComputed = faRecomputed
    ? { ...faRecomputed, ...faLeaves }
    : null

  const out: Record<number, YearKeyedSeries> = {}
  const set = (row: number, year: number, value: number) => {
    if (!out[row]) out[row] = {}
    out[row][year] = value
  }

  for (let i = 0; i < cfsYears.length; i++) {
    const year = cfsYears[i]
    const isFirstYear = i === 0

    // ── OPERATIONS ──

    // Row 5: EBITDA = IS row 18 (sentinel, positive for profit)
    set(5, year, isLeaves[18]?.[year] ?? 0)

    // Row 6: Corporate Tax = IS row 33 (direct — already negative per Excel convention)
    // Workbook: ='INCOME STATEMENT'!D33 (no sign flip)
    set(6, year, isLeaves[33]?.[year] ?? 0)

    // Row 8: Current Assets change (excl cash)
    // Year 1: -(absolute CA level) — workbook formula: =(BS!D10+D11+D12+D14)*-1
    // Year 2+: -(CA delta)         — workbook formula: =((BS!E...-BS!D...))*-1
    const caThisYear = sumRows(bsRows, BS_CA_ROWS, year)
    if (isFirstYear) {
      set(8, year, -caThisYear)
    } else {
      const caPriorYear = sumRows(bsRows, BS_CA_ROWS, cfsYears[i - 1])
      set(8, year, -(caThisYear - caPriorYear))
    }

    // Row 9: Current Liabilities change (delta ALL years)
    // Year 1 prior year = bsYears[0] (e.g. 2018)
    // Year 2+ prior year = cfsYears[i-1]
    const clThisYear = sumRows(bsRows, BS_CL_ROWS, year)
    const clPriorYear = sumRows(
      bsRows,
      BS_CL_ROWS,
      isFirstYear ? bsYears[0] : cfsYears[i - 1],
    )
    set(9, year, clThisYear - clPriorYear)

    // ── NON-OPERATING ──

    // Row 13: Non-operating = IS row 30 (user-signed, direct)
    set(13, year, isLeaves[30]?.[year] ?? 0)

    // ── INVESTMENT ──

    // Row 17: CapEx = FA row 23 (Total Additions) × -1
    // Workbook: ='FIXED ASSET'!C23*-1
    set(17, year, -(faComputed?.[23]?.[year] ?? 0))

    // ── FINANCING ──

    // Row 22: Equity Injection (leaf, no input source — default 0)
    set(22, year, 0)

    // Row 23: New Loan = ACC PAYABLES row 10 + row 19
    // Workbook: ='ACC PAYABLES'!C10+'ACC PAYABLES'!C19
    set(
      23,
      year,
      (apRows?.[10]?.[year] ?? 0) + (apRows?.[19]?.[year] ?? 0),
    )

    // Row 24: Interest Payment = IS row 27 (direct — already negative per Excel convention)
    // Workbook: ='INCOME STATEMENT'!D27 (no sign flip)
    set(24, year, isLeaves[27]?.[year] ?? 0)

    // Row 25: Interest Income = IS row 26 (not expense, direct)
    set(25, year, isLeaves[26]?.[year] ?? 0)

    // Row 26: Principal Repayment = ACC PAYABLES row 20
    set(26, year, apRows?.[20]?.[year] ?? 0)

    // ── CASH BALANCES ──

    // Row 32: Cash Beginning = BS prior year (rows 8+9)
    // Year 1: BS year[0] (e.g. 2018). Year 2+: previous CFS year.
    const beginYear = isFirstYear ? bsYears[0] : cfsYears[i - 1]
    set(32, year, sumRows(bsRows, BS_CASH_ROWS, beginYear))

    // Row 33: Cash Ending = BS current year (rows 8+9)
    set(33, year, sumRows(bsRows, BS_CASH_ROWS, year))

    // Row 35: Cash in Bank = BS row 9 current year
    set(35, year, bsRows[9]?.[year] ?? 0)

    // Row 36: Cash on Hand = BS row 8 current year
    set(36, year, bsRows[8]?.[year] ?? 0)
  }

  return out
}

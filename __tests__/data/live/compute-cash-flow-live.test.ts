/**
 * Fixture-grounded integration test for CFS live mode.
 *
 * Loads BS, IS, FA leaf values from fixtures (simulating user input),
 * feeds them through `computeCashFlowLiveRows` + `deriveComputedRows`,
 * and asserts every CFS row matches the workbook fixture values for
 * all 3 historical years.
 *
 * IS expense rows are sign-flipped to simulate user-positive input
 * convention (users enter expenses as positive numbers).
 */

import { describe, expect, it } from 'vitest'
import { computeCashFlowLiveRows } from '@/data/live/compute-cash-flow-live'
import { computeCashBalance } from '@/lib/calculations/compute-cash-balance'
import { computeCashAccount } from '@/lib/calculations/compute-cash-account'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { CASH_FLOW_STATEMENT_MANIFEST } from '@/data/manifests/cash-flow-statement'
// INCOME_STATEMENT_MANIFEST removed — IS values read directly from fixture
import type { YearKeyedSeries } from '@/types/financial'
import type { BsAccountEntry } from '@/data/catalogs/balance-sheet-catalog'
import {
  balanceSheetCells,
  incomeStatementCells,
  fixedAssetCells,
  cashFlowStatementCells,
  num,
  numOpt,
} from '../../helpers/fixture'

// ── Column maps per sheet (LESSON-013) ──
const BS_COL: Record<number, string> = {
  2018: 'C',
  2019: 'D',
  2020: 'E',
  2021: 'F',
}
const IS_COL: Record<number, string> = {
  2019: 'D',
  2020: 'E',
  2021: 'F',
}
const FA_COL: Record<number, string> = {
  2019: 'C',
  2020: 'D',
  2021: 'E',
}
const CFS_COL: Record<number, string> = {
  2019: 'C',
  2020: 'D',
  2021: 'E',
}

const BS_YEARS = [2018, 2019, 2020, 2021]
const CFS_YEARS = [2019, 2020, 2021]

// ── IS leaf configuration ──
const IS_LEAF_ROWS = [6, 7, 12, 13, 21, 26, 27, 30, 33]

// ── BS leaf rows referenced by CFS ──
const BS_ROWS = [8, 9, 10, 11, 12, 13, 14, 31, 32, 33, 34]

// ── FA leaf rows (Beginning + Additions for Acq and Dep) ──
const FA_LEAF_ROWS = [
  8, 9, 10, 11, 12, 13, // Beginning Acquisition
  17, 18, 19, 20, 21, 22, // Additions Acquisition
  36, 37, 38, 39, 40, 41, // Beginning Depreciation
  45, 46, 47, 48, 49, 50, // Additions Depreciation
]

function loadBsLeaves(): Record<number, YearKeyedSeries> {
  const out: Record<number, YearKeyedSeries> = {}
  for (const row of BS_ROWS) {
    const series: YearKeyedSeries = {}
    for (const year of BS_YEARS) {
      series[year] = numOpt(balanceSheetCells, `${BS_COL[year]}${row}`) ?? 0
    }
    out[row] = series
  }
  return out
}

function loadIsLeaves(): Record<number, YearKeyedSeries> {
  const out: Record<number, YearKeyedSeries> = {}
  // Read IS values in Excel convention (expenses negative) — NO sign flip.
  // Sentinel rows (8, 18, 22, 28, 32, 35) read directly from fixture.
  const ALL_IS_ROWS = [...IS_LEAF_ROWS, 8, 15, 18, 22, 26, 27, 28, 30, 32, 33, 35]
  const unique = [...new Set(ALL_IS_ROWS)]
  for (const row of unique) {
    const series: YearKeyedSeries = {}
    for (const year of CFS_YEARS) {
      series[year] = numOpt(incomeStatementCells, `${IS_COL[year]}${row}`) ?? 0
    }
    out[row] = series
  }
  return out
}

function loadFaLeaves(): Record<number, YearKeyedSeries> {
  const out: Record<number, YearKeyedSeries> = {}
  for (const row of FA_LEAF_ROWS) {
    const series: YearKeyedSeries = {}
    for (const year of CFS_YEARS) {
      series[year] = numOpt(fixedAssetCells, `${FA_COL[year]}${row}`) ?? 0
    }
    out[row] = series
  }
  return out
}

describe('CFS live mode matches fixture at all historical years', () => {
  const bsLeaves = loadBsLeaves()
  const isLeaves = loadIsLeaves()
  const faLeaves = loadFaLeaves()

  // Simulate a user whose BS mirrors the PT Raja Voltama prototipe structure:
  // Current Assets at rows 8-14; Current Liabilities at rows 31-34.
  // To reproduce the prototipe CFS formula `(BS!D10+D11+D12+D14)*-1`, the
  // user has excluded Cash (rows 8, 9) + Prepaid Expenses (row 13) from
  // Operating Working Capital via the /analysis/changes-in-working-capital
  // page. CL includes all 4 rows (no exclusions).
  const bsAccounts: BsAccountEntry[] = [
    { catalogId: 'cash', excelRow: 8, section: 'current_assets' },
    { catalogId: 'cash_bank', excelRow: 9, section: 'current_assets' },
    { catalogId: 'account_receivable', excelRow: 10, section: 'current_assets' },
    { catalogId: 'other_receivable', excelRow: 11, section: 'current_assets' },
    { catalogId: 'inventory', excelRow: 12, section: 'current_assets' },
    { catalogId: 'prepaid_expenses', excelRow: 13, section: 'current_assets' },
    { catalogId: 'other_current_assets', excelRow: 14, section: 'current_assets' },
    { catalogId: 'short_term_debt', excelRow: 31, section: 'current_liabilities' },
    { catalogId: 'account_payable', excelRow: 32, section: 'current_liabilities' },
    { catalogId: 'tax_payable', excelRow: 33, section: 'current_liabilities' },
    { catalogId: 'other_current_liab', excelRow: 34, section: 'current_liabilities' },
  ]
  const excludedCA = [8, 9, 13]
  const excludedCL: number[] = []

  // Session 055 — feed Cash Balance / Cash Account scope results that
  // reproduce the legacy "BS rows 8+9" behavior the fixture expects.
  //  - Cash Balance scope: both rows 8 + 9 count as cash.
  //  - Cash Account scope: row 9 → bank, row 8 → cashOnHand (matches the
  //    legacy hardcoded mapping for CFS rows 35/36).
  const cashBalanceResult = computeCashBalance({
    scope: { accounts: [8, 9] },
    bsRows: bsLeaves,
    cfsYears: CFS_YEARS,
    bsYears: BS_YEARS,
  })
  const cashAccountResult = computeCashAccount({
    scope: { bank: [9], cashOnHand: [8] },
    bsRows: bsLeaves,
    years: CFS_YEARS,
  })

  // Compute CFS leaf rows from upstream data
  const cfsLeafRows = computeCashFlowLiveRows(
    bsAccounts,
    bsLeaves,
    isLeaves,
    faLeaves,
    null, // AP not populated (all zeros — matches prototype)
    CFS_YEARS,
    BS_YEARS,
    excludedCA,
    excludedCL,
    cashBalanceResult,
    cashAccountResult,
  )

  // Derive subtotals via CFS manifest computedFrom
  const cfsComputed = deriveComputedRows(
    CASH_FLOW_STATEMENT_MANIFEST.rows,
    cfsLeafRows,
    CFS_YEARS,
  )

  // Merge leaf + computed for assertion
  const allRows: Record<number, YearKeyedSeries> = {
    ...cfsLeafRows,
    ...cfsComputed,
  }

  // All CFS manifest excelRows to verify
  const CFS_ROWS = [5, 6, 8, 9, 10, 11, 13, 17, 19, 22, 23, 24, 25, 26, 28, 30, 32, 33, 35, 36]

  for (const row of CFS_ROWS) {
    for (const year of CFS_YEARS) {
      it(`row ${row} at ${year} matches fixture`, () => {
        const expected = num(
          cashFlowStatementCells,
          `${CFS_COL[year]}${row}`,
        )
        const actual = allRows[row]?.[year]
        expect(actual).toBeDefined()
        expect(actual).toBeCloseTo(expected, 6)
      })
    }
  }
})

describe('CFS account-driven WC aggregation (Session 039)', () => {
  // CFS spans [2019, 2020, 2021]; BS spans [2018, 2019, 2020, 2021].
  // Year 2019 is CFS index-0 → `isFirstYear` path (absolute-level, not delta).
  // Year 2020 / 2021 follow standard YoY delta formula.
  const years = [2019, 2020, 2021]
  const bsYears = [2018, 2019, 2020, 2021]
  // IS leaves: only the fields the CFS adapter reads — minimal fixture
  const isLeaves: Record<number, YearKeyedSeries> = {
    18: { 2019: 800, 2020: 1000, 2021: 1500 }, // EBITDA (sentinel)
    26: { 2019: 0, 2020: 0, 2021: 0 },
    27: { 2019: 0, 2020: 0, 2021: 0 },
    30: { 2019: 0, 2020: 0, 2021: 0 },
    33: { 2019: -80, 2020: -100, 2021: -150 }, // Tax
  }

  it('aggregates extended-catalog accounts (excelRow ≥ 100) into ΔCA delta years', () => {
    const bsAccounts: BsAccountEntry[] = [
      { catalogId: 'account_receivable', excelRow: 10, section: 'current_assets' },
      { catalogId: 'short_term_invest', excelRow: 100, section: 'current_assets' },
      { catalogId: 'employee_receivable', excelRow: 110, section: 'current_assets' },
    ]
    const bsRows: Record<number, YearKeyedSeries> = {
      10: { 2018: 80, 2019: 100, 2020: 150, 2021: 180 },
      100: { 2018: 400, 2019: 500, 2020: 700, 2021: 900 },
      110: { 2018: 0, 2019: 0, 2020: 50, 2021: 75 },
    }
    const out = computeCashFlowLiveRows(
      bsAccounts, bsRows, isLeaves, null, null, years, bsYears, [], [],
    )
    // Year 2020 (delta): -((150+700+50) − (100+500+0)) = -300
    expect(out[8]![2020]).toBe(-300)
    // Year 2021 (delta): -((180+900+75) − (150+700+50)) = -255
    expect(out[8]![2021]).toBe(-255)
  })

  it('aggregates custom accounts (excelRow ≥ 1000) into ΔCL delta years', () => {
    const bsAccounts: BsAccountEntry[] = [
      { catalogId: 'account_payable', excelRow: 32, section: 'current_liabilities' },
      { catalogId: 'custom_1700000000000', excelRow: 1001, section: 'current_liabilities',
        customLabel: 'Custom Liab A' },
    ]
    const bsRows: Record<number, YearKeyedSeries> = {
      32: { 2018: 150, 2019: 200, 2020: 300, 2021: 250 },
      1001: { 2018: 0, 2019: 0, 2020: 50, 2021: 100 },
    }
    const out = computeCashFlowLiveRows(
      bsAccounts, bsRows, isLeaves, null, null, years, bsYears, [], [],
    )
    // Year 2020 (delta): (300+50) − (200+0) = 150
    expect(out[9]![2020]).toBe(150)
    // Year 2021 (delta): (250+100) − (300+50) = 0
    expect(out[9]![2021]).toBe(0)
  })

  it('skips excluded CA accounts (e.g. user excludes Cash)', () => {
    const bsAccounts: BsAccountEntry[] = [
      { catalogId: 'cash', excelRow: 8, section: 'current_assets' },
      { catalogId: 'cash_bank', excelRow: 9, section: 'current_assets' },
      { catalogId: 'account_receivable', excelRow: 10, section: 'current_assets' },
    ]
    const bsRows: Record<number, YearKeyedSeries> = {
      8: { 2018: 0, 2019: 1_000_000, 2020: 2_000_000, 2021: 3_000_000 },
      9: { 2018: 0, 2019: 500_000, 2020: 500_000, 2021: 500_000 },
      10: { 2018: 80, 2019: 100, 2020: 150, 2021: 180 },
    }
    const out = computeCashFlowLiveRows(
      bsAccounts, bsRows, isLeaves, null, null, years, bsYears,
      [8, 9], // excludedCA: Cash + Bank
      [],
    )
    // Only row 10 contributes. Year 2020: -(150 − 100) = -50. Year 2021: -(180 − 150) = -30.
    expect(out[8]![2020]).toBe(-50)
    expect(out[8]![2021]).toBe(-30)
  })

  it('skips excluded CL accounts (e.g. user excludes IBD)', () => {
    const bsAccounts: BsAccountEntry[] = [
      { catalogId: 'short_term_debt', excelRow: 31, section: 'current_liabilities' },
      { catalogId: 'account_payable', excelRow: 32, section: 'current_liabilities' },
    ]
    const bsRows: Record<number, YearKeyedSeries> = {
      31: { 2018: 5_000, 2019: 10_000, 2020: 20_000, 2021: 30_000 },
      32: { 2018: 150, 2019: 200, 2020: 300, 2021: 250 },
    }
    const out = computeCashFlowLiveRows(
      bsAccounts, bsRows, isLeaves, null, null, years, bsYears,
      [],
      [31], // excludedCL: Bank Loan (IBD)
    )
    // Only row 32 contributes. Year 2020: 300 − 200 = 100. Year 2021: 250 − 300 = -50.
    expect(out[9]![2020]).toBe(100)
    expect(out[9]![2021]).toBe(-50)
  })

  it('empty bsAccounts yields zero WC deltas without throwing', () => {
    const out = computeCashFlowLiveRows(
      [], {}, isLeaves, null, null, years, bsYears, [], [],
    )
    // Signed-zero accepted (JS -0 === 0 but toBe uses Object.is) — normalize via `+ 0`.
    expect(out[8]![2020]! + 0).toBe(0)
    expect(out[8]![2021]! + 0).toBe(0)
    expect(out[9]![2020]! + 0).toBe(0)
    expect(out[9]![2021]! + 0).toBe(0)
  })

  it('Cash Beginning/Ending rows default to 0 when cashBalanceResult is omitted (Session 055)', () => {
    const bsAccounts: BsAccountEntry[] = [
      { catalogId: 'cash', excelRow: 8, section: 'current_assets' },
      { catalogId: 'cash_bank', excelRow: 9, section: 'current_assets' },
    ]
    const bsRows: Record<number, YearKeyedSeries> = {
      8: { 2018: 50, 2019: 100, 2020: 200, 2021: 300 },
      9: { 2018: 25, 2019: 50, 2020: 75, 2021: 100 },
    }
    // No cashBalanceResult / cashAccountResult passed — rows 32/33/35/36
    // default to 0 (scope is required; legacy BS-row-8+9 fallback removed).
    const out = computeCashFlowLiveRows(
      bsAccounts, bsRows, isLeaves, null, null, years, bsYears,
      [8, 9],
      [],
    )
    expect(out[32]![2020]).toBe(0)
    expect(out[33]![2020]).toBe(0)
    expect(out[35]![2020]).toBe(0)
    expect(out[36]![2020]).toBe(0)
  })

  it('Cash Beginning/Ending + Bank/OnHand read from scope results when provided', () => {
    const bsAccounts: BsAccountEntry[] = [
      { catalogId: 'cash', excelRow: 8, section: 'current_assets' },
      { catalogId: 'cash_bank', excelRow: 9, section: 'current_assets' },
    ]
    const bsRows: Record<number, YearKeyedSeries> = {
      8: { 2018: 50, 2019: 100, 2020: 200, 2021: 300 },
      9: { 2018: 25, 2019: 50, 2020: 75, 2021: 100 },
    }
    const cashBalanceResult = {
      // Scope includes both cash rows; Ending = 8+9, Beginning = prior year.
      ending: { 2019: 150, 2020: 275, 2021: 400 },
      beginning: { 2019: 75, 2020: 150, 2021: 275 },
    }
    const cashAccountResult = {
      bank: { 2019: 50, 2020: 75, 2021: 100 },
      cashOnHand: { 2019: 100, 2020: 200, 2021: 300 },
    }
    const out = computeCashFlowLiveRows(
      bsAccounts, bsRows, isLeaves, null, null, years, bsYears,
      [8, 9], // excluded from WC
      [],
      cashBalanceResult,
      cashAccountResult,
    )
    // Rows are independent of WC exclusions — they come straight from scope.
    expect(out[32]![2020]).toBe(150)
    expect(out[33]![2020]).toBe(275)
    expect(out[35]![2020]).toBe(75)
    expect(out[36]![2020]).toBe(200)
  })
})

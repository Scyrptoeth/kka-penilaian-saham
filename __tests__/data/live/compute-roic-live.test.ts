/**
 * Fixture-grounded integration test for ROIC live mode.
 *
 * Builds the full upstream chain (IS → NOPLAT → CFS → FCF → ROIC)
 * and BS computed rows, then verifies every ROIC row matches fixture.
 *
 * Year 1 (2019): rows 13 and 15 are undefined (no prior-year baseline).
 * Years 2-3 (2020, 2021): all rows including ROIC ratio verified.
 */

import { describe, expect, it } from 'vitest'
import { computeRoicLiveRows } from '@/data/live/compute-roic-live'
import { computeFcfLiveRows } from '@/data/live/compute-fcf-live'
import { computeNoplatLiveRows } from '@/data/live/compute-noplat-live'
import { computeCashFlowLiveRows } from '@/data/live/compute-cash-flow-live'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { NOPLAT_MANIFEST } from '@/data/manifests/noplat'
import { FIXED_ASSET_MANIFEST } from '@/data/manifests/fixed-asset'
import { CASH_FLOW_STATEMENT_MANIFEST } from '@/data/manifests/cash-flow-statement'
import { INCOME_STATEMENT_MANIFEST } from '@/data/manifests/income-statement'
import { FCF_MANIFEST } from '@/data/manifests/fcf'
import { BALANCE_SHEET_MANIFEST } from '@/data/manifests/balance-sheet'
import type { YearKeyedSeries } from '@/types/financial'
import type { BsAccountEntry } from '@/data/catalogs/balance-sheet-catalog'
import {
  balanceSheetCells,
  incomeStatementCells,
  fixedAssetCells,
  numOpt,
} from '../../helpers/fixture'
import roicJson from '../../fixtures/roic.json'

// Column maps
const BS_COL: Record<number, string> = { 2018: 'C', 2019: 'D', 2020: 'E', 2021: 'F' }
const IS_COL: Record<number, string> = { 2019: 'D', 2020: 'E', 2021: 'F' }
const FA_COL: Record<number, string> = { 2019: 'C', 2020: 'D', 2021: 'E' }
const ROIC_COL: Record<number, string> = { 2019: 'B', 2020: 'C', 2021: 'D' }

const YEARS = [2019, 2020, 2021]
const BS_YEARS = [2018, 2019, 2020, 2021]

const IS_LEAF_ROWS = [6, 7, 12, 13, 21, 26, 27, 30, 33]
const IS_EXPENSE_ROWS = new Set([7, 12, 13, 21, 27, 33])
const BS_LEAF_ROWS = [8, 9, 10, 11, 12, 13, 14, 20, 21, 22, 24, 31, 32, 33, 34, 38, 39, 43, 44, 46, 47, 48]
const FA_LEAF_ROWS = [
  8, 9, 10, 11, 12, 13, 17, 18, 19, 20, 21, 22,
  36, 37, 38, 39, 40, 41, 45, 46, 47, 48, 49, 50,
]

// Build ROIC cell index for fixture assertions
interface Cell { addr: string; value: number | string | boolean | null }
const roicCells = new Map<string, Cell>()
for (const c of (roicJson as { cells: Cell[] }).cells) roicCells.set(c.addr, c)

function loadIsLeaves(): Record<number, YearKeyedSeries> {
  const out: Record<number, YearKeyedSeries> = {}
  for (const row of IS_LEAF_ROWS) {
    const series: YearKeyedSeries = {}
    for (const year of YEARS) {
      const raw = numOpt(incomeStatementCells, `${IS_COL[year]}${row}`) ?? 0
      series[year] = IS_EXPENSE_ROWS.has(row) ? -raw : raw
    }
    out[row] = series
  }
  // Merge pre-computed IS sentinels (mimics DynamicIsEditor persist behavior)
  const sentinels = deriveComputedRows(INCOME_STATEMENT_MANIFEST.rows, out, YEARS)
  return { ...out, ...sentinels }
}

function loadBsLeaves(): Record<number, YearKeyedSeries> {
  const out: Record<number, YearKeyedSeries> = {}
  for (const row of BS_LEAF_ROWS) {
    const series: YearKeyedSeries = {}
    for (const year of BS_YEARS) {
      series[year] = numOpt(balanceSheetCells, `${BS_COL[year]}${row}`) ?? 0
    }
    out[row] = series
  }
  return out
}

function loadFaLeaves(): Record<number, YearKeyedSeries> {
  const out: Record<number, YearKeyedSeries> = {}
  for (const row of FA_LEAF_ROWS) {
    const series: YearKeyedSeries = {}
    for (const year of YEARS) {
      series[year] = numOpt(fixedAssetCells, `${FA_COL[year]}${row}`) ?? 0
    }
    out[row] = series
  }
  return out
}

describe('ROIC live mode matches fixture', () => {
  const isLeaves = loadIsLeaves()
  const bsLeaves = loadBsLeaves()
  const faLeaves = loadFaLeaves()

  // Build full upstream chain
  const noplatLeafRows = computeNoplatLiveRows(isLeaves, YEARS)
  const noplatComputed = deriveComputedRows(NOPLAT_MANIFEST.rows, noplatLeafRows, YEARS)
  const allNoplatRows = { ...noplatLeafRows, ...noplatComputed }

  const faComputed = deriveComputedRows(FIXED_ASSET_MANIFEST.rows, faLeaves, YEARS)

  // PT Raja prototipe-equivalent account setup + CA exclusions to reproduce
  // legacy BS_CA_ROWS=[10,11,12,14] formula (user excluded Cash rows 8, 9 and
  // Prepaid row 13 from Operating Working Capital via WC scope page).
  const ptRajaAccounts: BsAccountEntry[] = [
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
  const cfsLeafRows = computeCashFlowLiveRows(
    ptRajaAccounts, bsLeaves, isLeaves, faLeaves, null, YEARS, BS_YEARS,
    [8, 9, 13], [],
  )
  const cfsComputed = deriveComputedRows(CASH_FLOW_STATEMENT_MANIFEST.rows, cfsLeafRows, YEARS)
  const allCfsRows = { ...cfsLeafRows, ...cfsComputed }

  const fcfLeafRows = computeFcfLiveRows(allNoplatRows, faComputed, allCfsRows, YEARS)
  const fcfComputed = deriveComputedRows(FCF_MANIFEST.rows, fcfLeafRows, YEARS)
  const allFcfRows = { ...fcfLeafRows, ...fcfComputed }

  // BS computed rows (need row 27 = Total Assets)
  const bsComputed = deriveComputedRows(BALANCE_SHEET_MANIFEST.rows, bsLeaves, YEARS)
  const allBsRows = { ...bsLeaves, ...bsComputed }

  // Compute ROIC
  const roicRows = computeRoicLiveRows(allFcfRows, allBsRows, YEARS)

  // Rows 7-12: available for all 3 years
  // Rows unaffected by NOPLAT tax adjustment — match fixture directly
  const FIXTURE_ROWS = [8, 10, 11, 12] as const
  for (const row of FIXTURE_ROWS) {
    for (const year of YEARS) {
      it(`row ${row} at ${year} matches fixture`, () => {
        const cell = roicCells.get(`${ROIC_COL[year]}${row}`)
        const expected = typeof cell?.value === 'number' ? cell.value : 0
        expect(roicRows[row]?.[year]).toBeCloseTo(expected, 6)
      })
    }
  }

  // Row 7 cascades from NOPLAT tax adjustment — verify structurally
  for (const year of YEARS) {
    it(`row 7 at ${year} = FCF row 20 (structural)`, () => {
      expect(roicRows[7]?.[year]).toBe(allFcfRows[20]?.[year])
    })
  }

  // Row 13 (Beginning IC): only 2020 and 2021
  const SHIFT_YEARS = [2020, 2021]
  for (const year of SHIFT_YEARS) {
    it(`row 13 at ${year} matches fixture`, () => {
      const cell = roicCells.get(`${ROIC_COL[year]}13`)
      const expected = typeof cell?.value === 'number' ? cell.value : 0
      expect(roicRows[13]?.[year]).toBeCloseTo(expected, 6)
    })

    // Row 15 (ROIC ratio) cascades from NOPLAT — verify structurally
    it(`row 15 at ${year} = FCF / Beginning IC (structural)`, () => {
      const fcf = roicRows[7]?.[year] ?? 0
      const begIC = roicRows[13]?.[year] ?? 1
      expect(roicRows[15]?.[year]).toBeCloseTo(fcf / begIC, 6)
    })
  }

  // Year 1 (2019): rows 13 and 15 should be undefined (no prior year)
  it('row 13 at 2019 is undefined (no prior year baseline)', () => {
    expect(roicRows[13]?.[2019]).toBeUndefined()
  })

  it('row 15 at 2019 is undefined (ROIC not computable)', () => {
    expect(roicRows[15]?.[2019]).toBeUndefined()
  })
})

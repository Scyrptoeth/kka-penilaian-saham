import { describe, expect, it } from 'vitest'
import { buildAamInput, computeIbdAutoAdjustments } from '@/lib/calculations/upstream-helpers'
import { computeAam } from '@/lib/calculations/aam-valuation'
import type { BsAccountEntry } from '@/data/catalogs/balance-sheet-catalog'
import type { HomeInputs } from '@/types/financial'

/**
 * Session 043 — Task 3.
 *
 * When a CL or NCL account is RETAINED as IBD on the Interest Bearing Debt
 * scope page (i.e. NOT in the excludedCurrentLiabIbd / excludedNonCurrentLiabIbd
 * sets), the account's contribution to Net Asset Value must be zeroed.
 *
 * Visually this means:
 *   - Column C (Historis) = BS historical value
 *   - Column D (Penyesuaian) = -C (auto-populated, user cannot override)
 *   - Column E (Disesuaikan) = C + D = 0
 *
 * Mathematically this aligns with LESSON-119: the user-curated exclusion
 * list is the single source of truth for both IBD display split AND NAV
 * math. Retained IBD accounts are not part of NAV by design.
 *
 * The fix lives at the `buildAamInput` boundary — the auto-adjustment map
 * is computed FIRST, then merged with (wins over) the user's aamAdjustments.
 * This lets the AAM page display auto-applied -C in col D while still
 * honoring user adjustments on equity and non-IBD accounts.
 */

const HOME: HomeInputs = {
  namaPerusahaan: 'Test Co',
  npwp: '',
  tahunTransaksi: 2021,
  jumlahSahamBeredar: 1000,
  jumlahSahamDijual: 510,
  dlomPercent: 0,
  dlocPercent: 0,
}

describe('computeIbdAutoAdjustments', () => {
  it('returns empty when no CL/NCL accounts', () => {
    const accounts: BsAccountEntry[] = [
      { catalogId: 'cash', excelRow: 8, section: 'current_assets' },
    ]
    const bsValues = { 8: { 2021: 1_000_000 } }
    const result = computeIbdAutoAdjustments({
      accounts,
      bsValues,
      lastYear: 2021,
      excludedCurrentLiabIbd: new Set(),
      excludedNonCurrentLiabIbd: new Set(),
    })
    expect(result).toEqual({})
  })

  it('auto-negates CL account NOT in excluded set (retained IBD)', () => {
    const accounts: BsAccountEntry[] = [
      { catalogId: 'st_bank_loan', excelRow: 31, section: 'current_liabilities' },
    ]
    const bsValues = { 31: { 2021: 500_000_000 } }
    const result = computeIbdAutoAdjustments({
      accounts,
      bsValues,
      lastYear: 2021,
      excludedCurrentLiabIbd: new Set(), // empty = all retained = all get auto-negate
      excludedNonCurrentLiabIbd: new Set(),
    })
    expect(result).toEqual({ 31: -500_000_000 })
  })

  it('does NOT auto-negate CL account IN excluded set (user opted out of IBD)', () => {
    const accounts: BsAccountEntry[] = [
      { catalogId: 'salary_payable', excelRow: 32, section: 'current_liabilities' },
    ]
    const bsValues = { 32: { 2021: 100_000_000 } }
    const result = computeIbdAutoAdjustments({
      accounts,
      bsValues,
      lastYear: 2021,
      excludedCurrentLiabIbd: new Set([32]), // user excluded row 32
      excludedNonCurrentLiabIbd: new Set(),
    })
    expect(result).toEqual({})
  })

  it('applies same logic for NCL section', () => {
    const accounts: BsAccountEntry[] = [
      { catalogId: 'lt_bank_loan', excelRow: 41, section: 'non_current_liabilities' },
      { catalogId: 'lt_lease', excelRow: 42, section: 'non_current_liabilities' },
    ]
    const bsValues = {
      41: { 2021: 2_000_000_000 },
      42: { 2021: 300_000_000 },
    }
    const result = computeIbdAutoAdjustments({
      accounts,
      bsValues,
      lastYear: 2021,
      excludedCurrentLiabIbd: new Set(),
      excludedNonCurrentLiabIbd: new Set([42]), // row 42 excluded
    })
    expect(result).toEqual({ 41: -2_000_000_000 })
  })

  it('does not touch asset/equity sections regardless of exclusion state', () => {
    const accounts: BsAccountEntry[] = [
      { catalogId: 'cash', excelRow: 8, section: 'current_assets' },
      { catalogId: 'paid_capital', excelRow: 44, section: 'equity' },
    ]
    const bsValues = { 8: { 2021: 500 }, 44: { 2021: 10_000 } }
    const result = computeIbdAutoAdjustments({
      accounts,
      bsValues,
      lastYear: 2021,
      excludedCurrentLiabIbd: new Set(),
      excludedNonCurrentLiabIbd: new Set(),
    })
    expect(result).toEqual({})
  })

  it('treats zero historical value as zero adjustment (not -0)', () => {
    const accounts: BsAccountEntry[] = [
      { catalogId: 'st_bank_loan', excelRow: 31, section: 'current_liabilities' },
    ]
    const bsValues = { 31: { 2021: 0 } }
    const result = computeIbdAutoAdjustments({
      accounts,
      bsValues,
      lastYear: 2021,
      excludedCurrentLiabIbd: new Set(),
      excludedNonCurrentLiabIbd: new Set(),
    })
    expect(result).toEqual({ 31: 0 })
  })
})

describe('buildAamInput — IBD retained accounts zero out of NAV', () => {
  it('retained IBD CL account contributes 0 to ibdCurrentLiabilities', () => {
    const accounts: BsAccountEntry[] = [
      { catalogId: 'cash', excelRow: 8, section: 'current_assets' },
      { catalogId: 'st_bank_loan', excelRow: 31, section: 'current_liabilities' },
    ]
    const allBs = {
      8: { 2021: 1_000_000_000 },
      22: { 2021: 0 }, // Fixed Asset Net
      31: { 2021: 500_000_000 },
    }

    const input = buildAamInput({
      accounts,
      allBs,
      lastYear: 2021,
      home: HOME,
      aamAdjustments: {}, // user made no adjustments
      interestBearingDebt: 500_000_000,
      excludedCurrentLiabIbd: new Set(), // nothing excluded = row 31 retained IBD
      excludedNonCurrentLiabIbd: new Set(),
    })

    // IBD CL historical was 500M but retained IBD accounts get auto-adjusted
    // to 0 contribution — so ibdCurrentLiabilities becomes 0.
    expect(input.ibdCurrentLiabilities).toBe(0)
    expect(input.nonIbdCurrentLiabilities).toBe(0)
    // Total CL = 0 (no impact on NAV from retained IBD)
    expect(input.totalCurrentLiabilities).toBe(0)
    // totalAdjustments should reflect the auto-adjustment
    expect(input.totalAdjustments).toBe(-500_000_000)
  })

  it('excluded CL account (non-IBD) keeps full historical value', () => {
    const accounts: BsAccountEntry[] = [
      { catalogId: 'salary_payable', excelRow: 32, section: 'current_liabilities' },
    ]
    const allBs = { 22: { 2021: 0 }, 32: { 2021: 100_000_000 } }

    const input = buildAamInput({
      accounts,
      allBs,
      lastYear: 2021,
      home: HOME,
      aamAdjustments: {},
      interestBearingDebt: 0,
      excludedCurrentLiabIbd: new Set([32]),
      excludedNonCurrentLiabIbd: new Set(),
    })

    // Excluded (non-IBD) account keeps full value and appears in nonIbd bucket
    expect(input.nonIbdCurrentLiabilities).toBe(100_000_000)
    expect(input.ibdCurrentLiabilities).toBe(0)
  })

  it('user aamAdjustments on equity are preserved (not overridden)', () => {
    const accounts: BsAccountEntry[] = [
      { catalogId: 'paid_capital', excelRow: 44, section: 'equity' },
    ]
    const allBs = { 22: { 2021: 0 }, 44: { 2021: 1_000_000_000 } }

    const input = buildAamInput({
      accounts,
      allBs,
      lastYear: 2021,
      home: HOME,
      aamAdjustments: { 44: 250_000_000 },
      interestBearingDebt: 0,
      excludedCurrentLiabIbd: new Set(),
      excludedNonCurrentLiabIbd: new Set(),
    })

    expect(input.totalEquity).toBe(1_250_000_000)
  })

  it('end-to-end: retained IBD account yields E=0, NAV unchanged', () => {
    const accounts: BsAccountEntry[] = [
      { catalogId: 'cash', excelRow: 8, section: 'current_assets' },
      { catalogId: 'st_bank_loan', excelRow: 31, section: 'current_liabilities' },
      { catalogId: 'paid_capital', excelRow: 44, section: 'equity' },
    ]
    const allBs = {
      8: { 2021: 1_000_000_000 },
      22: { 2021: 0 },
      31: { 2021: 500_000_000 },
      44: { 2021: 500_000_000 },
    }

    const input = buildAamInput({
      accounts,
      allBs,
      lastYear: 2021,
      home: HOME,
      aamAdjustments: {},
      interestBearingDebt: 500_000_000,
      excludedCurrentLiabIbd: new Set(),
      excludedNonCurrentLiabIbd: new Set(),
    })
    const result = computeAam(input)

    // NAV should equal Total Assets - nonIbd L = 1B - 0 = 1B
    // (IBD is retained but zeroed out at col E, so it doesn't deduct)
    expect(result.netAssetValue).toBe(1_000_000_000)
  })
})

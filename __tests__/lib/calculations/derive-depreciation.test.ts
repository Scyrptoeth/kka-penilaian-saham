import { describe, expect, it } from 'vitest'
import { computeDepreciationFromFa } from '@/lib/calculations/derive-depreciation'
import { FA_SUBTOTAL } from '@/data/catalogs/fixed-asset-catalog'
import type { YearKeyedSeries } from '@/types/financial'

/**
 * Session 041 — Task 1.
 *
 * IS row 21 (Depreciation) is no longer a user-editable leaf — it now mirrors
 * the FA "B. Depreciation → Total Additions" subtotal (FA_SUBTOTAL.TOTAL_DEP_ADDITIONS = 51)
 * with sign auto-negated so the value lands as an EXPENSE in IS per LESSON-055
 * (Excel convention: expenses stored negative, IS formulas use plain SUM).
 */
describe('computeDepreciationFromFa', () => {
  it('negates FA row 51 values per year', () => {
    const fa: Record<number, YearKeyedSeries> = {
      [FA_SUBTOTAL.TOTAL_DEP_ADDITIONS]: { 2018: 100, 2019: 200, 2020: 300 },
    }
    expect(computeDepreciationFromFa(fa)).toEqual({
      21: { 2018: -100, 2019: -200, 2020: -300 },
    })
  })

  it('returns empty object when FA row 51 missing', () => {
    expect(computeDepreciationFromFa({})).toEqual({})
  })

  it('returns empty object when faRows is undefined', () => {
    expect(computeDepreciationFromFa(undefined)).toEqual({})
  })

  it('handles zero values explicitly (zero stays zero, not negative)', () => {
    const fa: Record<number, YearKeyedSeries> = {
      [FA_SUBTOTAL.TOTAL_DEP_ADDITIONS]: { 2019: 0, 2020: 500 },
    }
    expect(computeDepreciationFromFa(fa)).toEqual({
      21: { 2019: 0, 2020: -500 },
    })
  })

  it('handles partial year coverage', () => {
    const fa: Record<number, YearKeyedSeries> = {
      [FA_SUBTOTAL.TOTAL_DEP_ADDITIONS]: { 2020: 600.5 },
    }
    expect(computeDepreciationFromFa(fa)).toEqual({
      21: { 2020: -600.5 },
    })
  })

  it('matches PT Raja-style fixture values (Session 041 image evidence)', () => {
    // From revisi-pertama-INPUT-DATA-Income-Statement-Depreciation-Read-Only-INPUT-DATA-Fixed-Asset-2.png
    const fa: Record<number, YearKeyedSeries> = {
      [FA_SUBTOTAL.TOTAL_DEP_ADDITIONS]: {
        2018: 389113881,
        2019: 311581499,
        2020: 633096847,
        2021: 600812471,
      },
    }
    expect(computeDepreciationFromFa(fa)).toEqual({
      21: {
        2018: -389113881,
        2019: -311581499,
        2020: -633096847,
        2021: -600812471,
      },
    })
  })
})

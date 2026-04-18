import { describe, expect, it } from 'vitest'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { computeDepreciationFromFa } from '@/lib/calculations/derive-depreciation'
import { buildDynamicIsManifest } from '@/data/manifests/build-dynamic-is'
import { FA_SUBTOTAL } from '@/data/catalogs/fixed-asset-catalog'
import { IS_SENTINEL } from '@/data/catalogs/income-statement-catalog'
import type { YearKeyedSeries } from '@/types/financial'

/**
 * Session 043 — Bug fix for Depreciation IS row 21 display.
 *
 * Root cause: `deriveComputedRows` (derive-computed-rows.ts:38) skips rows
 * without `computedFrom`. Row 21 in buildDynamicIsManifest has `type: 'cross-ref'`
 * without `computedFrom`, so `computedValues[21]` from deriveComputedRows
 * is always undefined — RowInputGrid for cross-ref cells reads computedValues
 * and renders "-" for zero/missing data.
 *
 * Fix contract (display side):
 *   displayComputed = { ...depCrossRef, ...deriveComputedRows(manifest, { ...localRows, ...depCrossRef }, years) }
 *
 * depCrossRef spread FIRST so rows without computedFrom are preserved,
 * deriveComputedRows output LAST so computed subtotals (EBIT, PBT, NPAT)
 * win if any collision.
 *
 * Fix contract (persist side):
 *   sentinels[DEPRECIATION] = depCrossRef[DEPRECIATION] // explicit, not via the computed loop
 */
describe('DynamicIsEditor cross-ref display pattern', () => {
  const years = [2018, 2019, 2020, 2021]

  const faRows: Record<number, YearKeyedSeries> = {
    [FA_SUBTOTAL.TOTAL_DEP_ADDITIONS]: {
      2018: 389_113_881,
      2019: 311_581_499,
      2020: 633_096_847,
      2021: 600_812_471,
    },
  }

  it('BUG: deriveComputedRows alone omits cross-ref row 21 from output', () => {
    // Pre-fix regression: show that the bare-computed output misses row 21
    const manifest = buildDynamicIsManifest([], 'en', 4, 2021)
    const depCrossRef = computeDepreciationFromFa(faRows)
    const computed = deriveComputedRows(manifest.rows, depCrossRef, years)

    // The evidence: row 21 is NOT in the output of deriveComputedRows even
    // though depCrossRef provided it, because row 21 has no computedFrom.
    expect(computed[IS_SENTINEL.DEPRECIATION]).toBeUndefined()
  })

  it('FIX: merge-then-compute pattern surfaces depCrossRef row 21 to display', () => {
    const manifest = buildDynamicIsManifest([], 'en', 4, 2021)
    const depCrossRef = computeDepreciationFromFa(faRows)
    const bareComputed = deriveComputedRows(manifest.rows, { ...depCrossRef }, years)

    // Apply the fix pattern: depCrossRef spread first, computed last
    const displayComputed = { ...depCrossRef, ...bareComputed }

    expect(displayComputed[IS_SENTINEL.DEPRECIATION]).toEqual({
      2018: -389_113_881,
      2019: -311_581_499,
      2020: -633_096_847,
      2021: -600_812_471,
    })
  })

  it('FIX: downstream sentinels (EBIT) still recompute correctly after merge', () => {
    // EBIT = EBITDA + DEPRECIATION (signed). Must NOT be clobbered by merge.
    const manifest = buildDynamicIsManifest([], 'en', 4, 2021)
    const leafRows: Record<number, YearKeyedSeries> = {
      // Fake EBITDA to test EBIT chain
      [IS_SENTINEL.EBITDA]: { 2021: 1_000_000_000 },
    }
    const depCrossRef = computeDepreciationFromFa({
      [FA_SUBTOTAL.TOTAL_DEP_ADDITIONS]: { 2021: 200_000_000 },
    })
    const bareComputed = deriveComputedRows(manifest.rows, { ...leafRows, ...depCrossRef }, [2021])

    const displayComputed = { ...depCrossRef, ...bareComputed }

    // EBIT should be EBITDA + DEPRECIATION = 1_000_000_000 + (-200_000_000) = 800_000_000
    expect(displayComputed[IS_SENTINEL.EBIT]).toBeDefined()
    expect(displayComputed[IS_SENTINEL.EBIT][2021]).toBe(800_000_000)
    // And depreciation still displayed as negative
    expect(displayComputed[IS_SENTINEL.DEPRECIATION]).toEqual({ 2021: -200_000_000 })
  })

  it('FIX persist side: row 21 included in sentinels explicitly', () => {
    // Simulates the persist-side logic that collects sentinels for store
    const depCrossRef = computeDepreciationFromFa(faRows)
    const manifest = buildDynamicIsManifest([], 'en', 4, 2021)
    const computed = deriveComputedRows(manifest.rows, { ...depCrossRef }, years)

    // Collect sentinels the fix way: include cross-ref rows explicitly
    const sentinels: Record<number, YearKeyedSeries> = {}
    // Pre-existing loop covers rows with computedFrom
    for (const row of manifest.rows) {
      if (row.excelRow !== undefined && computed[row.excelRow]) {
        sentinels[row.excelRow] = computed[row.excelRow]
      }
    }
    // NEW: explicit cross-ref injection
    if (depCrossRef[IS_SENTINEL.DEPRECIATION]) {
      sentinels[IS_SENTINEL.DEPRECIATION] = depCrossRef[IS_SENTINEL.DEPRECIATION]
    }

    expect(sentinels[IS_SENTINEL.DEPRECIATION]).toEqual({
      2018: -389_113_881,
      2019: -311_581_499,
      2020: -633_096_847,
      2021: -600_812_471,
    })
  })
})

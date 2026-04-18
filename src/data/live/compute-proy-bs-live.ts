/**
 * PROY BALANCE SHEET — Session 051 semantics.
 *
 * Two projection modes based on account section:
 *
 * 1. **Equity accounts** (`section === 'equity'`) — flat-default, editable.
 *    No growth applied. Projection cells default to historical last-year
 *    value. User-supplied overrides in
 *    `balanceSheet.equityProjectionOverrides[excelRow][year]` replace the
 *    default on a PER-CELL basis (edit 2022 does NOT cascade to 2023/2024).
 *
 * 2. **All other leaves** (assets, liabilities) — strict-average growth.
 *    `value[N] = value[N-1] × (1 + strictAvgGrowth)`
 *    where `strictAvgGrowth = averageYoYStrict(series, historicalYears)`.
 *    When strict-growth returns null (sparse-historical account with
 *    fewer than 2 real YoY observations), growth falls back to 0 → flat
 *    projection. Matches the INPUT BS Average Growth YoY column exactly
 *    (single source of truth — LESSON-139 driver-display sync).
 *
 * Subtotals + totals derive from leaves via `deriveComputedRows`
 * (consuming the dynamic BS manifest's `computedFrom` declarations).
 *
 * Balance Control row (63) = TOTAL ASSETS (33) − Total L&E (62). This
 * does NOT reconcile by design in this model — each leaf is projected
 * independently and equity is flat, so there is no accounting identity
 * that forces A = L + E in projection years. The row is kept as a
 * diagnostic.
 *
 * Decoupling vs Session 035 and earlier:
 * - No FA cross-reference (row 25/26 no longer consume PROY FA rows
 *   32/60). If user's BS accounts list includes Fixed Assets + Accum
 *   Depreciation as leaves (rows 20/21 via catalog), they project via
 *   their OWN historical growth.
 * - No Proy LR Net Profit cascade into Current Profit (row 47).
 * - No special-case handling for Cash in Banks, AR adjustments,
 *   Intangible growth, Equity carry-forward, Bank Loan IFERROR.
 */

import type { YearKeyedSeries } from '@/types/financial'
import type { BsAccountEntry } from '@/data/catalogs/balance-sheet-catalog'
import type { ManifestRow } from '@/data/manifests/types'
import { averageYoYStrict } from '@/lib/calculations/derivation-helpers'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'

// Re-export for backward compat with older imports.
export { computeAvgGrowth } from '@/lib/calculations/helpers'

/** Excel row for the Balance Control diagnostic cell (prototipe row 63). */
const BS_BALANCE_CONTROL_ROW = 63
/** Excel row for TOTAL ASSETS on the prototipe. */
const BS_TOTAL_ASSETS_ROW = 33
/** Excel row for Total Liabilities & Equity on the prototipe. */
const BS_TOTAL_LE_ROW = 62

export interface ProyBsInput {
  /** All user-selected accounts from `balanceSheet.accounts`. */
  accounts: readonly BsAccountEntry[]
  /** Historical BS rows (leaves + sentinels) keyed by excelRow. */
  bsRows: Readonly<Record<number, YearKeyedSeries>>
  /** Historical years (ascending). Last entry = histYear (seed for projection). */
  historicalYears: readonly number[]
  /** Dynamic BS manifest rows — source of `computedFrom` for subtotals/totals. */
  manifestRows: readonly ManifestRow[]
  /**
   * Session 051 — per-(equity row, projection year) user overrides. Values
   * here REPLACE the default (historical last-year value) for the matching
   * cell. Entries absent from this map → cell uses the default.
   * Optional for backward-compat with callers that haven't wired the slice;
   * empty object / undefined behave identically.
   */
  equityOverrides?: Readonly<Record<number, YearKeyedSeries>>
}

/**
 * Project every leaf account per Session 051 semantics (see module doc),
 * then derive subtotals + totals from the projected leaves via
 * `deriveComputedRows`.
 */
export function computeProyBsLive(
  input: ProyBsInput,
  projYears: readonly number[],
): Record<number, YearKeyedSeries> {
  const { accounts, bsRows, historicalYears, manifestRows, equityOverrides } = input
  if (historicalYears.length === 0) return {}
  const histYear = historicalYears[historicalYears.length - 1]!

  const allYears = [histYear, ...projYears]

  // 1. Project each leaf
  const projectedLeaves: Record<number, YearKeyedSeries> = {}
  for (const acct of accounts) {
    const historicalSeries = bsRows[acct.excelRow] ?? {}
    const seedVal = historicalSeries[histYear] ?? 0
    const out: YearKeyedSeries = { [histYear]: seedVal }

    if (acct.section === 'equity') {
      // Equity: no growth. Default = historical last year; apply override per cell.
      const overrideSeries = equityOverrides?.[acct.excelRow]
      for (const year of projYears) {
        const override = overrideSeries?.[year]
        out[year] = override ?? seedVal
      }
    } else {
      // Assets / liabilities: strict-average growth with flat fallback.
      const strictGrowth = averageYoYStrict(historicalSeries, historicalYears)
      const growth = strictGrowth ?? 0
      let prev = seedVal
      for (const year of projYears) {
        const next = prev * (1 + growth)
        out[year] = next
        prev = next
      }
    }

    projectedLeaves[acct.excelRow] = out
  }

  // 2. Derive subtotal/total rows for all years (hist + proj)
  const totals = deriveComputedRows(manifestRows, projectedLeaves, allYears)

  // 3. Balance Control diagnostic
  const result: Record<number, YearKeyedSeries> = { ...projectedLeaves, ...totals }
  const totalAssets = result[BS_TOTAL_ASSETS_ROW] ?? {}
  const totalLe = result[BS_TOTAL_LE_ROW] ?? {}
  const balanceControl: YearKeyedSeries = {}
  for (const year of allYears) {
    balanceControl[year] = (totalAssets[year] ?? 0) - (totalLe[year] ?? 0)
  }
  result[BS_BALANCE_CONTROL_ROW] = balanceControl

  return result
}

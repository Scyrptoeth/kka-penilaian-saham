/**
 * PROY BALANCE SHEET — Full Simple Growth projection (Session 036).
 *
 * Per-account historical-growth model: every leaf from
 * `balanceSheet.accounts` projects via:
 *   value[N] = value[N-1] × (1 + computeAvgGrowth(historicalSeries))
 *
 * Subtotals + totals derive from leaves via `deriveComputedRows`
 * (consuming the dynamic BS manifest's `computedFrom` declarations).
 *
 * Balance Control row (63) = TOTAL ASSETS (33) − Total L&E (62). This
 * does NOT reconcile by design in the Full Simple Growth model — each
 * leaf is projected independently so there is no accounting identity
 * that forces assets = liabilities + equity in projection years. The
 * row is kept as a diagnostic.
 *
 * Decoupling vs Session 035 and earlier:
 * - No FA cross-reference (row 25/26 no longer consume PROY FA rows
 *   32/60). If user's BS accounts list includes Fixed Assets + Accum
 *   Depreciation as leaves (rows 20/21 via catalog), they project via
 *   their OWN historical growth.
 * - No Proy LR Net Profit cascade into Current Profit (row 47).
 * - No special-case handling for Cash in Banks, AR adjustments,
 *   Intangible growth, Equity carry-forward, Bank Loan IFERROR.
 *
 * Rationale: simpler, more transparent, makes each projection
 * deterministic from historical data.
 */

import type { YearKeyedSeries } from '@/types/financial'
import type { BsAccountEntry } from '@/data/catalogs/balance-sheet-catalog'
import type { ManifestRow } from '@/data/manifests/types'
import { computeAvgGrowth } from '@/lib/calculations/helpers'
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
}

/**
 * Project every leaf account uniformly via average historical growth,
 * then derive subtotals + totals from the projected leaves via
 * `deriveComputedRows`.
 *
 * @param input See ProyBsInput
 * @param projYears Projection years (ascending)
 * @returns Record keyed by excelRow → YearKeyedSeries covering histYear +
 *   projYears. Includes leaves, subtotals, totals, and Balance Control.
 */
export function computeProyBsLive(
  input: ProyBsInput,
  projYears: readonly number[],
): Record<number, YearKeyedSeries> {
  const { accounts, bsRows, historicalYears, manifestRows } = input
  if (historicalYears.length === 0) return {}
  const histYear = historicalYears[historicalYears.length - 1]!

  const allYears = [histYear, ...projYears]

  // 1. Project each leaf: prev × (1 + avgGrowth)
  const projectedLeaves: Record<number, YearKeyedSeries> = {}
  for (const acct of accounts) {
    const historicalSeries = bsRows[acct.excelRow] ?? {}
    const avgGrowth = computeAvgGrowth(historicalSeries)
    const out: YearKeyedSeries = {}
    const seedVal = historicalSeries[histYear] ?? 0
    out[histYear] = seedVal
    let prev = seedVal
    for (const year of projYears) {
      const next = prev * (1 + avgGrowth)
      out[year] = next
      prev = next
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

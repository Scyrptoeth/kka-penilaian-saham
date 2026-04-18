import { FA_SUBTOTAL } from '@/data/catalogs/fixed-asset-catalog'
import { IS_SENTINEL } from '@/data/catalogs/income-statement-catalog'
import type { YearKeyedSeries } from '@/types/financial'

/**
 * Cross-sheet helper: produces the IS Depreciation row (excelRow 21) sourced
 * from the FA "B. Depreciation → Total Additions" subtotal (excelRow 51).
 *
 * Why a dedicated helper:
 *   - Sign reconciliation lives at the boundary (LESSON-011 adapter pattern).
 *     FA stores depreciation additions as POSITIVE; IS uses NEGATIVE for
 *     expenses (LESSON-055 plain-addition convention). Negation here = exactly
 *     one place to audit.
 *   - Mirrors `computeBsCrossRefValues` in DynamicBsEditor (LESSON-058):
 *     persist-time injection so downstream sentinel chains (EBIT, PBT, NPAT)
 *     resolve correctly even when the user edits FA without touching IS.
 *
 * Returns an object keyed by IS row 21 (an empty object when FA has not yet
 * provided row 51) so the caller can spread it into the IS rows record.
 */
export function computeDepreciationFromFa(
  faRows: Record<number, YearKeyedSeries> | undefined,
): Record<number, YearKeyedSeries> {
  if (!faRows) return {}
  const src = faRows[FA_SUBTOTAL.TOTAL_DEP_ADDITIONS]
  if (!src) return {}
  const negated: YearKeyedSeries = {}
  for (const [yr, val] of Object.entries(src)) {
    const v = val ?? 0
    negated[Number(yr)] = v === 0 ? 0 : -v
  }
  return { [IS_SENTINEL.DEPRECIATION]: negated }
}

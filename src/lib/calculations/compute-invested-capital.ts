import type { YearKeyedSeries } from '@/types/financial'
import type { InvestedCapitalState, SourceRef } from '@/lib/store/useKkaStore'
import { FA_OFFSET } from '@/data/catalogs/fixed-asset-catalog'

export interface ComputeInvestedCapitalInput {
  scope: InvestedCapitalState
  bsRows: Record<number, YearKeyedSeries>
  faRows: Record<number, YearKeyedSeries>
  years: readonly number[]
}

export interface ComputeInvestedCapitalResult {
  otherNonOperatingAssets: YearKeyedSeries
  excessCash: YearKeyedSeries
  marketableSecurities: YearKeyedSeries
}

/**
 * Sums user-curated account values per year for each of the 3 ROIC "Less"
 * rows. Returns NATURAL positive sums — caller (ROIC compute) negates for
 * the "Less ..." pre-signed convention (LESSON-011).
 *
 * For each SourceRef in a scope list:
 *   - source='bs' → bsRows[excelRow][year]
 *   - source='fa' → faRows[excelRow + FA_OFFSET.NET_VALUE][year]
 * Missing rows/years default to 0.
 */
export function computeInvestedCapital(
  input: ComputeInvestedCapitalInput,
): ComputeInvestedCapitalResult {
  const { scope, bsRows, faRows, years } = input

  const sumRefs = (refs: SourceRef[]): YearKeyedSeries => {
    const out: YearKeyedSeries = {}
    for (const year of years) {
      let total = 0
      for (const ref of refs) {
        const rowKey =
          ref.source === 'fa' ? ref.excelRow + FA_OFFSET.NET_VALUE : ref.excelRow
        const rowMap = ref.source === 'fa' ? faRows : bsRows
        const series = rowMap[rowKey]
        const value = series?.[year] ?? 0
        total += value
      }
      out[year] = total
    }
    return out
  }

  return {
    otherNonOperatingAssets: sumRefs(scope.otherNonOperatingAssets),
    excessCash: sumRefs(scope.excessCash),
    marketableSecurities: sumRefs(scope.marketableSecurities),
  }
}

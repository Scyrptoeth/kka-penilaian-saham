/**
 * ROIC (Return on Invested Capital) live compute adapter.
 *
 * Computes all ROIC manifest rows from pre-computed upstream data:
 *   row 7:  FCF (from FCF row 20)
 *   row 8:  Total Assets (from BS row 27 — computed subtotal)
 *   row 9:  Other Non-Operating Assets (user-curated scope, default 0)
 *   row 10: Excess Cash (user-curated scope, default 0)
 *   row 11: Marketable Securities (user-curated scope, default 0)
 *   row 12: Invested Capital = SUM(8:11)
 *   row 13: Beginning of Year IC = prior year's row 12
 *   row 15: ROIC = row 7 / row 13
 *
 * Rows 13 and 15 require cross-year references (prior-year shift),
 * which `deriveComputedRows` cannot express. All rows are computed
 * here — no `computedFrom` on the ROIC manifest.
 *
 * Year 1 (first CFS year) has no prior-year IC → rows 13 and 15
 * are omitted from the output for that year. SheetPage renders
 * them as empty cells, matching the workbook behavior.
 */

import type { YearKeyedSeries } from '@/types/financial'

/**
 * @param fcfRows Pre-computed FCF rows (need row 20 = Free Cash Flow)
 * @param bsAllRows BS leaf + computed rows (need row 27 = Total Assets)
 * @param years ROIC year span (typically 3 years, same as CFS)
 * @param investedCapitalValues Optional user-curated scope result with 3 series
 *   (otherNonOperatingAssets / excessCash / marketableSecurities). Caller passes
 *   NATURAL positive sums from BS/FA; this helper negates internally for the
 *   "Less ..." rows 9/10/11 (matches pre-signed convention of LESSON-011).
 *   When undefined → rows 9/10/11 default to 0 (legacy mode).
 */
export function computeRoicLiveRows(
  fcfRows: Record<number, YearKeyedSeries>,
  bsAllRows: Record<number, YearKeyedSeries>,
  years: readonly number[],
  investedCapitalValues?: {
    otherNonOperatingAssets: YearKeyedSeries
    excessCash: YearKeyedSeries
    marketableSecurities: YearKeyedSeries
  },
): Record<number, YearKeyedSeries> {
  const out: Record<number, YearKeyedSeries> = {}
  const set = (row: number, year: number, value: number) => {
    if (!out[row]) out[row] = {}
    out[row][year] = value
  }

  // Pass 1: compute rows 7-12 for all years
  for (const year of years) {
    // Row 7: FCF = FCF row 20
    set(7, year, fcfRows[20]?.[year] ?? 0)

    // Row 8: Total Assets = BS row 27 (computed subtotal)
    set(8, year, bsAllRows[27]?.[year] ?? 0)

    // Row 9: Other Non-Operating Assets (user-curated; pre-signed negative)
    set(9, year, -(investedCapitalValues?.otherNonOperatingAssets?.[year] ?? 0))

    // Row 10: Excess Cash (user-curated; pre-signed negative)
    set(10, year, -(investedCapitalValues?.excessCash?.[year] ?? 0))

    // Row 11: Marketable Securities (user-curated; pre-signed negative)
    set(11, year, -(investedCapitalValues?.marketableSecurities?.[year] ?? 0))

    // Row 12: Invested Capital = SUM(8:11)
    const ic =
      (out[8]?.[year] ?? 0) +
      (out[9]?.[year] ?? 0) +
      (out[10]?.[year] ?? 0) +
      (out[11]?.[year] ?? 0)
    set(12, year, ic)
  }

  // Pass 2: row 13 (prior year's IC) + row 15 (ROIC ratio)
  // Year 1 has no prior → skip rows 13 and 15 for that year.
  for (let i = 0; i < years.length; i++) {
    const year = years[i]

    if (i > 0) {
      const priorYear = years[i - 1]
      const beginningIc = out[12]?.[priorYear] ?? 0
      set(13, year, beginningIc)

      // Row 15: ROIC = FCF / Beginning IC
      if (beginningIc !== 0) {
        set(15, year, (out[7]?.[year] ?? 0) / beginningIc)
      }
    }
  }

  return out
}

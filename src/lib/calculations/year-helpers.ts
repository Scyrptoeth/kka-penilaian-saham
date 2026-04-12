/**
 * Year-span helpers for live data mode.
 *
 * The seed manifests hard-code a historical window (2018–2021) because
 * the prototype workbook is frozen in time. Live mode derives the window
 * from the user-entered `tahunTransaksi` so the same manifest can render
 * any 3- or 4-year run ending at `tahunTransaksi − 1`.
 *
 * Convention: the last historical year is always one year before the
 * transaction year (the cut-off date falls on 31 December of that year —
 * see `computeCutOffDate` in useKkaStore).
 */

/**
 * Derive historical years from tahunTransaksi + count.
 * Last historical year = tahunTransaksi - 1, returned ascending.
 *
 *   computeHistoricalYears(2022, 4) → [2018, 2019, 2020, 2021]
 *   computeHistoricalYears(2022, 3) → [2019, 2020, 2021]
 */
export function computeHistoricalYears(
  tahunTransaksi: number,
  count: 3 | 4,
): number[] {
  const lastYear = tahunTransaksi - 1
  const firstYear = lastYear - count + 1
  return Array.from({ length: count }, (_, i) => firstYear + i)
}

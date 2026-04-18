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
  count: number,
): number[] {
  const lastYear = tahunTransaksi - 1
  const firstYear = lastYear - count + 1
  return Array.from({ length: count }, (_, i) => firstYear + i)
}

/**
 * Number of projection years. Single source of truth used by all
 * projection pages and KeyDriversForm. Change here to project more
 * or fewer years for any company — all compute adapters accept
 * `projYears` as a parameter and scale automatically.
 */
export const PROJECTION_YEAR_COUNT = 3

/**
 * Derive projection years from tahunTransaksi.
 * First projection year = tahunTransaksi, ascending. Optional `count`
 * overrides the default PROJECTION_YEAR_COUNT — used by KeyDriversForm
 * (7-year Additional Capex horizon) without widening the global constant
 * that other PROY pages + downstream compute pipelines depend on.
 *
 *   computeProjectionYears(2022)    → [2022, 2023, 2024]
 *   computeProjectionYears(2022, 7) → [2022, 2023, ..., 2028]
 */
export function computeProjectionYears(
  tahunTransaksi: number,
  count: number = PROJECTION_YEAR_COUNT,
): number[] {
  return Array.from({ length: count }, (_, i) => tahunTransaksi + i)
}

/**
 * PROY Fixed Assets live compute adapter.
 *
 * Projects fixed asset schedule from historical FA data + growth rates.
 * Growth rates = AVERAGE of historical year-over-year changes (FA column I).
 *
 * Structure: 3 sections × 6 categories
 *   Acquisition:   Beginning (8-14), Additions (17-23), Ending (26-32)
 *   Depreciation:  Beginning (36-42), Additions (45-51), Ending (54-60)
 *   Net Value:     (63-69)
 *
 * Column C = last historical year (seeded from FA store data)
 * Columns D-F = projected using: Additions[N] = Additions[N-1] * (1 + growth_rate)
 *                                  Beginning[N] = Ending[N-1]
 *                                  Ending[N] = Beginning[N] + Additions[N]
 */

import type { YearKeyedSeries } from '@/types/financial'

/** Asset category row mapping (6 categories). */
const CATEGORIES = [0, 1, 2, 3, 4, 5] as const // index into row offsets

/** Acquisition section row offsets: beginning starts at 8, additions at 17, ending at 26 */
const ACQ_BEG_START = 8
const ACQ_ADD_START = 17
const ACQ_END_START = 26
/** Depreciation section row offsets */
const DEP_BEG_START = 36
const DEP_ADD_START = 45
const DEP_END_START = 54
/** Net value section row offset */
const NET_START = 63
/** Total rows */
const ACQ_BEG_TOTAL = 14
const ACQ_ADD_TOTAL = 23
const ACQ_END_TOTAL = 32
const DEP_BEG_TOTAL = 42
const DEP_ADD_TOTAL = 51
const DEP_END_TOTAL = 60
const NET_TOTAL = 69

/**
 * Compute average growth rate from historical FA additions data.
 * Mirrors FA column I = AVERAGE(G:H) where G,H are YoY growth rates.
 *
 * @param additions YearKeyedSeries for a single FA additions row (e.g., row 17)
 * @param years Historical years [2019, 2020, 2021]
 * @returns Average growth rate (can be 0, negative, or very large)
 */
export function computeFaGrowthRate(
  additions: YearKeyedSeries | undefined,
  years: readonly number[],
): number {
  if (!additions || years.length < 3) return 0

  const growths: number[] = []
  // Growth rates for years[1]/years[0] and years[2]/years[1]
  for (let i = 1; i < years.length; i++) {
    const prev = additions[years[i - 1]] ?? 0
    const curr = additions[years[i]] ?? 0
    if (prev === 0) {
      growths.push(0) // IFERROR(..., 0)
    } else {
      growths.push((curr - prev) / prev)
    }
  }

  if (growths.length === 0) return 0
  return growths.reduce((s, g) => s + g, 0) / growths.length
}

/**
 * @param faRows Historical FA leaf + computed rows (from store)
 * @param faYears Historical years [2019, 2020, 2021]
 * @param projYears Projection years [2022, 2023, 2024] (3 years for DCF)
 * @returns PROY FA rows keyed by manifest row number
 */
export function computeProyFixedAssetsLive(
  faRows: Record<number, YearKeyedSeries>,
  faYears: readonly number[],
  projYears: readonly number[],
): Record<number, YearKeyedSeries> {
  const out: Record<number, YearKeyedSeries> = {}
  const set = (row: number, year: number, value: number) => {
    if (!out[row]) out[row] = {}
    out[row][year] = value
  }

  const lastHistYear = faYears[faYears.length - 1]

  // Compute growth rates for each category (acquisition additions & depreciation additions)
  const acqGrowth: number[] = []
  const depGrowth: number[] = []
  for (const c of CATEGORIES) {
    acqGrowth.push(computeFaGrowthRate(faRows[ACQ_ADD_START + c], faYears))
    depGrowth.push(computeFaGrowthRate(faRows[DEP_ADD_START + c], faYears))
  }

  // --- Column C (historical = last FA year) ---
  const histYear = lastHistYear
  // We need a "virtual" year before projYears[0] for chaining.
  // This is the last historical year data.

  // Seed the "prior year" values from historical FA data
  // For acquisition: ending = FA ending rows at last historical year
  // For depreciation: ending = FA depreciation ending rows at last historical year
  const priorAcqEnding: number[] = []
  const priorAcqAdditions: number[] = []
  const priorDepEnding: number[] = []
  const priorDepAdditions: number[] = []

  for (const c of CATEGORIES) {
    // Acquisition ending = row 26+c at last hist year
    // But FA store has row 26+c for "ending acquisition" per category
    // Actually, FA store rows: beginning (8-13), additions (17-22), ending NOT stored separately
    // The ending is computed: beginning + additions (in FA). For PROY FA column C,
    // we need the ending from last historical year.
    // From FA fixture: ending rows 26-31 are computed as beginning + additions.
    // For last hist year (col E in fixture = faYears[2] = 2021):
    //   ending[2021] = beginning[2021] + additions[2021]
    // But in our store, we have the leaf rows. The computed rows are in faComp.
    // Since we receive faRows which includes both leaf and computed rows,
    // we can read the ending directly if available.
    // Actually, ending row 26+c might be a computed row from deriveComputedRows.
    // Let's read it; if not available, compute from beginning + additions.
    const ending = faRows[ACQ_END_START + c]?.[histYear]
      ?? ((faRows[ACQ_BEG_START + c]?.[histYear] ?? 0) + (faRows[ACQ_ADD_START + c]?.[histYear] ?? 0))
    priorAcqEnding.push(ending)
    priorAcqAdditions.push(faRows[ACQ_ADD_START + c]?.[histYear] ?? 0)

    const depEnding = faRows[DEP_END_START + c]?.[histYear]
      ?? ((faRows[DEP_BEG_START + c]?.[histYear] ?? 0) + (faRows[DEP_ADD_START + c]?.[histYear] ?? 0))
    priorDepEnding.push(depEnding)
    priorDepAdditions.push(faRows[DEP_ADD_START + c]?.[histYear] ?? 0)

    // Write Column C (historical) values
    set(ACQ_BEG_START + c, histYear, faRows[ACQ_BEG_START + c]?.[histYear] ?? 0)
    set(ACQ_ADD_START + c, histYear, faRows[ACQ_ADD_START + c]?.[histYear] ?? 0)
    set(ACQ_END_START + c, histYear, ending)
    set(DEP_BEG_START + c, histYear, faRows[DEP_BEG_START + c]?.[histYear] ?? 0)
    set(DEP_ADD_START + c, histYear, faRows[DEP_ADD_START + c]?.[histYear] ?? 0)
    set(DEP_END_START + c, histYear, depEnding)
    set(NET_START + c, histYear, ending - depEnding)
  }

  // --- Columns D/E/F (projected) ---
  for (let yi = 0; yi < projYears.length; yi++) {
    const year = projYears[yi]

    for (const c of CATEGORIES) {
      // Acquisition
      const acqBeginning = yi === 0 ? priorAcqEnding[c] : (out[ACQ_END_START + c]?.[projYears[yi - 1]] ?? 0)
      const acqPrevAdd = yi === 0 ? priorAcqAdditions[c] : (out[ACQ_ADD_START + c]?.[projYears[yi - 1]] ?? 0)
      const acqAdditions = acqPrevAdd * (1 + acqGrowth[c])

      set(ACQ_BEG_START + c, year, acqBeginning)
      set(ACQ_ADD_START + c, year, acqAdditions)
      set(ACQ_END_START + c, year, acqBeginning + acqAdditions)

      // Depreciation
      const depBeginning = yi === 0 ? priorDepEnding[c] : (out[DEP_END_START + c]?.[projYears[yi - 1]] ?? 0)
      const depPrevAdd = yi === 0 ? priorDepAdditions[c] : (out[DEP_ADD_START + c]?.[projYears[yi - 1]] ?? 0)
      const depAdditions = depPrevAdd * (1 + depGrowth[c])

      set(DEP_BEG_START + c, year, depBeginning)
      set(DEP_ADD_START + c, year, depAdditions)
      set(DEP_END_START + c, year, depBeginning + depAdditions)

      // Net Value
      set(NET_START + c, year, (out[ACQ_END_START + c]?.[year] ?? 0) - (out[DEP_END_START + c]?.[year] ?? 0))
    }
  }

  // --- Totals ---
  const allYears = [histYear, ...projYears]
  for (const year of allYears) {
    const sumRow = (baseRow: number) => {
      let total = 0
      for (const c of CATEGORIES) total += out[baseRow + c]?.[year] ?? 0
      return total
    }
    set(ACQ_BEG_TOTAL, year, sumRow(ACQ_BEG_START))
    set(ACQ_ADD_TOTAL, year, sumRow(ACQ_ADD_START))
    set(ACQ_END_TOTAL, year, sumRow(ACQ_END_START))
    set(DEP_BEG_TOTAL, year, sumRow(DEP_BEG_START))
    set(DEP_ADD_TOTAL, year, sumRow(DEP_ADD_START))
    set(DEP_END_TOTAL, year, sumRow(DEP_END_START))
    set(NET_TOTAL, year, sumRow(NET_START))
  }

  return out
}

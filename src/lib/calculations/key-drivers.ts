/**
 * Key Drivers computation helpers.
 *
 * Sales Volume: ROUND(prev * (1 + increment), -2)  — rounds to nearest 100
 * Sales Price:  ROUNDUP(prev * (1 + increment), -3) — rounds UP to nearest 1000
 * Total Capex:  SUM of category capex per year
 */

/** Compute projected sales volumes across years.
 *  Year 0 = base (direct input), years 1+ apply cumulative increments. */
export function computeSalesVolumes(
  base: number,
  increments: readonly number[],
): number[] {
  const result = [base]
  for (const inc of increments) {
    const prev = result[result.length - 1]
    // ROUND(prev * (1+inc), -2) = round to nearest 100
    result.push(Math.round(prev * (1 + inc) / 100) * 100)
  }
  return result
}

/** Compute projected sales prices across years.
 *  Year 0 = base (direct input), years 1+ apply cumulative increments.
 *  Uses ROUNDUP to nearest 1000 (Excel: ROUNDUP(..., -3)). */
export function computeSalesPrices(
  base: number,
  increments: readonly number[],
): number[] {
  const result = [base]
  for (const inc of increments) {
    const prev = result[result.length - 1]
    // ROUNDUP(prev * (1+inc), -3) = ceiling to nearest 1000
    result.push(Math.ceil(prev * (1 + inc) / 1000) * 1000)
  }
  return result
}

/** Compute total additional capex per year = sum of all categories. */
export function computeTotalCapex(
  land: readonly number[],
  building: readonly number[],
  equipment: readonly number[],
  others: readonly number[],
): number[] {
  const len = Math.max(land.length, building.length, equipment.length, others.length)
  const result: number[] = []
  for (let i = 0; i < len; i++) {
    result.push(
      (land[i] ?? 0) + (building[i] ?? 0) + (equipment[i] ?? 0) + (others[i] ?? 0),
    )
  }
  return result
}

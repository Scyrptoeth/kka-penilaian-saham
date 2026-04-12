/**
 * Growth Rate live compute adapter.
 *
 * Maps upstream BS + FA + ROIC data to growth rate computation inputs.
 * Growth Rate has only 2 years (last 2 of ROIC's 3 years).
 *
 * For each Growth Rate year Y:
 *   row 6: Net FA End = FA row 69 at year Y
 *   row 7: Net CA End = BS row 16 at year Y
 *   row 8: Less: Net FA Beg = -(BS row 22 at year Y-1)
 *   row 9: Less: Net CA Beg = -(BS row 16 at year Y-1)
 *   row 10: Total Net Investment = SUM(6:9)
 *   row 12: Total IC BOY = ROIC row 12 at year Y-1
 *   row 14: Growth Rate = row 10 / row 12
 *   row 15: Average of growth rates
 */

import type { YearKeyedSeries } from '@/types/financial'
import { computeGrowthRate, type GrowthRateResult } from '@/lib/calculations/growth-rate'

/**
 * @param bsAllRows BS leaf + computed rows (need rows 16, 22)
 * @param faRows FA computed rows (need row 69)
 * @param roicRows ROIC computed rows (need row 12)
 * @param roicYears ROIC year span [2019, 2020, 2021]
 * @returns Growth rate result + year mapping
 */
export interface GrowthRateLiveOutput {
  result: GrowthRateResult
  years: number[]
  /** Breakdown input arrays for display (parallel to years) */
  inputs: {
    netFaEnd: number[]
    netCaEnd: number[]
    netFaBeg: number[]
    netCaBeg: number[]
    totalIcBoy: number[]
  }
}

export function computeGrowthRateLive(
  bsAllRows: Record<number, YearKeyedSeries>,
  faRows: Record<number, YearKeyedSeries>,
  roicRows: Record<number, YearKeyedSeries>,
  roicYears: readonly number[],
): GrowthRateLiveOutput | null {
  if (roicYears.length < 2) return null

  // Growth Rate years = last N-1 ROIC years (need prior year for BOY)
  const grYears = roicYears.slice(1)

  const netFaEnd: number[] = []
  const netCaEnd: number[] = []
  const netFaBeg: number[] = []
  const netCaBeg: number[] = []
  const totalIcBoy: number[] = []

  for (let i = 0; i < grYears.length; i++) {
    const year = grYears[i]
    const priorYear = roicYears[i] // roicYears[i] is one before grYears[i]

    netFaEnd.push(faRows[69]?.[year] ?? 0)
    netCaEnd.push(bsAllRows[16]?.[year] ?? 0)
    netFaBeg.push(-(bsAllRows[22]?.[priorYear] ?? 0))
    netCaBeg.push(-(bsAllRows[16]?.[priorYear] ?? 0))
    totalIcBoy.push(roicRows[12]?.[priorYear] ?? 0)
  }

  const result = computeGrowthRate({
    netFaEnd,
    netCaEnd,
    netFaBeg,
    netCaBeg,
    totalIcBoy,
  })

  return {
    result,
    years: [...grYears],
    inputs: { netFaEnd, netCaEnd, netFaBeg, netCaBeg, totalIcBoy },
  }
}

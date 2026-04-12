/**
 * Growth Rate computation.
 *
 * Mirrors the GROWTH RATE sheet from kka-penilaian-saham.xlsx.
 * Growth Rate = Total Net Investment / Total IC Beginning of Year.
 *
 * Only 2 years of data (the last 2 historical years), not 3 or 4.
 * Average of the 2-year rates is the output used by DISCOUNT RATE C12.
 */

export interface GrowthRateInput {
  /** Net Fixed Assets at End of Year — from FA row 69 (total net FA) */
  netFaEnd: readonly number[]
  /** Net Current Assets at End of Year — from BS row 16 (Total Current Assets) */
  netCaEnd: readonly number[]
  /** Net Fixed Assets at Beginning of Year — from BS row 22 (Fixed Assets Net), negated */
  netFaBeg: readonly number[]
  /** Net Current Assets at Beginning of Year — from BS row 16 prior year, negated */
  netCaBeg: readonly number[]
  /** Total Invested Capital at Beginning of Year — from ROIC row 12 */
  totalIcBoy: readonly number[]
}

export interface GrowthRateResult {
  /** Total Net Investment per year = netFaEnd + netCaEnd + netFaBeg + netCaBeg */
  totalNetInvestment: number[]
  /** Growth Rate per year = totalNetInvestment / totalIcBoy */
  growthRates: number[]
  /** Average of all growth rates */
  average: number
}

export function computeGrowthRate(input: GrowthRateInput): GrowthRateResult {
  const len = input.netFaEnd.length

  const totalNetInvestment: number[] = []
  const growthRates: number[] = []

  for (let i = 0; i < len; i++) {
    const netInv =
      input.netFaEnd[i] +
      input.netCaEnd[i] +
      input.netFaBeg[i] +
      input.netCaBeg[i]
    totalNetInvestment.push(netInv)

    const ic = input.totalIcBoy[i]
    growthRates.push(ic !== 0 ? netInv / ic : 0)
  }

  const average =
    growthRates.length > 0
      ? growthRates.reduce((s, r) => s + r, 0) / growthRates.length
      : 0

  return { totalNetInvestment, growthRates, average }
}

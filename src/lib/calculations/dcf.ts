/**
 * Discounted Cash Flow (DCF) valuation.
 *
 * Source: DCF sheet. Mixed columns: C=historical last year, D-F=3 projection years.
 *
 * Part 1: FCF computation (NOPLAT + Depreciation - WC changes - CapEx)
 * Part 2: Discounting using WACC from Discount Rate (CAPM)
 * Part 3: Terminal Value via Gordon Growth Model
 * Part 4: Enterprise Value → Equity Value adjustments
 *
 * The equity→share value tail (DLOM/DLOC/ROUNDUP/perShare) is handled by
 * computeShareValue() — this function returns equityValue100 which feeds into it.
 */

export interface DcfInput {
  // Historical last year (all pre-signed per Excel formulas)
  historicalNoplat: number // NOPLAT!E19
  historicalDepreciation: number // FA!E51
  historicalChangesCA: number // CFS!E8
  historicalChangesCL: number // CFS!E9
  historicalCapex: number // FA!E23*-1 (negative)
  // Projected arrays (3 years, indices 0-2)
  projectedNoplat: number[] // PROY NOPLAT D/E/F row 19
  projectedDepreciation: number[] // PROY FA D/E/F row 51
  projectedChangesCA: number[] // PROY CFS D/E/F row 8
  projectedChangesCL: number[] // PROY CFS D/E/F row 9
  projectedCapex: number[] // PROY FA D/E/F row 23 * -1 (negative)
  // Discount rate
  wacc: number // DISCOUNT RATE!H10
  // Growth rate for terminal value
  growthRate: number // GROWTH RATE!C14
  // Equity adjustments (all pre-signed)
  interestBearingDebt: number // (BS!F31+F38)*-1 (negative)
  excessCash: number // ROIC!D10*-1 (positive, added to EV)
  idleAsset: number // ROIC!D9*-1 (typically 0)
}

export interface DcfResult {
  // FCF
  historicalFcf: number
  projectedFcf: number[] // 3 years
  // Discounting
  periods: number[] // [1, 2, 3]
  discountFactors: number[] // 1/(1+wacc)^n
  pvFcf: number[] // projected FCF * DF
  totalPvFcf: number // sum of pvFcf
  // Terminal value
  terminalValue: number // Gordon Growth: FCF_last * (1+g) / (r-g)
  pvTerminal: number // TV * last discount factor
  // Enterprise and equity value
  enterpriseValue: number // totalPvFcf + pvTerminal
  equityValue100: number // EV + IBD + excess cash + idle
}

export function computeDcf(input: DcfInput): DcfResult {
  const {
    historicalNoplat,
    historicalDepreciation,
    historicalChangesCA,
    historicalChangesCL,
    historicalCapex,
    projectedNoplat,
    projectedDepreciation,
    projectedChangesCA,
    projectedChangesCL,
    projectedCapex,
    wacc,
    growthRate,
    interestBearingDebt,
    excessCash,
    idleAsset,
  } = input

  const n = projectedNoplat.length

  // --- Part 1: FCF ---

  // Historical FCF
  const histGrossCF = historicalNoplat + historicalDepreciation // row 9
  const histTotalWC = historicalChangesCA + historicalChangesCL // row 14
  const histGrossInvestment = histTotalWC + historicalCapex // row 18
  const historicalFcf = histGrossCF + histGrossInvestment // row 20

  // Projected FCF (per year)
  const projectedFcf: number[] = []
  for (let i = 0; i < n; i++) {
    const grossCF = projectedNoplat[i]! + projectedDepreciation[i]! // row 9
    const totalWC = projectedChangesCA[i]! + projectedChangesCL[i]! // row 14
    const grossInvestment = totalWC + projectedCapex[i]! // row 18
    projectedFcf.push(grossCF + grossInvestment) // row 20
  }

  // --- Part 2: Discounting ---

  const periods: number[] = []
  const discountFactors: number[] = []
  const pvFcf: number[] = []

  for (let i = 0; i < n; i++) {
    const period = i + 1
    periods.push(period)
    const df = 1 / Math.pow(1 + wacc, period)
    discountFactors.push(df)
    pvFcf.push(projectedFcf[i]! * df)
  }

  const totalPvFcf = pvFcf.reduce((sum, v) => sum + v, 0)

  // --- Part 3: Terminal Value ---

  // Guard: wacc === growthRate would cause division by zero.
  // Note: g > r is allowed — when FCF is negative, the double-negative produces
  // a positive terminal value (this matches Excel behavior in the prototype).
  if (wacc === growthRate) {
    throw new Error(
      `DCF terminal value error: WACC (${wacc}) equals growth rate — division by zero.`
    )
  }

  const lastFcf = projectedFcf[n - 1]!
  const terminalValue = (lastFcf * (1 + growthRate)) / (wacc - growthRate)
  const pvTerminal = terminalValue * discountFactors[n - 1]!

  // --- Part 4: Enterprise → Equity Value ---

  const enterpriseValue = totalPvFcf + pvTerminal
  const equityValue100 =
    enterpriseValue + interestBearingDebt + excessCash + idleAsset

  return {
    historicalFcf,
    projectedFcf,
    periods,
    discountFactors,
    pvFcf,
    totalPvFcf,
    terminalValue,
    pvTerminal,
    enterpriseValue,
    equityValue100,
  }
}

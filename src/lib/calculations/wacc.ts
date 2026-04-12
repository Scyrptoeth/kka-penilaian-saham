/**
 * WACC computation — comparable companies approach.
 *
 * Mirrors the WACC sheet formulas from kka-penilaian-saham.xlsx.
 * Tax rate sourced from user input (IS!B33 in fixture = 0).
 * E22 (final WACC) is a manual override in the workbook ("Menurut WP").
 */

export interface WaccComparableInput {
  betaLevered: number
  marketCap: number
  debt: number
}

export interface WaccMarketParams {
  equityRiskPremium: number
  ratingBasedDefaultSpread: number
  riskFree: number
}

export interface WaccResult {
  /** Per-company beta unlevered */
  betaUnlevered: number[]
  /** Average of input beta levered values */
  avgBetaLevered: number
  /** Sum of market caps */
  totalMarketCap: number
  /** Sum of debts */
  totalDebt: number
  /** Average of beta unlevered values */
  avgBetaUnlevered: number
  /** Relevered beta from average BU + aggregate D/E */
  relleveredBeta: number
  /** Debt weight = totalDebt / (totalDebt + totalMarketCap) */
  weightDebt: number
  /** Equity weight = 1 - weightDebt */
  weightEquity: number
  /** After-tax cost of debt = avgBankRate * (1 - taxRate) */
  costOfDebt: number
  /** Cost of equity = Rf + relleveredBeta * ERP - RBDS */
  costOfEquity: number
  /** WACC debt component = weightDebt * costOfDebt */
  waccDebtComponent: number
  /** WACC equity component = weightEquity * costOfEquity */
  waccEquityComponent: number
  /** Computed WACC = debt component + equity component */
  computedWacc: number
}

/** Beta unlevered via Hamada equation: BL / (1 + (1-t)*(D/E)) */
export function computeBetaUnlevered(
  betaLevered: number,
  taxRate: number,
  debt: number,
  marketCap: number,
): number {
  if (marketCap === 0) return 0
  return betaLevered / (1 + ((1 - taxRate) * (debt / marketCap)))
}

/** Relevered beta: avgBU * (1 + (1-t)*(D_total/E_total)) */
export function computeRelleveredBeta(
  avgBetaUnlevered: number,
  taxRate: number,
  totalDebt: number,
  totalMarketCap: number,
): number {
  if (totalMarketCap === 0) return 0
  return avgBetaUnlevered * (1 + ((1 - taxRate) * (totalDebt / totalMarketCap)))
}

/** Full WACC computation from comparable companies approach. */
export function computeWacc(
  companies: readonly WaccComparableInput[],
  taxRate: number,
  params: WaccMarketParams,
  avgBankRate: number,
): WaccResult {
  // Per-company BU
  const betaUnlevered = companies.map(c =>
    computeBetaUnlevered(c.betaLevered, taxRate, c.debt, c.marketCap),
  )

  // Aggregates
  const avgBetaLevered =
    companies.length > 0
      ? companies.reduce((s, c) => s + c.betaLevered, 0) / companies.length
      : 0
  const totalMarketCap = companies.reduce((s, c) => s + c.marketCap, 0)
  const totalDebt = companies.reduce((s, c) => s + c.debt, 0)
  const avgBetaUnlevered =
    betaUnlevered.length > 0
      ? betaUnlevered.reduce((s, v) => s + v, 0) / betaUnlevered.length
      : 0

  // Relevered beta
  const relleveredBeta = computeRelleveredBeta(
    avgBetaUnlevered, taxRate, totalDebt, totalMarketCap,
  )

  // Capital structure weights (from comparable aggregates)
  const totalCapital = totalDebt + totalMarketCap
  const weightDebt = totalCapital > 0 ? totalDebt / totalCapital : 0
  const weightEquity = 1 - weightDebt

  // Costs
  const costOfDebt = avgBankRate * (1 - taxRate)
  const costOfEquity =
    params.riskFree + (relleveredBeta * params.equityRiskPremium) - params.ratingBasedDefaultSpread

  // WACC components
  const waccDebtComponent = weightDebt * costOfDebt
  const waccEquityComponent = weightEquity * costOfEquity
  const computedWacc = waccDebtComponent + waccEquityComponent

  return {
    betaUnlevered,
    avgBetaLevered,
    totalMarketCap,
    totalDebt,
    avgBetaUnlevered,
    relleveredBeta,
    weightDebt,
    weightEquity,
    costOfDebt,
    costOfEquity,
    waccDebtComponent,
    waccEquityComponent,
    computedWacc,
  }
}

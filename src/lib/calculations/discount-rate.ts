/**
 * Discount Rate (CAPM) computation.
 *
 * Mirrors the DISCOUNT RATE sheet from kka-penilaian-saham.xlsx.
 * This is SEPARATE from the WACC sheet — different inputs, different approach.
 * The WACC produced here (H10) is the one actually used by DCF.
 */

export interface DiscountRateInput {
  taxRate: number       // C2
  riskFree: number      // C3
  beta: number          // C4 (levered beta)
  erp: number           // C5 (equity risk premium)
  countrySpread: number // C6 (country default spread)
  debtRate: number      // C7 (from bank rates, after rounding)
  der: number           // C8 (DER industry)
}

export interface DiscountRateResult {
  bu: number            // H1 — beta unlevered
  bl: number            // H2 — beta relevered (round-trip)
  ke: number            // H3 — cost of equity
  kd: number            // H4 — cost of debt (after-tax)
  weightDebt: number    // F7
  weightEquity: number  // F8
  waccDebt: number      // H7 — debt WACC component
  waccEquity: number    // H8 — equity WACC component
  wacc: number          // H10 — final WACC
}

/** BU = Beta / (1 + (1-t) * DER) — Hamada unlevering */
export function computeBetaUnleveredCAPM(
  beta: number,
  taxRate: number,
  der: number,
): number {
  return beta / (1 + ((1 - taxRate) * der))
}

/** BL = BU * (1 + (1-t) * DER) — Hamada relevering */
export function computeBetaLeveredCAPM(
  bu: number,
  taxRate: number,
  der: number,
): number {
  return bu * (1 + ((1 - taxRate) * der))
}

/** Ke = Rf + (BL * ERP) - Country Default Spread */
export function computeCostOfEquity(
  riskFree: number,
  betaLevered: number,
  erp: number,
  countrySpread: number,
): number {
  return riskFree + (betaLevered * erp) - countrySpread
}

/** Kd = Debt Rate * (1 - t) */
export function computeCostOfDebt(debtRate: number, taxRate: number): number {
  return debtRate * (1 - taxRate)
}

/** Compute average bank rate and round to 3 decimal places (mimics ROUND(L11/100, 3)). */
export function computeDebtRateFromBanks(rates: readonly number[]): number {
  if (rates.length === 0) return 0
  const avg = rates.reduce((s, r) => s + r, 0) / rates.length
  // Excel formula: =ROUND(L11/100, 3). L-values are in "9.41" format (percent-like).
  // Rates here are already in "9.41" format, not decimal.
  return Math.round((avg / 100) * 1000) / 1000
}

/** Full Discount Rate CAPM computation. */
export function computeDiscountRate(input: DiscountRateInput): DiscountRateResult {
  const bu = computeBetaUnleveredCAPM(input.beta, input.taxRate, input.der)
  const bl = computeBetaLeveredCAPM(bu, input.taxRate, input.der)
  const ke = computeCostOfEquity(input.riskFree, bl, input.erp, input.countrySpread)
  const kd = computeCostOfDebt(input.debtRate, input.taxRate)

  // Weights from DER
  const weightDebt = input.der / (1 + input.der)
  const weightEquity = 1 - weightDebt

  const waccDebt = weightDebt * kd
  const waccEquity = weightEquity * ke
  const wacc = waccDebt + waccEquity

  return { bu, bl, ke, kd, weightDebt, weightEquity, waccDebt, waccEquity, wacc }
}

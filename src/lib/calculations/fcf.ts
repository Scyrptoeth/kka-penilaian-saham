/**
 * Free Cash Flow (FCF) — builds the full FCF schedule from pre-signed inputs.
 *
 * Mirrors the `FCF` worksheet of kka-penilaian-saham.xlsx.
 *
 *   grossCashFlow           = NOPLAT + depreciationAddback
 *   totalWorkingCapitalΔ    = ΔCurrentAssets + ΔCurrentLiabilities
 *   grossInvestment         = totalWorkingCapitalΔ + capex
 *   freeCashFlow            = grossCashFlow + grossInvestment
 *
 * IMPORTANT: The reference workbook stores `depreciationAddback` and `capex`
 * as pre-signed values (the sheet uses `='FIXED ASSET'!*-1` to negate them
 * before feeding them here). Callers must supply them in the same sign
 * convention to preserve fidelity with Excel outputs.
 */

export interface FcfInput {
  noplat: readonly number[]
  depreciationAddback: readonly number[]
  deltaCurrentAssets: readonly number[]
  deltaCurrentLiabilities: readonly number[]
  capex: readonly number[]
}

export interface FcfResult {
  grossCashFlow: number[]
  totalWorkingCapitalChange: number[]
  grossInvestment: number[]
  freeCashFlow: number[]
}

function assertSameLength(label: string, arr: readonly number[], expected: number): void {
  if (arr.length !== expected) {
    throw new RangeError(
      `fcf: ${label} length ${arr.length} does not match expected ${expected}`,
    )
  }
}

export function computeFcf(input: FcfInput): FcfResult {
  const years = input.noplat.length
  if (years === 0) {
    throw new RangeError('fcf: noplat must not be empty')
  }
  assertSameLength('depreciationAddback', input.depreciationAddback, years)
  assertSameLength('deltaCurrentAssets', input.deltaCurrentAssets, years)
  assertSameLength('deltaCurrentLiabilities', input.deltaCurrentLiabilities, years)
  assertSameLength('capex', input.capex, years)

  const grossCashFlow: number[] = new Array(years)
  const totalWorkingCapitalChange: number[] = new Array(years)
  const grossInvestment: number[] = new Array(years)
  const freeCashFlow: number[] = new Array(years)

  for (let i = 0; i < years; i++) {
    grossCashFlow[i] = input.noplat[i] + input.depreciationAddback[i]
    totalWorkingCapitalChange[i] =
      input.deltaCurrentAssets[i] + input.deltaCurrentLiabilities[i]
    grossInvestment[i] = totalWorkingCapitalChange[i] + input.capex[i]
    freeCashFlow[i] = grossCashFlow[i] + grossInvestment[i]
  }

  return {
    grossCashFlow,
    totalWorkingCapitalChange,
    grossInvestment,
    freeCashFlow,
  }
}

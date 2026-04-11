/**
 * Cash Flow Statement calculations.
 *
 * Mirrors the `CASH FLOW STATEMENT` worksheet of kka-penilaian-saham.xlsx.
 *
 *   workingCapitalChange     = ΔCurrentAssets + ΔCurrentLiabilities
 *   cashFlowFromOperations   = EBITDA + corporateTax
 *                              + ΔCurrentAssets + ΔCurrentLiabilities
 *   cashFlowFromInvesting    = capex            (pre-signed)
 *   cashFlowBeforeFinancing  = CFO + cashFlowFromNonOperations + CFI
 *   cashFlowFromFinancing    = equityInjection + newLoan + interestPayment
 *                              + interestIncome + principalRepayment
 *   netCashFlow              = CFO + cashFlowFromNonOperations + CFI + CFF
 *
 * As with the FCF module, inputs arrive in Excel's pre-signed convention:
 *   - `corporateTax` is a negative number (Excel stores it as a cash outflow).
 *   - `capex` is a negative number.
 *   - `deltaCurrentAssets` / `deltaCurrentLiabilities` may be positive or
 *     negative depending on the direction of the balance-sheet change.
 *   - `interestPayment` is typically negative (cash outflow).
 *   - `interestIncome` is typically positive (cash inflow).
 *
 * Function is pure; all outputs are new arrays.
 */

export interface CashFlowInput {
  ebitda: readonly number[]
  corporateTax: readonly number[]
  deltaCurrentAssets: readonly number[]
  deltaCurrentLiabilities: readonly number[]
  cashFlowFromNonOperations: readonly number[]
  capex: readonly number[]
  equityInjection: readonly number[]
  newLoan: readonly number[]
  interestPayment: readonly number[]
  interestIncome: readonly number[]
  principalRepayment: readonly number[]
}

export interface CashFlowResult {
  workingCapitalChange: number[]
  cashFlowFromOperations: number[]
  cashFlowFromInvesting: number[]
  cashFlowBeforeFinancing: number[]
  cashFlowFromFinancing: number[]
  netCashFlow: number[]
}

function assertSameLength(
  label: string,
  arr: readonly number[],
  expected: number,
): void {
  if (arr.length !== expected) {
    throw new RangeError(
      `cash-flow: ${label} length ${arr.length} does not match expected ${expected}`,
    )
  }
}

export function computeCashFlowStatement(input: CashFlowInput): CashFlowResult {
  const years = input.ebitda.length
  if (years === 0) {
    throw new RangeError('cash-flow: ebitda must not be empty')
  }

  const fields: readonly (keyof CashFlowInput)[] = [
    'corporateTax',
    'deltaCurrentAssets',
    'deltaCurrentLiabilities',
    'cashFlowFromNonOperations',
    'capex',
    'equityInjection',
    'newLoan',
    'interestPayment',
    'interestIncome',
    'principalRepayment',
  ]
  for (const f of fields) assertSameLength(f, input[f], years)

  const workingCapitalChange: number[] = new Array(years)
  const cashFlowFromOperations: number[] = new Array(years)
  const cashFlowFromInvesting: number[] = new Array(years)
  const cashFlowBeforeFinancing: number[] = new Array(years)
  const cashFlowFromFinancing: number[] = new Array(years)
  const netCashFlow: number[] = new Array(years)

  for (let i = 0; i < years; i++) {
    workingCapitalChange[i] =
      input.deltaCurrentAssets[i] + input.deltaCurrentLiabilities[i]

    cashFlowFromOperations[i] =
      input.ebitda[i] +
      input.corporateTax[i] +
      input.deltaCurrentAssets[i] +
      input.deltaCurrentLiabilities[i]

    cashFlowFromInvesting[i] = input.capex[i]

    cashFlowBeforeFinancing[i] =
      cashFlowFromOperations[i] +
      input.cashFlowFromNonOperations[i] +
      cashFlowFromInvesting[i]

    cashFlowFromFinancing[i] =
      input.equityInjection[i] +
      input.newLoan[i] +
      input.interestPayment[i] +
      input.interestIncome[i] +
      input.principalRepayment[i]

    netCashFlow[i] =
      cashFlowFromOperations[i] +
      input.cashFlowFromNonOperations[i] +
      cashFlowFromInvesting[i] +
      cashFlowFromFinancing[i]
  }

  return {
    workingCapitalChange,
    cashFlowFromOperations,
    cashFlowFromInvesting,
    cashFlowBeforeFinancing,
    cashFlowFromFinancing,
    netCashFlow,
  }
}

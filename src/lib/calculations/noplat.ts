/**
 * NOPLAT — Net Operating Profit Less Adjusted Taxes.
 *
 * Mirrors the `NOPLAT` worksheet of kka-penilaian-saham.xlsx.
 *
 *   EBIT              = PBT + InterestExpense + InterestIncome + NonOperatingIncome
 *                       (Excel uses SUM with pre-signed values; InterestIncome is
 *                        typically entered as a negative number.)
 *   TotalTaxesOnEBIT  = TaxProvision + TaxShieldInterestExpense
 *                     + TaxOnInterestIncome + TaxOnNonOperatingIncome
 *   NOPLAT            = EBIT − TotalTaxesOnEBIT
 *
 * All inputs/outputs are year-indexed arrays (length N = number of historical
 * years). Function is pure and deterministic.
 */

export interface NoplatInput {
  profitBeforeTax: readonly number[]
  interestExpense: readonly number[]
  interestIncome: readonly number[]
  nonOperatingIncome: readonly number[]
  taxProvision: readonly number[]
  taxShieldInterestExpense?: readonly number[]
  taxOnInterestIncome?: readonly number[]
  taxOnNonOperatingIncome?: readonly number[]
}

export interface NoplatResult {
  ebit: number[]
  totalTaxesOnEbit: number[]
  noplat: number[]
}

function assertSameLength(label: string, arr: readonly number[], expected: number): void {
  if (arr.length !== expected) {
    throw new RangeError(
      `noplat: ${label} length ${arr.length} does not match expected ${expected}`,
    )
  }
}

function defaulted(
  source: readonly number[] | undefined,
  length: number,
): readonly number[] {
  if (!source) return Array.from({ length }, () => 0)
  assertSameLength('optional series', source, length)
  return source
}

export function computeNoplat(input: NoplatInput): NoplatResult {
  const years = input.profitBeforeTax.length
  if (years === 0) {
    throw new RangeError('noplat: profitBeforeTax must not be empty')
  }
  assertSameLength('interestExpense', input.interestExpense, years)
  assertSameLength('interestIncome', input.interestIncome, years)
  assertSameLength('nonOperatingIncome', input.nonOperatingIncome, years)
  assertSameLength('taxProvision', input.taxProvision, years)

  const taxShieldInterestExpense = defaulted(input.taxShieldInterestExpense, years)
  const taxOnInterestIncome = defaulted(input.taxOnInterestIncome, years)
  const taxOnNonOperatingIncome = defaulted(input.taxOnNonOperatingIncome, years)

  const ebit: number[] = new Array(years)
  const totalTaxesOnEbit: number[] = new Array(years)
  const noplat: number[] = new Array(years)

  for (let i = 0; i < years; i++) {
    ebit[i] =
      input.profitBeforeTax[i] +
      input.interestExpense[i] +
      input.interestIncome[i] +
      input.nonOperatingIncome[i]

    totalTaxesOnEbit[i] =
      input.taxProvision[i] +
      taxShieldInterestExpense[i] +
      taxOnInterestIncome[i] +
      taxOnNonOperatingIncome[i]

    noplat[i] = ebit[i] - totalTaxesOnEbit[i]
  }

  return { ebit, totalTaxesOnEbit, noplat }
}

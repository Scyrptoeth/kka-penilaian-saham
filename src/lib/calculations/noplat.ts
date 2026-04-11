/**
 * NOPLAT — Net Operating Profit Less Adjusted Taxes.
 *
 * Mirrors the `NOPLAT` worksheet of kka-penilaian-saham.xlsx.
 *
 *   EBIT              = PBT + InterestExpense + InterestIncome + NonOperatingIncome
 *                       (Excel SUM with pre-signed values; InterestIncome is
 *                        typically entered as a negative number.)
 *   TotalTaxesOnEBIT  = TaxProvision + TaxShieldInterestExpense
 *                     + TaxOnInterestIncome + TaxOnNonOperatingIncome
 *   NOPLAT            = EBIT − TotalTaxesOnEBIT
 *
 * All inputs/outputs are {@link YearKeyedSeries}. The primary input
 * `profitBeforeTax` defines the year axis; all other series must share the
 * same year set (validated via {@link assertSameYears}).
 *
 * Function is pure. Tax-adjustment inputs are optional — when omitted, they
 * default to a zero-valued series for every year in the axis.
 */

import type { YearKeyedSeries } from '@/types/financial'
import { assertSameYears, emptySeriesLike, yearsOf } from './helpers'

export interface NoplatInput {
  profitBeforeTax: YearKeyedSeries
  interestExpense: YearKeyedSeries
  interestIncome: YearKeyedSeries
  nonOperatingIncome: YearKeyedSeries
  taxProvision: YearKeyedSeries
  taxShieldInterestExpense?: YearKeyedSeries
  taxOnInterestIncome?: YearKeyedSeries
  taxOnNonOperatingIncome?: YearKeyedSeries
}

export interface NoplatResult {
  ebit: YearKeyedSeries
  totalTaxesOnEbit: YearKeyedSeries
  noplat: YearKeyedSeries
}

function optionalOrZeros(
  source: YearKeyedSeries | undefined,
  anchor: YearKeyedSeries,
  label: string,
): YearKeyedSeries {
  if (!source) return emptySeriesLike(anchor)
  assertSameYears(label, anchor, source)
  return source
}

export function computeNoplat(input: NoplatInput): NoplatResult {
  const anchor = input.profitBeforeTax
  const years = yearsOf(anchor)
  if (years.length === 0) {
    throw new RangeError('noplat: profitBeforeTax must not be empty')
  }

  assertSameYears('noplat.interestExpense', anchor, input.interestExpense)
  assertSameYears('noplat.interestIncome', anchor, input.interestIncome)
  assertSameYears('noplat.nonOperatingIncome', anchor, input.nonOperatingIncome)
  assertSameYears('noplat.taxProvision', anchor, input.taxProvision)

  const taxShieldInterestExpense = optionalOrZeros(
    input.taxShieldInterestExpense,
    anchor,
    'noplat.taxShieldInterestExpense',
  )
  const taxOnInterestIncome = optionalOrZeros(
    input.taxOnInterestIncome,
    anchor,
    'noplat.taxOnInterestIncome',
  )
  const taxOnNonOperatingIncome = optionalOrZeros(
    input.taxOnNonOperatingIncome,
    anchor,
    'noplat.taxOnNonOperatingIncome',
  )

  const ebit: YearKeyedSeries = {}
  const totalTaxesOnEbit: YearKeyedSeries = {}
  const noplat: YearKeyedSeries = {}

  for (const y of years) {
    ebit[y] =
      input.profitBeforeTax[y] +
      input.interestExpense[y] +
      input.interestIncome[y] +
      input.nonOperatingIncome[y]

    totalTaxesOnEbit[y] =
      input.taxProvision[y] +
      taxShieldInterestExpense[y] +
      taxOnInterestIncome[y] +
      taxOnNonOperatingIncome[y]

    noplat[y] = ebit[y] - totalTaxesOnEbit[y]
  }

  return { ebit, totalTaxesOnEbit, noplat }
}

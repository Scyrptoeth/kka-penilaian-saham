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
 * convention. The {@link ../adapters/fcf-adapter} handles this explicitly.
 *
 * All inputs/outputs are {@link YearKeyedSeries} sharing a single year axis.
 */

import type { YearKeyedSeries } from '@/types/financial'
import { assertSameYears, yearsOf } from './helpers'

export interface FcfInput {
  noplat: YearKeyedSeries
  depreciationAddback: YearKeyedSeries
  deltaCurrentAssets: YearKeyedSeries
  deltaCurrentLiabilities: YearKeyedSeries
  capex: YearKeyedSeries
}

export interface FcfResult {
  grossCashFlow: YearKeyedSeries
  totalWorkingCapitalChange: YearKeyedSeries
  grossInvestment: YearKeyedSeries
  freeCashFlow: YearKeyedSeries
}

export function computeFcf(input: FcfInput): FcfResult {
  const anchor = input.noplat
  const years = yearsOf(anchor)
  if (years.length === 0) {
    throw new RangeError('fcf: noplat must not be empty')
  }

  assertSameYears('fcf.depreciationAddback', anchor, input.depreciationAddback)
  assertSameYears('fcf.deltaCurrentAssets', anchor, input.deltaCurrentAssets)
  assertSameYears(
    'fcf.deltaCurrentLiabilities',
    anchor,
    input.deltaCurrentLiabilities,
  )
  assertSameYears('fcf.capex', anchor, input.capex)

  const grossCashFlow: YearKeyedSeries = {}
  const totalWorkingCapitalChange: YearKeyedSeries = {}
  const grossInvestment: YearKeyedSeries = {}
  const freeCashFlow: YearKeyedSeries = {}

  for (const y of years) {
    grossCashFlow[y] = input.noplat[y] + input.depreciationAddback[y]
    totalWorkingCapitalChange[y] =
      input.deltaCurrentAssets[y] + input.deltaCurrentLiabilities[y]
    grossInvestment[y] = totalWorkingCapitalChange[y] + input.capex[y]
    freeCashFlow[y] = grossCashFlow[y] + grossInvestment[y]
  }

  return {
    grossCashFlow,
    totalWorkingCapitalChange,
    grossInvestment,
    freeCashFlow,
  }
}

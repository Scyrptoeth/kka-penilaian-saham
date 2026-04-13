/**
 * Cash Flow Available to Investor (CFI).
 *
 * Source: CFI sheet. Combines historical + projected data.
 *
 * Row 7: Free Cash Flow (hist from FCF, proj from DCF)
 * Row 8: Non-Operational Cash Flow (hist from IS row 30, proj from PROY LR row 34)
 * Row 9: CFI = FCF + NonOpCf
 */

import type { YearKeyedSeries } from '@/types/financial'

export interface CfiInput {
  historicalFcf: YearKeyedSeries
  projectedFcf: YearKeyedSeries
  historicalNonOpCf: YearKeyedSeries
  projectedNonOpCf: YearKeyedSeries
}

export interface CfiOutput {
  /** Merged historical + projected FCF. */
  fcf: YearKeyedSeries
  /** Merged historical + projected non-operational cash flow. */
  nonOpCf: YearKeyedSeries
  /** CFI = FCF + NonOpCf per year. */
  cfi: YearKeyedSeries
}

export function computeCfi(input: CfiInput): CfiOutput {
  const fcf: YearKeyedSeries = { ...input.historicalFcf, ...input.projectedFcf }
  const nonOpCf: YearKeyedSeries = { ...input.historicalNonOpCf, ...input.projectedNonOpCf }

  const cfi: YearKeyedSeries = {}
  for (const yearStr of Object.keys(fcf)) {
    const year = Number(yearStr)
    cfi[year] = (fcf[year] ?? 0) + (nonOpCf[year] ?? 0)
  }

  return { fcf, nonOpCf, cfi }
}

/**
 * End-to-end integration test for the full calc pipeline:
 *
 *     raw data → Zod validate → adapter → pure calc → assert against fixture
 *
 * This is the canonical flow that the UI will use in Session 2B. Proving it
 * works end-to-end now ensures that validation + adapter + calc compose
 * correctly before any UI wiring begins.
 */

import { describe, expect, it } from 'vitest'
import { toFcfInput } from '@/lib/adapters/fcf-adapter'
import { toNoplatInput } from '@/lib/adapters/noplat-adapter'
import { validatedFcf, validatedNoplat } from '@/lib/validation'
import type { YearKeyedSeries } from '@/types/financial'
import {
  cashFlowStatementCells,
  fcfCells,
  fixedAssetCells,
  incomeStatementCells,
  noplatCells,
  num,
} from '../helpers/fixture'

const PRECISION = 12
const YEARS = [2019, 2020, 2021] as const
const IS_COL: Record<number, string> = { 2019: 'D', 2020: 'E', 2021: 'F' }
const FA_COL: Record<number, string> = { 2019: 'C', 2020: 'D', 2021: 'E' }
const NOPLAT_COL: Record<number, string> = { 2019: 'C', 2020: 'D', 2021: 'E' }
const FCF_COL: Record<number, string> = { 2019: 'C', 2020: 'D', 2021: 'E' }
const CFS_COL: Record<number, string> = { 2019: 'C', 2020: 'D', 2021: 'E' }

function series(
  cells: Map<string, { value: unknown } | undefined>,
  colMap: Record<number, string>,
  row: number,
): YearKeyedSeries {
  const out: YearKeyedSeries = {}
  for (const y of YEARS) {
    const cell = cells.get(`${colMap[y]}${row}`)
    if (!cell || typeof cell.value !== 'number') {
      throw new Error(`integration test: missing numeric cell ${colMap[y]}${row}`)
    }
    out[y] = cell.value as number
  }
  return out
}

describe('pipeline: raw → validate → adapt → calc (NOPLAT + FCF chain)', () => {
  it('NOPLAT computed via adapter + validator matches Excel NOPLAT row 19', () => {
    const rawIs = {
      profitBeforeTax: series(incomeStatementCells, IS_COL, 32),
      interestExpenseRawSigned: series(incomeStatementCells, IS_COL, 27),
      interestIncomeRawSigned: series(incomeStatementCells, IS_COL, 26),
      nonOperatingIncomeRawSigned: series(incomeStatementCells, IS_COL, 30),
      corporateTaxRawSigned: series(incomeStatementCells, IS_COL, 33),
    }

    // raw → adapter → validate → pure calc
    const adapted = toNoplatInput(rawIs)
    const result = validatedNoplat(adapted)

    for (const y of YEARS) {
      expect(result.noplat[y]).toBeCloseTo(
        num(noplatCells, `${NOPLAT_COL[y]}19`),
        PRECISION,
      )
    }
  })

  it('FCF computed via two-stage pipeline matches Excel FCF row 20', () => {
    // Stage 1: compute NOPLAT first (since FCF depends on it).
    const rawIs = {
      profitBeforeTax: series(incomeStatementCells, IS_COL, 32),
      interestExpenseRawSigned: series(incomeStatementCells, IS_COL, 27),
      interestIncomeRawSigned: series(incomeStatementCells, IS_COL, 26),
      nonOperatingIncomeRawSigned: series(incomeStatementCells, IS_COL, 30),
      corporateTaxRawSigned: series(incomeStatementCells, IS_COL, 33),
    }
    const noplatResult = validatedNoplat(toNoplatInput(rawIs))

    // Stage 2: feed NOPLAT into FCF together with raw FA + WC deltas.
    const rawFcf = {
      noplat: noplatResult.noplat,
      depreciation: series(fixedAssetCells, FA_COL, 51),
      deltaCurrentAssets: series(cashFlowStatementCells, CFS_COL, 8),
      deltaCurrentLiabilities: series(cashFlowStatementCells, CFS_COL, 9),
      capex: series(fixedAssetCells, FA_COL, 23),
    }
    const fcfResult = validatedFcf(toFcfInput(rawFcf))

    for (const y of YEARS) {
      expect(fcfResult.freeCashFlow[y]).toBeCloseTo(
        num(fcfCells, `${FCF_COL[y]}20`),
        PRECISION,
      )
    }
  })

  it('pipeline rejects a NaN raw input with ValidationError before calc runs', () => {
    const broken = {
      profitBeforeTax: { 2019: 100, 2020: Number.NaN, 2021: 300 },
      interestExpenseRawSigned: { 2019: 0, 2020: 0, 2021: 0 },
      interestIncomeRawSigned: { 2019: 0, 2020: 0, 2021: 0 },
      nonOperatingIncomeRawSigned: { 2019: 0, 2020: 0, 2021: 0 },
      corporateTaxRawSigned: { 2019: 0, 2020: 0, 2021: 0 },
    }
    expect(() => validatedNoplat(toNoplatInput(broken))).toThrow(
      /validation failed/,
    )
  })
})

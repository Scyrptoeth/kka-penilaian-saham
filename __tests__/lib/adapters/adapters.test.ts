/**
 * Adapter tests — assert that the `raw → adapter → calc` flow produces the
 * same numbers as the Excel fixtures, proving that explicit sign handling
 * in the adapter layer is equivalent to the pre-signed convention the pure
 * calc functions expect.
 */

import { describe, expect, it } from 'vitest'
import { computeFcf } from '@/lib/calculations/fcf'
import { computeCashFlowStatement } from '@/lib/calculations/cash-flow'
import { computeNoplat } from '@/lib/calculations/noplat'
import { toFcfInput } from '@/lib/adapters/fcf-adapter'
import { toCashFlowInput } from '@/lib/adapters/cash-flow-adapter'
import { toNoplatInput } from '@/lib/adapters/noplat-adapter'
import type { YearKeyedSeries } from '@/types/financial'
import {
  balanceSheetCells,
  cashFlowStatementCells,
  fcfCells,
  fixedAssetCells,
  incomeStatementCells,
  noplatCells,
  num,
} from '../../helpers/fixture'

const PRECISION = 12
const YEARS = [2019, 2020, 2021] as const
const BS_IS_COL: Record<number, string> = { 2019: 'D', 2020: 'E', 2021: 'F' }
const CFS_FCF_COL: Record<number, string> = { 2019: 'C', 2020: 'D', 2021: 'E' }
const FA_COL: Record<number, string> = { 2019: 'C', 2020: 'D', 2021: 'E' }
const NOPLAT_COL: Record<number, string> = { 2019: 'C', 2020: 'D', 2021: 'E' }

function seriesFromCells(
  cells: Map<string, { value: unknown } | undefined>,
  colMap: Record<number, string>,
  row: number,
): YearKeyedSeries {
  const out: YearKeyedSeries = {}
  for (const y of YEARS) {
    const cell = cells.get(`${colMap[y]}${row}`)
    if (!cell || typeof cell.value !== 'number') {
      throw new Error(`adapter test: missing numeric cell ${colMap[y]}${row}`)
    }
    out[y] = cell.value as number
  }
  return out
}

describe('toNoplatInput — raw IS data → NOPLAT input → computeNoplat', () => {
  it('produces NOPLAT matching the NOPLAT sheet row 19', () => {
    // Raw IS data — cells stored with their native signs.
    // IS!D26/E26/F26 = Interest Income (positive)
    // IS!D27/E27/F27 = Interest Expense (negative)
    // IS!D30/E30/F30 = Non-Operating Income (signed)
    // IS!D32/E32/F32 = PBT (positive)
    // IS!D33/E33/F33 = Corporate Tax (negative)
    const raw = {
      profitBeforeTax: seriesFromCells(incomeStatementCells, BS_IS_COL, 32),
      interestExpenseRawSigned: seriesFromCells(incomeStatementCells, BS_IS_COL, 27),
      interestIncomeRawSigned: seriesFromCells(incomeStatementCells, BS_IS_COL, 26),
      nonOperatingIncomeRawSigned: seriesFromCells(
        incomeStatementCells,
        BS_IS_COL,
        30,
      ),
      corporateTaxRawSigned: seriesFromCells(incomeStatementCells, BS_IS_COL, 33),
    }

    const noplatInput = toNoplatInput(raw)
    const result = computeNoplat(noplatInput)

    // NOPLAT sheet row 19 is the canonical NOPLAT value.
    for (const y of YEARS) {
      expect(result.noplat[y]).toBeCloseTo(
        num(noplatCells, `${NOPLAT_COL[y]}19`),
        PRECISION,
      )
      expect(result.ebit[y]).toBeCloseTo(
        num(noplatCells, `${NOPLAT_COL[y]}11`),
        PRECISION,
      )
    }
  })
})

describe('toFcfInput — raw positive data → FCF input → computeFcf', () => {
  it('produces FCF matching the FCF sheet row 20', () => {
    // Raw data from source sheets:
    //   NOPLAT:         NOPLAT!C19..E19           (positive)
    //   Depreciation:   FIXED ASSET!C51..E51      (positive additions)
    //   ΔCurrent Assets / Liabilities: taken AS-IS from CFS rows 8/9 (signed)
    //   CAPEX:          FIXED ASSET!C23..E23      (positive additions)
    const raw = {
      noplat: seriesFromCells(noplatCells, NOPLAT_COL, 19),
      depreciation: seriesFromCells(fixedAssetCells, FA_COL, 51),
      deltaCurrentAssets: seriesFromCells(cashFlowStatementCells, CFS_FCF_COL, 8),
      deltaCurrentLiabilities: seriesFromCells(
        cashFlowStatementCells,
        CFS_FCF_COL,
        9,
      ),
      capex: seriesFromCells(fixedAssetCells, FA_COL, 23),
    }

    const fcfInput = toFcfInput(raw)
    const result = computeFcf(fcfInput)

    // FCF sheet row 20 is the canonical FCF value.
    for (const y of YEARS) {
      expect(result.freeCashFlow[y]).toBeCloseTo(
        num(fcfCells, `${CFS_FCF_COL[y]}20`),
        PRECISION,
      )
      expect(result.grossCashFlow[y]).toBeCloseTo(
        num(fcfCells, `${CFS_FCF_COL[y]}9`),
        PRECISION,
      )
    }
  })
})

describe('toCashFlowInput — raw IS/BS/FA data → CFS input → computeCashFlowStatement', () => {
  it('produces Net CF matching the Cash Flow Statement sheet row 30', () => {
    const raw = {
      ebitda: seriesFromCells(incomeStatementCells, BS_IS_COL, 18),
      corporateTaxRawSigned: seriesFromCells(
        incomeStatementCells,
        BS_IS_COL,
        33,
      ),
      // ΔCA / ΔCL here are taken pre-computed from the CFS sheet since
      // they are Balance-Sheet-derived composites that the source workbook
      // already evaluates. Real UI will compute these from BS deltas.
      deltaCurrentAssets: seriesFromCells(
        cashFlowStatementCells,
        CFS_FCF_COL,
        8,
      ),
      deltaCurrentLiabilities: seriesFromCells(
        cashFlowStatementCells,
        CFS_FCF_COL,
        9,
      ),
      cashFlowFromNonOperations: seriesFromCells(
        incomeStatementCells,
        BS_IS_COL,
        30,
      ),
      // Positive CAPEX from Fixed Asset — adapter will flip the sign.
      capex: seriesFromCells(fixedAssetCells, FA_COL, 23),
      equityInjection: seriesFromCells(
        cashFlowStatementCells,
        CFS_FCF_COL,
        22,
      ),
      newLoan: seriesFromCells(cashFlowStatementCells, CFS_FCF_COL, 23),
      interestPaymentRawSigned: seriesFromCells(
        incomeStatementCells,
        BS_IS_COL,
        27,
      ),
      interestIncomeRawSigned: seriesFromCells(
        incomeStatementCells,
        BS_IS_COL,
        26,
      ),
      principalRepayment: seriesFromCells(
        cashFlowStatementCells,
        CFS_FCF_COL,
        26,
      ),
    }

    const cfsInput = toCashFlowInput(raw)
    const result = computeCashFlowStatement(cfsInput)

    for (const y of YEARS) {
      expect(result.cashFlowFromOperations[y]).toBeCloseTo(
        num(cashFlowStatementCells, `${CFS_FCF_COL[y]}11`),
        PRECISION,
      )
      expect(result.netCashFlow[y]).toBeCloseTo(
        num(cashFlowStatementCells, `${CFS_FCF_COL[y]}30`),
        PRECISION,
      )
    }
    // balanceSheetCells import is kept for consistency with fixture usage across the file.
    expect(balanceSheetCells.size).toBeGreaterThan(0)
  })
})

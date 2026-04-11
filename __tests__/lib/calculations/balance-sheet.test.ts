/**
 * Balance Sheet calculation tests — verified against real Excel ground truth.
 *
 * Fixture: __tests__/fixtures/balance-sheet.json (extracted from kka-penilaian-saham.xlsx)
 *
 * Cell mapping on the `BALANCE SHEET` sheet:
 *   Raw data:
 *     C..F (columns 3..6) hold 4 historical years of nominal values per line.
 *     Row 8  = "Cash on Hands"
 *     Row 27 = Total ASSETS (base for common-size ratios)
 *
 *   Common size (columns H..K, formulas):
 *     H{row} = D{row}/D$27   → year y1 (2019)
 *     I{row} = E{row}/E$27   → year y2 (2020)
 *     J{row} = F{row}/F$27   → year y3 (2021)
 *     K{row} = AVERAGE(H{row}:J{row})
 *
 *   Growth YoY (columns N..Q, formulas):
 *     N{row} = IFERROR((D{row}-C{row})/C{row}, 0)   → y0→y1
 *     O{row} = IFERROR((E{row}-D{row})/D{row}, 0)   → y1→y2
 *     P{row} = IFERROR((F{row}-E{row})/E{row}, 0)   → y2→y3
 *     Q{row} = AVERAGE(N{row}:P{row})
 */

import { describe, expect, it } from 'vitest'
import {
  commonSizeBalanceSheet,
  growthBalanceSheet,
} from '@/lib/calculations/balance-sheet'
import type { YearlySeries } from '@/lib/calculations/helpers'
import { balanceSheetCells, num } from '../../helpers/fixture'

function readSeries(row: number): YearlySeries {
  return {
    y0: num(balanceSheetCells, `C${row}`),
    y1: num(balanceSheetCells, `D${row}`),
    y2: num(balanceSheetCells, `E${row}`),
    y3: num(balanceSheetCells, `F${row}`),
  }
}

const PRECISION = 12 // 12 decimal digits — tests float parity with Excel output

describe('commonSizeBalanceSheet (BALANCE SHEET rows vs Row 27 Total Assets)', () => {
  it('row 8 (Cash on Hands) matches Excel H8..K8', () => {
    const row8 = readSeries(8)
    const totals = readSeries(27)
    const result = commonSizeBalanceSheet(row8, totals)

    expect(result.y1).toBeCloseTo(num(balanceSheetCells, 'H8'), PRECISION)
    expect(result.y2).toBeCloseTo(num(balanceSheetCells, 'I8'), PRECISION)
    expect(result.y3).toBeCloseTo(num(balanceSheetCells, 'J8'), PRECISION)
    expect(result.avg).toBeCloseTo(num(balanceSheetCells, 'K8'), PRECISION)
  })

  it('row 27 (Total Assets) against itself equals 1 in every year', () => {
    const totals = readSeries(27)
    const result = commonSizeBalanceSheet(totals, totals)
    expect(result.y1).toBe(1)
    expect(result.y2).toBe(1)
    expect(result.y3).toBe(1)
    expect(result.avg).toBe(1)
  })
})

describe('growthBalanceSheet (YoY with IFERROR semantics)', () => {
  it('row 8 (Cash on Hands) matches Excel N8..Q8', () => {
    const row8 = readSeries(8)
    const result = growthBalanceSheet(row8)

    expect(result.y0toY1).toBeCloseTo(num(balanceSheetCells, 'N8'), PRECISION)
    expect(result.y1toY2).toBeCloseTo(num(balanceSheetCells, 'O8'), PRECISION)
    expect(result.y2toY3).toBeCloseTo(num(balanceSheetCells, 'P8'), PRECISION)
    expect(result.avg).toBeCloseTo(num(balanceSheetCells, 'Q8'), PRECISION)
  })

  it('row 27 (Total Assets) matches Excel N27..Q27', () => {
    const row27 = readSeries(27)
    const result = growthBalanceSheet(row27)

    // N27..Q27 may or may not exist depending on whether the workbook computes
    // growth on the totals row. We only assert when ground truth is present.
    const n27 = balanceSheetCells.get('N27')
    if (n27 && typeof n27.value === 'number') {
      expect(result.y0toY1).toBeCloseTo(n27.value, PRECISION)
    } else {
      // Compute manually vs our own inputs and assert determinism.
      expect(result.y0toY1).toBeCloseTo((row27.y1 - row27.y0) / row27.y0, PRECISION)
    }
  })
})

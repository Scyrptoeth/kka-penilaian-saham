/**
 * Income Statement calculation tests — verified against real Excel ground truth.
 *
 * Fixture: __tests__/fixtures/income-statement.json
 *
 * Cell mapping on the `INCOME STATEMENT` sheet:
 *   Raw data columns C..F = four historical years.
 *     Row  6 = "Revenue"
 *     Row  8 = "Gross Profit"
 *     Row 22 = "EBIT" (Operating Profit)
 *     Row 35 = "Net Profit After Tax"
 *
 *   For the Revenue row (row 6) the workbook fills H..K with YoY growth
 *   (because "% of itself" is trivially 1). Formulas:
 *     H6 = (D6-C6)/C6
 *     I6 = (E6-D6)/D6
 *     J6 = (F6-E6)/E6
 *     K6 = AVERAGE(H6:J6)
 *
 *   For non-revenue rows (e.g. row 8 Gross Profit) H..K contain margin ratios
 *   against revenue:
 *     H8 = D8/D$6   (gross margin, y1)
 *     I8 = E8/E$6   (gross margin, y2)
 *     J8 = F8/F$6   (gross margin, y3)
 */

import { describe, expect, it } from 'vitest'
import {
  yoyGrowthIncomeStatement,
  marginRatio,
} from '@/lib/calculations/income-statement'
import type { YearlySeries } from '@/lib/calculations/helpers'
import { incomeStatementCells, num } from '../../helpers/fixture'

function readSeries(row: number): YearlySeries {
  return {
    y0: num(incomeStatementCells, `C${row}`),
    y1: num(incomeStatementCells, `D${row}`),
    y2: num(incomeStatementCells, `E${row}`),
    y3: num(incomeStatementCells, `F${row}`),
  }
}

const PRECISION = 12

describe('yoyGrowthIncomeStatement (Revenue YoY, row 6)', () => {
  it('matches Excel H6..K6', () => {
    const revenue = readSeries(6)
    const result = yoyGrowthIncomeStatement(revenue)

    expect(result.y0toY1).toBeCloseTo(num(incomeStatementCells, 'H6'), PRECISION)
    expect(result.y1toY2).toBeCloseTo(num(incomeStatementCells, 'I6'), PRECISION)
    expect(result.y2toY3).toBeCloseTo(num(incomeStatementCells, 'J6'), PRECISION)
    expect(result.avg).toBeCloseTo(num(incomeStatementCells, 'K6'), PRECISION)
  })

  it('matches Excel M6..P6 (same formulas duplicated under HORIZONTAL label)', () => {
    const revenue = readSeries(6)
    const result = yoyGrowthIncomeStatement(revenue)

    expect(result.y0toY1).toBeCloseTo(num(incomeStatementCells, 'M6'), PRECISION)
    expect(result.y1toY2).toBeCloseTo(num(incomeStatementCells, 'N6'), PRECISION)
    expect(result.y2toY3).toBeCloseTo(num(incomeStatementCells, 'O6'), PRECISION)
    expect(result.avg).toBeCloseTo(num(incomeStatementCells, 'P6'), PRECISION)
  })
})

describe('marginRatio (gross margin — row 8 Gross Profit / row 6 Revenue)', () => {
  it('y1 (2019) matches H8 = D8/D$6', () => {
    const grossY1 = num(incomeStatementCells, 'D8')
    const revenueY1 = num(incomeStatementCells, 'D6')
    expect(marginRatio(grossY1, revenueY1)).toBeCloseTo(
      num(incomeStatementCells, 'H8'),
      PRECISION,
    )
  })

  it('y2 (2020) matches I8 = E8/E$6', () => {
    expect(
      marginRatio(num(incomeStatementCells, 'E8'), num(incomeStatementCells, 'E6')),
    ).toBeCloseTo(num(incomeStatementCells, 'I8'), PRECISION)
  })

  it('y3 (2021) matches J8 = F8/F$6', () => {
    expect(
      marginRatio(num(incomeStatementCells, 'F8'), num(incomeStatementCells, 'F6')),
    ).toBeCloseTo(num(incomeStatementCells, 'J8'), PRECISION)
  })
})

describe('marginRatio (operating margin — row 22 EBIT / Revenue)', () => {
  it('y3 (2021) operating margin = F22 / F6', () => {
    const ebit = num(incomeStatementCells, 'F22')
    const revenue = num(incomeStatementCells, 'F6')
    const expected = ebit / revenue
    expect(marginRatio(ebit, revenue)).toBeCloseTo(expected, PRECISION)
  })
})

describe('marginRatio (net margin — row 35 Net Profit After Tax / Revenue)', () => {
  it('y3 (2021) net margin = F35 / F6', () => {
    const net = num(incomeStatementCells, 'F35')
    const revenue = num(incomeStatementCells, 'F6')
    expect(marginRatio(net, revenue)).toBeCloseTo(net / revenue, PRECISION)
  })
})

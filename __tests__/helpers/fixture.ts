/**
 * Fixture helpers for loading Excel-extracted ground truth into tests.
 * Fixtures live in __tests__/fixtures/<slug>.json and mirror the structure
 * produced by scripts/extract-fixtures.py.
 */

import balanceSheetJson from '../fixtures/balance-sheet.json'
import incomeStatementJson from '../fixtures/income-statement.json'
import fixedAssetJson from '../fixtures/fixed-asset.json'
import noplatJson from '../fixtures/noplat.json'
import fcfJson from '../fixtures/fcf.json'
import cashFlowStatementJson from '../fixtures/cash-flow-statement.json'
import financialRatioJson from '../fixtures/financial-ratio.json'
import growthRevenueJson from '../fixtures/growth-revenue.json'
import accPayablesJson from '../fixtures/acc-payables.json'

export interface Cell {
  addr: string
  row: number
  col: number
  value: number | string | boolean | null
  formula?: string
  number_format?: string
  data_type: string
}

export interface SheetFixture {
  name: string
  slug: string
  visible: boolean
  cells: Cell[]
}

function buildCellIndex(fixture: SheetFixture): Map<string, Cell> {
  const map = new Map<string, Cell>()
  for (const cell of fixture.cells) map.set(cell.addr, cell)
  return map
}

export const balanceSheet: SheetFixture = balanceSheetJson as unknown as SheetFixture
export const incomeStatement: SheetFixture = incomeStatementJson as unknown as SheetFixture
export const fixedAsset: SheetFixture = fixedAssetJson as unknown as SheetFixture
export const noplat: SheetFixture = noplatJson as unknown as SheetFixture
export const fcf: SheetFixture = fcfJson as unknown as SheetFixture
export const cashFlowStatement: SheetFixture = cashFlowStatementJson as unknown as SheetFixture
export const financialRatio: SheetFixture = financialRatioJson as unknown as SheetFixture
export const growthRevenue: SheetFixture = growthRevenueJson as unknown as SheetFixture
export const accPayables: SheetFixture = accPayablesJson as unknown as SheetFixture

export const balanceSheetCells = buildCellIndex(balanceSheet)
export const incomeStatementCells = buildCellIndex(incomeStatement)
export const fixedAssetCells = buildCellIndex(fixedAsset)
export const noplatCells = buildCellIndex(noplat)
export const fcfCells = buildCellIndex(fcf)
export const cashFlowStatementCells = buildCellIndex(cashFlowStatement)
export const financialRatioCells = buildCellIndex(financialRatio)
export const growthRevenueCells = buildCellIndex(growthRevenue)
export const accPayablesCells = buildCellIndex(accPayables)

export function num(index: Map<string, Cell>, addr: string): number {
  const cell = index.get(addr)
  if (!cell) throw new Error(`fixture: cell ${addr} not found`)
  if (typeof cell.value !== 'number') {
    throw new Error(
      `fixture: cell ${addr} has non-numeric value: ${String(cell.value)}`,
    )
  }
  return cell.value
}

/** Optional variant: returns undefined if cell missing or non-numeric. */
export function numOpt(index: Map<string, Cell>, addr: string): number | undefined {
  const cell = index.get(addr)
  if (!cell || typeof cell.value !== 'number') return undefined
  return cell.value
}

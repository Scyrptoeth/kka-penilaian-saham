/**
 * Fixture helpers for loading Excel-extracted ground truth into tests.
 * Fixtures live in __tests__/fixtures/<slug>.json and mirror the structure
 * produced by scripts/extract-fixtures.py.
 */

import balanceSheetJson from '../fixtures/balance-sheet.json'
import incomeStatementJson from '../fixtures/income-statement.json'

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

export const balanceSheetCells = buildCellIndex(balanceSheet)
export const incomeStatementCells = buildCellIndex(incomeStatement)

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

/**
 * Seed loader — read-only demo data sourced from the reference workbook
 * `kka-penilaian-saham.xlsx`.
 *
 * Fixtures live under `src/data/seed/fixtures/*.json`, synced from
 * `__tests__/fixtures/` by `npm run seed:sync` (see
 * `scripts/copy-fixtures.cjs`). They are committed to the repo so Next.js
 * can bundle them at build time with zero runtime I/O.
 *
 * Session 2B P1 only exposes a handful of sheets. New sheets require:
 *   1. Adding the slug to `SHEETS` in `scripts/copy-fixtures.cjs`
 *   2. Re-running `npm run seed:sync`
 *   3. Adding a typed loader export below
 */

import balanceSheetJson from './fixtures/balance-sheet.json'
import incomeStatementJson from './fixtures/income-statement.json'
import fcfJson from './fixtures/fcf.json'
import financialRatioJson from './fixtures/financial-ratio.json'
import cashFlowStatementJson from './fixtures/cash-flow-statement.json'
import fixedAssetJson from './fixtures/fixed-asset.json'
import noplatJson from './fixtures/noplat.json'
import growthRevenueJson from './fixtures/growth-revenue.json'

export type SheetSlug =
  | 'balance-sheet'
  | 'income-statement'
  | 'fcf'
  | 'financial-ratio'
  | 'cash-flow-statement'
  | 'fixed-asset'
  | 'noplat'
  | 'growth-revenue'

export interface FixtureCell {
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
  cells: FixtureCell[]
}

export type CellMap = ReadonlyMap<string, FixtureCell>

const FIXTURES: Record<SheetSlug, SheetFixture> = {
  'balance-sheet': balanceSheetJson as unknown as SheetFixture,
  'income-statement': incomeStatementJson as unknown as SheetFixture,
  fcf: fcfJson as unknown as SheetFixture,
  'financial-ratio': financialRatioJson as unknown as SheetFixture,
  'cash-flow-statement': cashFlowStatementJson as unknown as SheetFixture,
  'fixed-asset': fixedAssetJson as unknown as SheetFixture,
  noplat: noplatJson as unknown as SheetFixture,
  'growth-revenue': growthRevenueJson as unknown as SheetFixture,
}

const CELL_MAP_CACHE = new Map<SheetSlug, CellMap>()

/**
 * Load an Excel-extracted fixture as an addressable cell map.
 * Results are cached per sheet for the lifetime of the process.
 */
export function loadCells(slug: SheetSlug): CellMap {
  const cached = CELL_MAP_CACHE.get(slug)
  if (cached) return cached
  const fixture = FIXTURES[slug]
  const map = new Map<string, FixtureCell>()
  for (const cell of fixture.cells) map.set(cell.addr, cell)
  CELL_MAP_CACHE.set(slug, map)
  return map
}

/** Return the raw fixture (name + visible + cells array) — useful for debug. */
export function loadFixture(slug: SheetSlug): SheetFixture {
  return FIXTURES[slug]
}

/**
 * Read a numeric cell. Throws if the cell is missing or non-numeric —
 * used when the manifest guarantees the cell holds a number.
 */
export function num(cells: CellMap, addr: string): number {
  const cell = cells.get(addr)
  if (!cell) throw new Error(`seed: cell ${addr} not found`)
  if (typeof cell.value !== 'number') {
    throw new Error(`seed: cell ${addr} is non-numeric (${String(cell.value)})`)
  }
  return cell.value
}

/** Same as {@link num} but returns undefined for missing/non-numeric cells. */
export function numOpt(cells: CellMap, addr: string): number | undefined {
  const cell = cells.get(addr)
  if (!cell || typeof cell.value !== 'number') return undefined
  return cell.value
}

/**
 * Pull the raw Excel formula string for a given cell, if present.
 * Returns undefined for input cells (literal values) or missing cells.
 *
 *   formulaOf(cells, 'H8') // → '=D8/D$27'
 */
export function formulaOf(cells: CellMap, addr: string): string | undefined {
  return cells.get(addr)?.formula
}

/** Read a cell as a trimmed string, returning undefined if missing/non-string. */
export function textOf(cells: CellMap, addr: string): string | undefined {
  const cell = cells.get(addr)
  if (!cell || typeof cell.value !== 'string') return undefined
  return cell.value.trim() || undefined
}

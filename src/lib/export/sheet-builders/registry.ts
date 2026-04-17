import type ExcelJS from 'exceljs'
import type { SheetBuilder } from './types'
import type { ExportableState } from '@/lib/export/export-xlsx'
import { clearSheetCompletely } from '@/lib/export/sheet-utils'
import { isPopulated } from './populated'
import { BalanceSheetBuilder } from './balance-sheet'
import { IncomeStatementBuilder } from './income-statement'
import { FixedAssetBuilder } from './fixed-asset'
import { HomeBuilder } from './home'
import { KeyDriversBuilder } from './key-drivers'
import { AccPayablesBuilder } from './acc-payables'
import { AamBuilder } from './aam'
import { SimulasiPotensiBuilder } from './simulasi-potensi'

/**
 * Ordered list of SheetBuilders. Populated incrementally across Session 030+
 * (29 builders total at full migration). Session 031 registers the first
 * three (BS/IS/FA) — the primary user complaint fix. Remaining 24 land in
 * Session 032+ per plan.md T5-T7.
 *
 * Order matters only for logging/debugging; builders are independent and
 * can run in any sequence because each writes to a dedicated sheet.
 */
/**
 * Registry resolution is indirected through a function (not a const
 * array) to sidestep the circular-import hazard between `export-xlsx.ts`
 * (the orchestrator that calls `runSheetBuilders`) and individual
 * builder files that import helper injectors FROM `export-xlsx.ts`.
 * A module-level const would evaluate during registry-module init,
 * at which point builder imports may still be unresolved live bindings.
 * Lazy resolution at call time avoids that hazard.
 *
 * The override slot `_testOverride` is a test-only seam that lets
 * `registry.test.ts` swap builders for a single test block without
 * touching production code paths.
 */
let _testOverride: readonly SheetBuilder[] | null = null

export function getSheetBuilders(): readonly SheetBuilder[] {
  if (_testOverride !== null) return _testOverride
  return [
    // Financial statements (Session 031)
    BalanceSheetBuilder,
    IncomeStatementBuilder,
    FixedAssetBuilder,
    // Input master + supporting inputs (Session 032)
    HomeBuilder,
    KeyDriversBuilder,
    AccPayablesBuilder,
    // AAM chain (Session 031) — runs after inputs complete
    AamBuilder,
    SimulasiPotensiBuilder,
  ]
}

/** Test-only API — set `null` to clear override and return to production list. */
export function __setTestBuildersOverride(builders: readonly SheetBuilder[] | null): void {
  _testOverride = builders
}

/**
 * Deprecated alias — use `getSheetBuilders()` instead. Kept only for
 * test-file readability; returns a fresh array each access via a getter
 * to always reflect the current (possibly overridden) list.
 */
export const SHEET_BUILDERS: readonly SheetBuilder[] = new Proxy(
  [] as readonly SheetBuilder[],
  {
    get(_t, prop, receiver) {
      const arr = getSheetBuilders()
      // Redirect all property access (length, indexed, map, [Symbol.iterator], etc.)
      // to a fresh evaluation. Bind functions to the snapshot so callers get
      // consistent `this` semantics.
      const v = Reflect.get(arr, prop, receiver)
      return typeof v === 'function' ? v.bind(arr) : v
    },
    has(_t, prop) {
      return Reflect.has(getSheetBuilders(), prop)
    },
    ownKeys() {
      return Reflect.ownKeys(getSheetBuilders())
    },
    getOwnPropertyDescriptor(_t, prop) {
      return Reflect.getOwnPropertyDescriptor(getSheetBuilders(), prop)
    },
  },
)

/** Single source of truth: sheet names currently owned by the registry. */
export function getMigratedSheetNames(): ReadonlySet<string> {
  return new Set(getSheetBuilders().map((b) => b.sheetName))
}

/**
 * Proxy-backed set whose `.has()` always reflects the current registry.
 * Mutation is not supported — this is a read-through view.
 */
export const MIGRATED_SHEET_NAMES: ReadonlySet<string> = {
  has(name: string): boolean {
    return getMigratedSheetNames().has(name)
  },
  get size(): number {
    return getMigratedSheetNames().size
  },
  [Symbol.iterator](): IterableIterator<string> {
    return getMigratedSheetNames()[Symbol.iterator]()
  },
} as unknown as ReadonlySet<string>

/**
 * Orchestrator — for every registered builder, resolve upstream dependencies
 * against the current state and either populate the sheet (build) or clear
 * it to a blank shell (clearSheetCompletely). Sheets not present in the
 * registry are untouched (legacy pipeline owns them during migration).
 */
export function runSheetBuilders(
  workbook: ExcelJS.Workbook,
  state: ExportableState,
): void {
  for (const builder of getSheetBuilders()) {
    const sheet = workbook.getWorksheet(builder.sheetName)
    if (!sheet) continue

    if (isPopulated(builder.upstream, state)) {
      builder.build(workbook, state)
    } else {
      clearSheetCompletely(sheet)
    }
  }
}

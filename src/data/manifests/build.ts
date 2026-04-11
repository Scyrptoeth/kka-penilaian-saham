/**
 * Manifest → FinancialRow[] builder.
 *
 * Reads cell values from a loaded {@link CellMap}, auto-pulls raw Excel
 * formulas from the fixture, and attaches human-readable descriptions
 * authored in the manifest. Optional derived column-groups (common-size,
 * growth) can be supplied by the caller — typically computed from the
 * pure calc engine.
 *
 * Pure function, server-safe, no React dependency.
 */

import type { YearKeyedSeries } from '@/types/financial'
import { type CellMap, numOpt, formulaOf } from '@/data/seed/loader'
import { ratioOfBase, yoyChange, yoyChangeSafe } from '@/lib/calculations/helpers'
import type { FinancialRow, FormulaMeta } from '@/components/financial/types'
import type {
  DerivationSpec,
  ManifestRow,
  SheetManifest,
} from './types'

/**
 * Derived column-groups keyed by Excel row number. Caller computes these
 * via the calc engine (commonSizeBalanceSheet, etc.) and passes the results
 * in here so the builder can attach them to the matching rows.
 */
export interface DerivedColumnMap {
  commonSize?: Record<number, YearKeyedSeries>
  growth?: Record<number, YearKeyedSeries>
}

function readValues(
  cells: CellMap,
  manifest: SheetManifest,
  excelRow: number,
): YearKeyedSeries {
  const out: YearKeyedSeries = {}
  for (const year of manifest.years) {
    const col = manifest.columns[year]
    if (!col) continue
    const v = numOpt(cells, `${col}${excelRow}`)
    if (v !== undefined) out[year] = v
  }
  return out
}

/**
 * Read a full row as a {@link YearKeyedSeries} using the manifest's column
 * map. Missing cells default to 0 — mirrors the existing behavior of
 * `readYearlySeries` in historical-derive.ts so output stays identical
 * across the migration.
 */
function readRowSeries(
  cells: CellMap,
  manifest: SheetManifest,
  excelRow: number,
): YearKeyedSeries {
  const out: YearKeyedSeries = {}
  for (const year of manifest.years) {
    const col = manifest.columns[year]
    if (!col) continue
    out[year] = numOpt(cells, `${col}${excelRow}`) ?? 0
  }
  return out
}

/**
 * Compute a ratio series `line / denominator` for derived years only
 * (everything except the baseline `years[0]`). Matches the existing
 * `commonSizeBalanceSheet` + `commonSizeToSeries` output exactly:
 * baseline year is omitted, zero denominators return 0.
 */
function computeRatioSeries(
  line: YearKeyedSeries,
  denominator: YearKeyedSeries,
  manifest: SheetManifest,
): YearKeyedSeries {
  const out: YearKeyedSeries = {}
  const derivedYears = manifest.years.slice(1)
  for (const year of derivedYears) {
    out[year] = ratioOfBase(line[year] ?? 0, denominator[year] ?? 0)
  }
  return out
}

/**
 * Compute YoY growth `(current − prior) / prior` for derived years. Uses
 * `yoyChangeSafe` (IFERROR → 0) by default, or `yoyChange` if `safe=false`.
 * Baseline year is skipped because it has no prior.
 */
function computeGrowthSeries(
  line: YearKeyedSeries,
  manifest: SheetManifest,
  safe: boolean,
): YearKeyedSeries {
  const out: YearKeyedSeries = {}
  const fn = safe ? yoyChangeSafe : yoyChange
  for (let i = 1; i < manifest.years.length; i++) {
    const currentYear = manifest.years[i]
    const priorYear = manifest.years[i - 1]
    const current = line[currentYear] ?? 0
    const prior = line[priorYear] ?? 0
    out[currentYear] = fn(current, prior)
  }
  return out
}

/**
 * Interpret the manifest's `derivations` array and produce a
 * {@link DerivedColumnMap}. Pure function, no side-effects; every primitive
 * reuses the existing `ratioOfBase` / `yoyChangeSafe` helpers from the calc
 * engine to guarantee bit-identical output across the migration.
 */
export function applyDerivations(
  specs: readonly DerivationSpec[],
  manifest: SheetManifest,
  cells: CellMap,
): DerivedColumnMap {
  const result: DerivedColumnMap = {}

  for (const spec of specs) {
    switch (spec.type) {
      case 'commonSize': {
        const denomRow = spec.denominatorRow ?? manifest.totalAssetsRow
        if (denomRow === undefined) {
          throw new Error(
            `applyDerivations: commonSize spec requires denominatorRow or manifest.totalAssetsRow (sheet: ${manifest.slug})`,
          )
        }
        const denominator = readRowSeries(cells, manifest, denomRow)
        result.commonSize = {}
        for (const row of manifest.rows) {
          if (row.excelRow === undefined) continue
          const line = readRowSeries(cells, manifest, row.excelRow)
          result.commonSize[row.excelRow] = computeRatioSeries(
            line,
            denominator,
            manifest,
          )
        }
        break
      }
      case 'marginVsAnchor': {
        const anchorRow = spec.anchorRow ?? manifest.anchorRow
        if (anchorRow === undefined) {
          throw new Error(
            `applyDerivations: marginVsAnchor spec requires anchorRow or manifest.anchorRow (sheet: ${manifest.slug})`,
          )
        }
        const anchor = readRowSeries(cells, manifest, anchorRow)
        result.commonSize = {}
        for (const row of manifest.rows) {
          if (row.excelRow === undefined) continue
          const line = readRowSeries(cells, manifest, row.excelRow)
          result.commonSize[row.excelRow] = computeRatioSeries(
            line,
            anchor,
            manifest,
          )
        }
        break
      }
      case 'yoyGrowth': {
        const safe = spec.safe !== false // default true
        result.growth = {}
        for (const row of manifest.rows) {
          if (row.excelRow === undefined) continue
          const line = readRowSeries(cells, manifest, row.excelRow)
          result.growth[row.excelRow] = computeGrowthSeries(
            line,
            manifest,
            safe,
          )
        }
        break
      }
    }
  }

  return result
}

function buildExcelByYear(
  cells: CellMap,
  excelRow: number,
  columnMap: Record<number, string> | undefined,
): Record<number, string> | undefined {
  if (!columnMap) return undefined
  const out: Record<number, string> = {}
  let any = false
  for (const [yearStr, col] of Object.entries(columnMap)) {
    const year = Number(yearStr)
    const f = formulaOf(cells, `${col}${excelRow}`)
    if (f) {
      out[year] = f
      any = true
    }
  }
  return any ? out : undefined
}

function buildFormulaMeta(
  description: string | undefined,
  excelByYear: Record<number, string> | undefined,
): FormulaMeta | undefined {
  if (!description && !excelByYear) return undefined
  return { description: description ?? '', excelByYear }
}

/**
 * Build a FinancialRow[] from a sheet manifest and a loaded cell map.
 *
 * If the manifest declares a `derive` callback, it is auto-invoked to
 * produce the common-size and growth column groups. Callers can still
 * override via the optional `overrideDerived` parameter — useful for
 * tests and ad-hoc synthesis.
 *
 *   const rows = buildRowsFromManifest(balanceSheetManifest, cells)
 *   // → manifest.derive runs automatically; page stays one line.
 */
export function buildRowsFromManifest(
  manifest: SheetManifest,
  cells: CellMap,
  overrideDerived?: DerivedColumnMap,
): FinancialRow[] {
  const derived: DerivedColumnMap | undefined =
    overrideDerived ??
    (manifest.derivations
      ? applyDerivations(manifest.derivations, manifest, cells)
      : manifest.derive?.(cells, manifest))
  const out: FinancialRow[] = []
  for (const row of manifest.rows) {
    out.push(buildOne(manifest, cells, row, derived))
  }
  return out
}

function buildOne(
  manifest: SheetManifest,
  cells: CellMap,
  row: ManifestRow,
  derived: DerivedColumnMap | undefined,
): FinancialRow {
  const excelRow = row.excelRow
  const values: YearKeyedSeries = excelRow !== undefined
    ? readValues(cells, manifest, excelRow)
    : {}

  const commonSize =
    excelRow !== undefined && derived?.commonSize
      ? derived.commonSize[excelRow]
      : undefined

  const growth =
    excelRow !== undefined && derived?.growth
      ? derived.growth[excelRow]
      : undefined

  const valuesExcelByYear =
    excelRow !== undefined
      ? buildExcelByYear(cells, excelRow, manifest.columns)
      : undefined

  const commonSizeExcelByYear =
    excelRow !== undefined
      ? buildExcelByYear(cells, excelRow, manifest.commonSizeColumns)
      : undefined

  const growthExcelByYear =
    excelRow !== undefined
      ? buildExcelByYear(cells, excelRow, manifest.growthColumns)
      : undefined

  const formulaValues = buildFormulaMeta(
    row.formula?.values,
    valuesExcelByYear,
  )
  const formulaCommonSize = buildFormulaMeta(
    row.formula?.commonSize,
    commonSizeExcelByYear,
  )
  const formulaGrowth = buildFormulaMeta(
    row.formula?.growth,
    growthExcelByYear,
  )

  const hasFormula =
    formulaValues || formulaCommonSize || formulaGrowth

  const out: FinancialRow = {
    label: row.label,
    values,
    indent: row.indent,
    type: row.type ?? (excelRow !== undefined ? 'normal' : 'separator'),
  }
  if (row.valueKind) out.valueKind = row.valueKind
  if (commonSize) out.commonSize = commonSize
  if (growth) out.growth = growth
  if (hasFormula) {
    out.formula = {}
    if (formulaValues) out.formula.values = formulaValues
    if (formulaCommonSize) out.formula.commonSize = formulaCommonSize
    if (formulaGrowth) out.formula.growth = formulaGrowth
  }
  return out
}

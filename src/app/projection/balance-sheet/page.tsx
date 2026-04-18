'use client'

import { useMemo, useCallback } from 'react'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { useT } from '@/lib/i18n/useT'
import { computeProjectionYears } from '@/lib/calculations/year-helpers'
import { yoyChangeSafe } from '@/lib/calculations/helpers'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { averageYoYStrict } from '@/lib/calculations/derivation-helpers'
import { computeProyBsLive, type ProyBsInput } from '@/data/live/compute-proy-bs-live'
import { buildDynamicBsManifest } from '@/data/manifests/build-dynamic-bs'
import { formatIdr, formatPercent } from '@/components/financial/format'
import { PageEmptyState } from '@/components/shared/PageEmptyState'
import { getBsStrings } from '@/lib/i18n/balance-sheet'
import { NumericInput } from '@/components/forms/RowInputGrid'
import type { BsAccountEntry } from '@/data/catalogs/balance-sheet-catalog'
import type { ManifestRow } from '@/data/manifests/types'
import type { YearKeyedSeries } from '@/types/financial'

/**
 * Session 051 — PROY BALANCE SHEET display layer.
 *
 * Per user spec split:
 *  • Assets (kecuali Fixed Asset) + Liabilities leaves render a read-only
 *    "Growth" sub-row sourced from `averageYoYStrict` — the SAME helper
 *    that drives projection compute. Displayed "—" maps to null strict
 *    average (fewer than 2 real YoY observations); projection then runs
 *    flat (× 1.0). Driver-display sync (LESSON-139) applied.
 *  • Equity leaves do NOT render a growth row. Projection cells are
 *    editable `<NumericInput>` with PER-CELL INDEPENDENT semantics:
 *    default = historical last-year value; user edit at year Y persists
 *    into `balanceSheet.equityProjectionOverrides[row][Y]` only — Y+1
 *    and Y-1 remain at default.
 */

export default function ProyBalanceSheetPage() {
  const { t, language } = useT()
  const home = useKkaStore(s => s.home)
  const balanceSheet = useKkaStore(s => s.balanceSheet)
  const setEquityProjectionOverride = useKkaStore(s => s.setEquityProjectionOverride)
  const hasHydrated = useKkaStore(s => s._hasHydrated)

  const bsStrings = useMemo(() => getBsStrings(language), [language])

  const data = useMemo(() => {
    if (!hasHydrated || !home || !balanceSheet) return null

    const historicalYears = computeHistoricalYears(home.tahunTransaksi, balanceSheet.yearCount)
    const projYears = computeProjectionYears(home.tahunTransaksi)
    const histYear = historicalYears[historicalYears.length - 1]!

    // Build dynamic BS manifest (identical to Input BS).
    const manifest = buildDynamicBsManifest(
      balanceSheet.accounts,
      balanceSheet.language,
      balanceSheet.yearCount,
      home.tahunTransaksi,
    )

    const equityOverrides = balanceSheet.equityProjectionOverrides ?? {}

    const input: ProyBsInput = {
      accounts: balanceSheet.accounts,
      bsRows: balanceSheet.rows,
      historicalYears,
      manifestRows: manifest.rows,
      equityOverrides,
    }
    const rows = computeProyBsLive(input, projYears)

    // Strict per-account avg growth (null → flat). Single source of truth
    // shared with compute side (LESSON-139).
    const growthByRow: Record<number, number | null> = {}
    for (const acct of balanceSheet.accounts) {
      growthByRow[acct.excelRow] = averageYoYStrict(
        balanceSheet.rows[acct.excelRow],
        historicalYears,
      )
    }

    // Account lookup by excelRow — used to branch render on section.
    const accountByRow = new Map<number, BsAccountEntry>()
    for (const acct of balanceSheet.accounts) accountByRow.set(acct.excelRow, acct)

    return {
      rows,
      historicalYears,
      histYear,
      projYears,
      manifestRows: manifest.rows,
      growthByRow,
      accountByRow,
      equityOverrides,
    }
  }, [hasHydrated, home, balanceSheet])

  const handleEquityChange = useCallback(
    (excelRow: number, year: number, value: number) => {
      // Treat 0 as "revert to default" (historical last year) — null clears override.
      setEquityProjectionOverride(excelRow, year, value === 0 ? null : value)
    },
    [setEquityProjectionOverride],
  )

  if (!hasHydrated) {
    return (
      <div className="mx-auto max-w-[1100px] p-6 text-sm text-ink-muted">
        {t('common.loadingData')}
      </div>
    )
  }

  if (!data) {
    return (
      <PageEmptyState
        section={t('common.projection')}
        title={t('proyBS.title')}
        inputs={[
          { label: 'HOME', href: '/', filled: !!home },
          { label: 'Balance Sheet', href: '/input/balance-sheet', filled: !!balanceSheet },
        ]}
      />
    )
  }

  const { rows, histYear, projYears, manifestRows, growthByRow, accountByRow, equityOverrides } = data
  const yearCols = [histYear, ...projYears]

  return (
    <div className="mx-auto max-w-[1100px] p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">{t('proyBS.title')}</h1>
      <p className="mb-6 text-sm text-ink-muted">{t('proyBS.subtitle')}</p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-grid-strong">
              <th className="px-3 py-2 text-left font-medium text-ink-muted">{t('common.description')}</th>
              {yearCols.map((y, i) => (
                <th key={y} className="px-3 py-2 text-right font-mono font-medium text-ink-muted tabular-nums">
                  {y}
                  {i === 0 ? t('common.histSuffix') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {manifestRows.map((row, idx) =>
              renderRow({
                row,
                idx,
                rows,
                growthByRow,
                accountByRow,
                equityOverrides,
                histYear,
                projYears,
                yearCols,
                bsStrings,
                t,
                onEquityChange: handleEquityChange,
              }),
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface RenderRowArgs {
  row: ManifestRow
  idx: number
  rows: Record<number, YearKeyedSeries>
  growthByRow: Record<number, number | null>
  accountByRow: Map<number, BsAccountEntry>
  equityOverrides: Readonly<Record<number, YearKeyedSeries>>
  histYear: number
  projYears: readonly number[]
  yearCols: readonly number[]
  bsStrings: ReturnType<typeof getBsStrings>
  t: (k: Parameters<ReturnType<typeof useT>['t']>[0]) => string
  onEquityChange: (excelRow: number, year: number, value: number) => void
}

function renderRow(args: RenderRowArgs) {
  const {
    row,
    idx,
    rows,
    growthByRow,
    accountByRow,
    equityOverrides,
    histYear,
    projYears,
    yearCols,
    t,
    onEquityChange,
  } = args

  // Section header
  if (row.type === 'header') {
    return (
      <tr key={`h-${idx}`} className="border-b border-grid bg-canvas-raised">
        <td
          colSpan={yearCols.length + 1}
          className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-muted"
        >
          {row.label}
        </td>
      </tr>
    )
  }

  if (row.excelRow === undefined) return null
  const series = rows[row.excelRow] ?? {}
  const isSubtotal = row.type === 'subtotal' || row.type === 'total'
  const isBalanceControl = row.excelRow === 63

  const acct = accountByRow.get(row.excelRow)
  const isEquityLeaf =
    acct != null && acct.section === 'equity' && row.type !== 'subtotal' && row.type !== 'total'

  // ── Equity leaf: editable cells per projection year, no growth row ──
  if (isEquityLeaf) {
    const overrideForRow = equityOverrides[row.excelRow] ?? {}
    const histVal = series[histYear]
    return (
      <tr key={`v-${row.excelRow}`} className="border-b border-grid">
        <td className="px-3 py-1.5 text-ink">{row.label}</td>
        {yearCols.map((y, i) => {
          if (i === 0) {
            // Historical column — read-only value
            if (histVal === undefined) {
              return (
                <td key={y} className="px-3 py-1.5 text-right font-mono tabular-nums text-ink-muted">
                  —
                </td>
              )
            }
            return (
              <td
                key={y}
                className={`px-3 py-1.5 text-right font-mono tabular-nums ${histVal < 0 ? 'text-negative' : ''}`}
              >
                {formatIdr(histVal)}
              </td>
            )
          }
          // Projection column — editable input
          const overrideVal = overrideForRow[y]
          const defaultVal = histVal ?? 0
          const shownVal = overrideVal ?? defaultVal
          return (
            <td key={y} className="px-1 py-1">
              <NumericInput
                value={shownVal}
                ariaLabel={`${row.label} ${y}`}
                onCommit={(v) => onEquityChange(row.excelRow!, y, v)}
              />
            </td>
          )
        })}
      </tr>
    )
  }

  // ── Non-equity leaf / subtotal / total: value row ──
  const valueRow = (
    <tr
      key={`v-${row.excelRow}`}
      className={
        isSubtotal
          ? 'border-t-2 border-grid-strong bg-canvas-raised font-semibold'
          : 'border-b border-grid'
      }
    >
      <td className="px-3 py-1.5 text-ink">{row.label}</td>
      {yearCols.map((y) => {
        const v = series[y]
        if (v === undefined) {
          return <td key={y} className="px-3 py-1.5 text-right font-mono tabular-nums text-ink-muted">—</td>
        }
        return (
          <td
            key={y}
            className={`px-3 py-1.5 text-right font-mono tabular-nums ${v < 0 ? 'text-negative' : ''}`}
          >
            {formatIdr(v)}
          </td>
        )
      })}
    </tr>
  )

  // Leaf rows (type 'normal' or undefined, non-equity, non-balance-control)
  // get a Growth row beneath them.
  const rowType = row.type ?? 'normal'
  const isLeaf = rowType === 'normal' && !isBalanceControl && !isEquityLeaf
  if (!isLeaf) return valueRow

  const growth = growthByRow[row.excelRow]
  const growthRow = (
    <tr key={`g-${row.excelRow}`} className="border-b border-grid">
      <td className="px-3 py-1.5 pl-8 text-xs italic text-ink-muted">{t('proyBS.row.growth')}</td>
      {yearCols.map((y, i) => {
        if (i === 0) {
          // Historical: compute YoY from last two historical entries if available
          const prevYear = histYear - 1
          const prevVal = rows[row.excelRow!]?.[prevYear]
          const currVal = rows[row.excelRow!]?.[histYear]
          if (prevVal === undefined || currVal === undefined) {
            return <td key={y} className="px-3 py-1.5 text-right font-mono tabular-nums text-ink-muted">—</td>
          }
          const hist = yoyChangeSafe(currVal, prevVal)
          return (
            <td
              key={y}
              className={`px-3 py-1.5 text-right font-mono tabular-nums text-ink-muted ${hist < 0 ? 'text-negative' : ''}`}
            >
              {formatPercent(hist)}
            </td>
          )
        }
        // Projection year: strict avg growth (null → "—", projection flat)
        if (growth === null || growth === undefined) {
          return (
            <td key={y} className="px-3 py-1.5 text-right font-mono tabular-nums text-ink-muted">—</td>
          )
        }
        return (
          <td
            key={y}
            className={`px-3 py-1.5 text-right font-mono tabular-nums text-ink-muted ${growth < 0 ? 'text-negative' : ''}`}
          >
            {formatPercent(growth)}
          </td>
        )
      })}
    </tr>
  )

  // Mark projYears as referenced for TS strictness (passed through closures).
  void projYears
  return [valueRow, growthRow]
}

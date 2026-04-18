'use client'

import { useMemo } from 'react'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { useT } from '@/lib/i18n/useT'
import { computeProjectionYears } from '@/lib/calculations/year-helpers'
import { computeAvgGrowth, yoyChangeSafe } from '@/lib/calculations/helpers'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { computeProyBsLive, type ProyBsInput } from '@/data/live/compute-proy-bs-live'
import { buildDynamicBsManifest } from '@/data/manifests/build-dynamic-bs'
import { formatIdr, formatPercent } from '@/components/financial/format'
import { PageEmptyState } from '@/components/shared/PageEmptyState'
import { getBsStrings } from '@/lib/i18n/balance-sheet'
import type { ManifestRow } from '@/data/manifests/types'
import type { YearKeyedSeries } from '@/types/financial'

/**
 * Session 036 — PROY BALANCE SHEET (Full Simple Growth).
 *
 * Every account from `balanceSheet.accounts` renders read-only, each
 * with a "Growth" sub-row displaying per-account avg historical YoY
 * growth. Values project via `value[N] = prev × (1 + avgGrowth)`.
 *
 * Decoupled from PROY FA / PROY LR. See `compute-proy-bs-live.ts`.
 */

export default function ProyBalanceSheetPage() {
  const { t, language } = useT()
  const home = useKkaStore(s => s.home)
  const balanceSheet = useKkaStore(s => s.balanceSheet)
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

    const input: ProyBsInput = {
      accounts: balanceSheet.accounts,
      bsRows: balanceSheet.rows,
      historicalYears,
      manifestRows: manifest.rows,
    }
    const rows = computeProyBsLive(input, projYears)

    // Per-account avg growth (for display row under each leaf).
    const avgGrowth: Record<number, number> = {}
    for (const acct of balanceSheet.accounts) {
      avgGrowth[acct.excelRow] = computeAvgGrowth(balanceSheet.rows[acct.excelRow] ?? {})
    }

    return { rows, histYear, projYears, manifestRows: manifest.rows, avgGrowth }
  }, [hasHydrated, home, balanceSheet])

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

  const { rows, histYear, projYears, manifestRows, avgGrowth } = data
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
            {manifestRows.map((row, idx) => renderRow(row, idx, rows, avgGrowth, yearCols, language, bsStrings, t))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function renderRow(
  row: ManifestRow,
  idx: number,
  rows: Record<number, YearKeyedSeries>,
  avgGrowth: Record<number, number>,
  yearCols: readonly number[],
  _language: 'en' | 'id',
  _bsStrings: ReturnType<typeof getBsStrings>,
  t: (k: Parameters<ReturnType<typeof useT>['t']>[0]) => string,
) {
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

  // Value row + (if leaf with accounts metadata) growth row
  if (row.excelRow === undefined) return null
  const series = rows[row.excelRow] ?? {}
  const isSubtotal = row.type === 'subtotal' || row.type === 'total'
  const isBalanceControl = row.excelRow === 63

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

  // Leaf rows (type 'normal' or undefined) get a Growth row beneath them.
  const rowType = row.type ?? 'normal'
  const isLeaf = rowType === 'normal' && !isBalanceControl
  if (!isLeaf) return valueRow

  const growth = avgGrowth[row.excelRow]
  const histYear = yearCols[0]!
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
        // Projection year: use avg growth (constant per-account).
        return (
          <td
            key={y}
            className={`px-3 py-1.5 text-right font-mono tabular-nums text-ink-muted ${(growth ?? 0) < 0 ? 'text-negative' : ''}`}
          >
            {formatPercent(growth ?? 0)}
          </td>
        )
      })}
    </tr>
  )

  return [valueRow, growthRow]
}

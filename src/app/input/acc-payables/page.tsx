'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { PageEmptyState } from '@/components/shared/PageEmptyState'
import { formatIdr } from '@/components/financial/format'
import { parseFinancialInput } from '@/components/forms/parse-financial-input'
import { useT } from '@/lib/i18n/useT'
import type { YearKeyedSeries } from '@/types/financial'

// -- Row definitions for Bank Loan Schedules --
// Matches Excel ACC PAYABLES sheet structure

const ST_ROWS = [
  { row: 9, labelKey: 'accPayables.row.beginning' as const, editable: false },
  { row: 10, labelKey: 'accPayables.row.addition' as const, editable: true },
  { row: 11, labelKey: 'accPayables.row.repayment' as const, editable: true },
  { row: 12, labelKey: 'accPayables.row.ending' as const, editable: false },
  { row: 14, labelKey: 'accPayables.row.interestPayable' as const, editable: true },
] as const

const LT_ROWS = [
  { row: 18, labelKey: 'accPayables.row.beginning' as const, editable: false },
  { row: 19, labelKey: 'accPayables.row.addition' as const, editable: true },
  { row: 20, labelKey: 'accPayables.row.repayment' as const, editable: true },
  { row: 21, labelKey: 'accPayables.row.ending' as const, editable: false },
  { row: 23, labelKey: 'accPayables.row.interestPayable' as const, editable: true },
] as const

/**
 * Compute derived rows (Beginning + Ending) from leaf data.
 * - Beginning year 0 = 0 (no prior year data)
 * - Beginning year N = Ending year N-1
 * - Ending = Beginning + Addition + Repayment
 */
function computeApDerived(
  leafRows: Record<number, YearKeyedSeries>,
  years: number[],
  beginRow: number,
  additionRow: number,
  repaymentRow: number,
  endingRow: number,
): Record<number, YearKeyedSeries> {
  const result: Record<number, YearKeyedSeries> = {}
  const beginSeries: YearKeyedSeries = {}
  const endingSeries: YearKeyedSeries = {}

  for (let i = 0; i < years.length; i++) {
    const y = years[i]
    const beginning = i === 0 ? 0 : (endingSeries[years[i - 1]] ?? 0)
    beginSeries[y] = beginning
    const addition = leafRows[additionRow]?.[y] ?? 0
    const repayment = leafRows[repaymentRow]?.[y] ?? 0
    endingSeries[y] = beginning + addition + repayment
  }

  result[beginRow] = beginSeries
  result[endingRow] = endingSeries
  return result
}

function AccPayablesEditor() {
  const { t } = useT()
  const home = useKkaStore((s) => s.home)!
  const accPayables = useKkaStore((s) => s.accPayables)
  const setAccPayables = useKkaStore((s) => s.setAccPayables)
  const tahunTransaksi = home.tahunTransaksi

  const years = useMemo(
    () => computeHistoricalYears(tahunTransaksi, 3),
    [tahunTransaksi],
  )

  const [localRows, setLocalRows] = useState<Record<number, YearKeyedSeries>>(
    () => accPayables?.rows ?? {},
  )
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const schedulePersist = useCallback(
    (nextRows: Record<number, YearKeyedSeries>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        setAccPayables({ rows: nextRows })
      }, 500)
    },
    [setAccPayables],
  )

  // Compute derived rows (Beginning + Ending for both ST and LT)
  const stDerived = useMemo(
    () => computeApDerived(localRows, years, 9, 10, 11, 12),
    [localRows, years],
  )
  const ltDerived = useMemo(
    () => computeApDerived(localRows, years, 18, 19, 20, 21),
    [localRows, years],
  )

  const allValues = useMemo(
    () => ({ ...localRows, ...stDerived, ...ltDerived }),
    [localRows, stDerived, ltDerived],
  )

  function handleCellChange(row: number, year: number, raw: string) {
    const value = parseFinancialInput(raw)
    const nextRows = { ...localRows }
    if (!nextRows[row]) nextRows[row] = {}
    nextRows[row] = { ...nextRows[row], [year]: value }
    setLocalRows(nextRows)
    schedulePersist(nextRows)
  }

  function renderSection(
    title: string,
    rows: readonly { row: number; labelKey: string; editable: boolean }[],
  ) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-grid-strong">
              <th className="bg-canvas-raised px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                {title}
              </th>
              {years.map((y) => (
                <th
                  key={y}
                  className="bg-canvas-raised px-3 py-2 text-right font-mono text-[11px] font-semibold text-ink-muted"
                >
                  {y}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((def) => {
              const isComputed = !def.editable
              return (
                <tr
                  key={def.row}
                  className={`border-b border-grid ${isComputed ? 'bg-canvas-raised font-semibold' : ''}`}
                >
                  <td className="px-3 py-1.5 text-ink-soft">{t(def.labelKey as import('@/lib/i18n/translations').TranslationKey)}</td>
                  {years.map((y) => {
                    const val = allValues[def.row]?.[y] ?? 0
                    if (isComputed) {
                      return (
                        <td
                          key={y}
                          className={`px-3 py-1.5 text-right font-mono tabular-nums ${val < 0 ? 'text-negative' : ''}`}
                        >
                          {formatIdr(val)}
                        </td>
                      )
                    }
                    return (
                      <td key={y} className="px-1 py-0.5">
                        <input
                          type="text"
                          className="w-full rounded-sm border border-grid bg-canvas px-2 py-1 text-right font-mono text-sm tabular-nums text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                          defaultValue={val !== 0 ? formatIdr(val) : ''}
                          placeholder="0"
                          onBlur={(e) => handleCellChange(def.row, y, e.target.value)}
                        />
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1100px] p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
            {t('editor.sectionLabel')}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            {t('accPayables.title')}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {t('accPayables.subtitle')} — {years[0]}–{years[years.length - 1]}
          </p>
        </div>
        <p className="text-xs text-ink-muted">{t('common.autoSaved')}</p>
      </div>

      <div className="mt-6 space-y-6">
        {renderSection(t('accPayables.shortTerm'), ST_ROWS)}
        {renderSection(t('accPayables.longTerm'), LT_ROWS)}
      </div>

      <p className="mt-4 text-xs text-ink-muted">
        {t('accPayables.footerNote')}
      </p>
    </div>
  )
}

export default function InputAccPayablesPage() {
  const { t } = useT()
  const home = useKkaStore((s) => s.home)
  const hasHydrated = useKkaStore((s) => s._hasHydrated)

  if (!hasHydrated) {
    return (
      <div className="mx-auto max-w-[1100px] p-6">
        <p className="text-sm text-ink-muted">{t('common.loading')}</p>
      </div>
    )
  }

  if (!home) {
    return (
      <PageEmptyState
        section="INPUT DATA"
        title="Acc Payables"
        inputs={[{ label: 'HOME', href: '/', filled: false }]}
      />
    )
  }

  return <AccPayablesEditor />
}

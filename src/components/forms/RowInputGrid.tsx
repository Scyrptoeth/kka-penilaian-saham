'use client'

import { useState, useCallback } from 'react'
import type { ManifestRow } from '@/data/manifests/types'
import type { YearKeyedSeries } from '@/types/financial'
import { cn } from '@/lib/utils/cn'
import { parseFinancialInput } from './parse-financial-input'

/**
 * <RowInputGrid> — reusable financial data-entry grid.
 *
 * Takes the same {@link ManifestRow}[] that the read-only FinancialTable
 * consumes, plus a year axis, and renders a sticky-label table with one
 * editable numeric cell per (row, year). Each cell is a local-state
 * <NumericInput> that:
 *
 *   - on focus  → shows the raw number for keyboard editing
 *   - on blur   → parses via `parseFinancialInput` (handles Rp, dots,
 *                 parens, commas, explicit negatives) and calls onChange
 *                 with the parsed number, then renders the Indonesian
 *                 thousand-separated format
 *
 * Tab order flows left-to-right per row, top-to-bottom across rows,
 * matching native HTML behaviour with the nested table element order.
 *
 * Consumers are responsible for filtering `rows` to editable line items
 * only (skip header / separator / subtotal / total) before passing the
 * array in. Keeping the filter in the caller keeps this component
 * sheet-agnostic.
 */

interface RowInputGridProps {
  /** Editable rows only — filter out header/separator/subtotal/total upstream. */
  rows: ManifestRow[]
  /** Years rendered as columns, ascending. */
  years: number[]
  /** Current values: excelRow → year → value. */
  values: Record<number, YearKeyedSeries>
  /** Called when a single cell loses focus and the user's input is committed. */
  onChange: (excelRow: number, year: number, value: number) => void
}

export function RowInputGrid({
  rows,
  years,
  values,
  onChange,
}: RowInputGridProps) {
  return (
    <div className="overflow-x-auto rounded-sm border border-grid bg-canvas-raised shadow-[0_1px_0_rgba(10,22,40,0.04)]">
      <table className="min-w-full border-collapse text-[13px]">
        <thead>
          <tr className="bg-canvas-raised">
            <th
              scope="col"
              className="sticky left-0 top-0 z-20 min-w-[280px] border-b border-grid-strong bg-canvas-raised px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted shadow-[1px_0_0_rgba(10,22,40,0.06)]"
            >
              Line Item
            </th>
            {years.map((year) => (
              <th
                key={`header-${year}`}
                scope="col"
                className="sticky top-0 z-10 border-b border-grid-strong bg-canvas-raised px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted"
              >
                {year}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            if (row.excelRow === undefined) return null
            const excelRow = row.excelRow
            const rowValues = values[excelRow] ?? {}
            const baseBg = idx % 2 === 0 ? 'bg-canvas' : 'bg-canvas-raised/60'
            return (
              <tr key={`${excelRow}-${row.label}`} className="group">
                <th
                  scope="row"
                  className={cn(
                    'sticky left-0 z-10 text-left font-normal text-ink-soft transition-colors',
                    baseBg,
                    'shadow-[1px_0_0_rgba(10,22,40,0.06)]',
                    getIndentClass(row.indent),
                    'py-1.5 pr-4',
                  )}
                >
                  {row.label}
                </th>
                {years.map((year) => (
                  <td
                    key={`${excelRow}-${year}`}
                    className={cn('px-2 py-1', baseBg)}
                  >
                    <NumericInput
                      value={rowValues[year] ?? 0}
                      ariaLabel={`${row.label} — ${year}`}
                      onCommit={(v) => onChange(excelRow, year, v)}
                    />
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

interface NumericInputProps {
  value: number
  ariaLabel: string
  onCommit: (value: number) => void
}

const NUMBER_FORMATTER = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 2,
})

function formatDisplay(value: number): string {
  if (value === 0) return ''
  return NUMBER_FORMATTER.format(value)
}

function NumericInput({ value, ariaLabel, onCommit }: NumericInputProps) {
  const [draft, setDraft] = useState<string | null>(null)

  const isEditing = draft !== null
  const display = isEditing ? draft : formatDisplay(value)

  const handleFocus = useCallback(() => {
    // Show raw number for easy overtyping; empty when 0 so placeholder shows.
    setDraft(value === 0 ? '' : String(value))
  }, [value])

  const handleBlur = useCallback(() => {
    if (draft === null) return
    const parsed = parseFinancialInput(draft)
    if (parsed !== value) onCommit(parsed)
    setDraft(null)
  }, [draft, value, onCommit])

  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      value={display}
      placeholder="0"
      onChange={(e) => setDraft(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={cn(
        'w-full min-w-[120px] rounded-sm border border-grid bg-canvas px-2 py-1 text-right font-mono text-[13px] tabular-nums text-ink',
        'transition-colors placeholder:text-ink-muted/60',
        'focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent',
        value < 0 && 'text-negative',
      )}
    />
  )
}

function getIndentClass(indent: 0 | 1 | 2 | undefined): string {
  switch (indent) {
    case 1:
      return 'pl-8'
    case 2:
      return 'pl-12'
    case 0:
    case undefined:
    default:
      return 'pl-3'
  }
}

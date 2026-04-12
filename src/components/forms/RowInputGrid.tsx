'use client'

import { useState, useCallback } from 'react'
import type { ManifestRow } from '@/data/manifests/types'
import type { YearKeyedSeries } from '@/types/financial'
import { cn } from '@/lib/utils/cn'
import { formatIdr, isNegative } from '@/components/financial/format'
import { parseFinancialInput } from './parse-financial-input'

/**
 * <RowInputGrid> — reusable financial data-entry grid.
 *
 * Takes the full {@link ManifestRow}[] that the read-only FinancialTable
 * renders (headers, separators, normal leaves, subtotals, totals) plus a
 * year axis, and interleaves editable inputs for normal rows with
 * read-only computed cells for subtotal / total rows. Every cell stays
 * visually aligned in a single Bloomberg-style table.
 *
 * Editable row behaviour (<NumericInput>):
 *   - on focus  → shows the raw number for keyboard editing
 *   - on blur   → parses via `parseFinancialInput` (handles Rp, dots,
 *                 parens, commas, explicit negatives) and calls onChange
 *
 * Read-only row behaviour: subtotal / total rows pull from
 * `computedValues[excelRow]` and render formatted IDR with parentheses
 * for negatives (accounting convention).
 */

interface RowInputGridProps {
  /** Full manifest rows — header / separator / normal / subtotal / total. */
  rows: readonly ManifestRow[]
  /** Years rendered as columns, ascending. */
  years: readonly number[]
  /** User-entered values: excelRow → year → value. */
  values: Readonly<Record<number, YearKeyedSeries>>
  /** Derived values for subtotal/total rows: excelRow → year → value. */
  computedValues?: Readonly<Record<number, YearKeyedSeries>>
  /** Called when an editable cell loses focus and input is committed. */
  onChange: (excelRow: number, year: number, value: number) => void
}

export function RowInputGrid({
  rows,
  years,
  values,
  computedValues = {},
  onChange,
}: RowInputGridProps) {
  const colCount = 1 + years.length
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
            const type = row.type ?? 'normal'

            if (type === 'separator') {
              return (
                <tr key={`sep-${idx}`} aria-hidden>
                  <td
                    colSpan={colCount}
                    className="h-2 border-b border-grid bg-canvas"
                  />
                </tr>
              )
            }

            if (type === 'header') {
              return (
                <tr key={`header-${idx}`}>
                  <th
                    scope="row"
                    colSpan={colCount}
                    className="sticky left-0 border-t border-grid-strong bg-grid px-3 py-1.5 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft"
                  >
                    {row.label}
                  </th>
                </tr>
              )
            }

            const baseBg = idx % 2 === 0 ? 'bg-canvas' : 'bg-canvas-raised/60'
            const excelRow = row.excelRow
            if (excelRow === undefined) return null

            const isEditable = type === 'normal'
            const rowValues = isEditable
              ? (values[excelRow] ?? {})
              : (computedValues[excelRow] ?? {})

            const labelClasses = cn(
              'sticky left-0 z-10 text-left font-normal text-ink-soft',
              baseBg,
              'shadow-[1px_0_0_rgba(10,22,40,0.06)]',
              getIndentClass(row.indent),
              'py-1.5 pr-4',
              type === 'subtotal' &&
                'border-t border-grid-strong font-semibold text-ink',
              type === 'total' && 'border-t-2 border-ink font-bold text-ink',
            )

            return (
              <tr key={`${excelRow}-${row.label}`} className="group">
                <th scope="row" className={labelClasses}>
                  {row.label}
                </th>
                {years.map((year) => {
                  if (isEditable) {
                    return (
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
                    )
                  }
                  const computed = rowValues[year] ?? 0
                  const negative = isNegative(computed)
                  return (
                    <td
                      key={`${excelRow}-${year}`}
                      className={cn(
                        'px-3 py-1.5 text-right font-mono tabular-nums',
                        baseBg,
                        type === 'subtotal' &&
                          'border-t border-grid-strong font-semibold',
                        type === 'total' && 'border-t-2 border-ink font-bold',
                        negative ? 'text-negative' : 'text-ink',
                      )}
                    >
                      {formatIdr(computed)}
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

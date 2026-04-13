'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { ManifestRow, CatalogAccount } from '@/data/manifests/types'
import type { YearKeyedSeries } from '@/types/financial'
import { cn } from '@/lib/utils/cn'
import { formatIdr, isNegative } from '@/components/financial/format'
import { parseFinancialInput } from './parse-financial-input'

interface RowInputGridProps {
  rows: readonly ManifestRow[]
  years: readonly number[]
  values: Readonly<Record<number, YearKeyedSeries>>
  computedValues?: Readonly<Record<number, YearKeyedSeries>>
  onChange: (excelRow: number, year: number, value: number) => void
  lineItemHeader?: string
  // Inline add/remove account props
  onAddButtonClick?: (section: string) => void
  onRemoveAccount?: (catalogId: string) => void
  openDropdownSection?: string | null
  dropdownCatalog?: readonly CatalogAccount[]
  onSelectCatalogItem?: (item: CatalogAccount) => void
  onCustomEntry?: (section: string, label: string) => void
  onCloseDropdown?: () => void
  /** i18n strings for dropdown UI */
  dropdownStrings?: { manualEntry: string; allAccountsAdded: string; accountNamePlaceholder: string; cancel: string; add: string }
  /** Active language for catalog labels */
  language?: 'en' | 'id'
}

export function RowInputGrid({
  rows,
  years,
  values,
  computedValues = {},
  onChange,
  lineItemHeader = 'Line Item',
  onAddButtonClick,
  onRemoveAccount,
  openDropdownSection,
  dropdownCatalog = [],
  onSelectCatalogItem,
  onCustomEntry,
  onCloseDropdown,
  dropdownStrings,
  language = 'id',
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
              {lineItemHeader}
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
                  <td colSpan={colCount} className="h-2 border-b border-grid bg-canvas" />
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

            if (type === 'add-button') {
              const isOpen = openDropdownSection === row.section
              return (
                <tr key={`add-${row.section}-${idx}`}>
                  <td colSpan={colCount} className="relative bg-canvas px-3 py-1">
                    <button
                      type="button"
                      onClick={() => row.section && onAddButtonClick?.(row.section)}
                      className="text-[11px] font-medium text-ink-muted transition-colors hover:text-accent"
                    >
                      {row.label}
                    </button>
                    {isOpen && row.section && (
                      <InlineDropdown
                        section={row.section}
                        catalog={dropdownCatalog}
                        language={language}
                        onSelect={(item) => onSelectCatalogItem?.(item)}
                        onCustom={(section, label) => onCustomEntry?.(section, label)}
                        onClose={() => onCloseDropdown?.()}
                        strings={dropdownStrings}
                      />
                    )}
                  </td>
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

            const hasTrash = isEditable && row.catalogId && onRemoveAccount

            const labelClasses = cn(
              'sticky left-0 z-10 text-left font-normal text-ink-soft',
              baseBg,
              'shadow-[1px_0_0_rgba(10,22,40,0.06)]',
              getIndentClass(row.indent),
              'py-1.5 pr-4',
              type === 'subtotal' && 'border-t border-grid-strong font-semibold text-ink',
              type === 'total' && 'border-t-2 border-ink font-bold text-ink',
              type === 'cross-ref' && 'italic text-ink-muted',
            )

            return (
              <tr key={`${excelRow}-${row.label}`} className="group">
                <th scope="row" className={labelClasses}>
                  <span className="inline-flex items-center gap-1.5">
                    {hasTrash && (
                      <button
                        type="button"
                        onClick={() => onRemoveAccount!(row.catalogId!)}
                        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-ink-muted/40 opacity-0 transition-all group-hover:opacity-100 hover:!text-negative"
                        title="Remove"
                      >
                        <TrashIcon />
                      </button>
                    )}
                    {row.label}
                  </span>
                </th>
                {years.map((year) => {
                  if (isEditable) {
                    return (
                      <td key={`${excelRow}-${year}`} className={cn('px-2 py-1', baseBg)}>
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
                        type === 'subtotal' && 'border-t border-grid-strong font-semibold',
                        type === 'total' && 'border-t-2 border-ink font-bold',
                        type === 'cross-ref' && 'italic',
                        negative ? 'text-negative' : type === 'cross-ref' ? 'text-ink-muted' : 'text-ink',
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

// ---------------------------------------------------------------------------
// Inline dropdown for add-button rows
// ---------------------------------------------------------------------------

function InlineDropdown({
  section,
  catalog,
  language = 'id',
  onSelect,
  onCustom,
  onClose,
  strings,
}: {
  section: string
  catalog: readonly CatalogAccount[]
  language?: 'en' | 'id'
  onSelect: (item: CatalogAccount) => void
  onCustom: (section: string, label: string) => void
  onClose: () => void
  strings?: { manualEntry: string; allAccountsAdded: string; accountNamePlaceholder: string; cancel: string; add: string }
}) {
  const [customMode, setCustomMode] = useState(false)
  const [customLabel, setCustomLabel] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  function handleCustomSubmit() {
    if (customLabel.trim()) {
      onCustom(section, customLabel.trim())
      setCustomLabel('')
      setCustomMode(false)
    }
  }

  const t = strings ?? {
    manualEntry: 'Isi Manual...',
    allAccountsAdded: 'Semua akun sudah ditambahkan',
    accountNamePlaceholder: 'Nama akun...',
    cancel: 'Batal',
    add: 'Tambah',
  }

  return (
    <div ref={ref} className="absolute left-3 top-full z-30 mt-1 w-64 rounded-sm border border-grid bg-canvas-raised shadow-lg">
      {!customMode ? (
        <ul className="max-h-48 overflow-y-auto py-1">
          {catalog.map((cat) => (
            <li key={cat.id}>
              <button
                type="button"
                onClick={() => onSelect(cat)}
                className="w-full px-3 py-1.5 text-left text-[12px] text-ink-soft transition-colors hover:bg-grid hover:text-ink"
              >
                {language === 'en' ? cat.labelEn : cat.labelId}
              </button>
            </li>
          ))}
          {catalog.length === 0 && (
            <li className="px-3 py-1.5 text-[12px] text-ink-muted">{t.allAccountsAdded}</li>
          )}
          <li className="border-t border-grid">
            <button
              type="button"
              onClick={() => setCustomMode(true)}
              className="w-full px-3 py-1.5 text-left text-[12px] font-medium text-accent transition-colors hover:bg-accent/10"
            >
              {t.manualEntry}
            </button>
          </li>
        </ul>
      ) : (
        <div className="p-2">
          <input
            type="text"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCustomSubmit() }}
            placeholder={t.accountNamePlaceholder}
            className="w-full rounded-sm border border-grid bg-canvas px-2 py-1.5 text-[12px] text-ink focus:border-accent focus:outline-none"
            autoFocus
          />
          <div className="mt-1.5 flex justify-end gap-1.5">
            <button type="button" onClick={() => { setCustomMode(false); setCustomLabel('') }} className="px-2 py-1 text-[11px] text-ink-muted hover:text-ink">{t.cancel}</button>
            <button type="button" onClick={handleCustomSubmit} className="rounded-sm bg-accent px-2 py-1 text-[11px] text-white hover:bg-accent/90">{t.add}</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
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

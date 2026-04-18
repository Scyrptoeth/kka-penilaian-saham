'use client'

import { useState, useCallback, useEffect, useRef, type RefObject } from 'react'
import type { ManifestRow, CatalogAccount } from '@/data/manifests/types'
import type { YearKeyedSeries } from '@/types/financial'
import { cn } from '@/lib/utils/cn'
import { useT } from '@/lib/i18n/useT'
import { formatIdr, formatPercent, isNegative } from '@/components/financial/format'
import { averageSeries } from '@/lib/calculations/derivation-helpers'
import { useAutoFlipPosition } from '@/lib/hooks/useAutoFlipPosition'
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
  /** Optional Common Size derivation: excelRow → { year → ratio } */
  commonSize?: Readonly<Record<number, YearKeyedSeries>>
  /** Years to show Common Size columns for (all years with data) */
  commonSizeYears?: readonly number[]
  /** Optional Growth YoY derivation: excelRow → { year → ratio } */
  growth?: Readonly<Record<number, YearKeyedSeries>>
  /** Years to show Growth columns for (years[1:] — need prior year) */
  growthYears?: readonly number[]
  /**
   * Render an extra "Average" sub-column at the end of the Common Size
   * column group. Per-row avg is computed from `commonSize[excelRow]`
   * across `commonSizeYears` using leading-zero-skip semantics.
   * Auto-hidden when `commonSizeYears.length < 2` (need ≥2 historical years).
   */
  showCommonSizeAverage?: boolean
  /**
   * Render an extra "Average" sub-column at the end of the Growth YoY
   * column group. Per-row avg is computed from `growth[excelRow]` across
   * `growthYears` using leading-zero-skip semantics. Auto-hidden when
   * `growthYears.length < 1` (no YoY data to average).
   */
  showGrowthAverage?: boolean
  /**
   * Session 051 — optional resolver for the Growth YoY Average column.
   * When provided, it REPLACES the default `averageSeries(growth[row], growthYears)`
   * computation. Callers use this to inject strict semantics (e.g.
   * `averageYoYStrict(rawValueSeries, historicalYears)`) that treat
   * sparse-historical accounts as null/"—" instead of averaging a single
   * trailing observation. Returning null renders "—" in the Average cell.
   */
  growthAverageResolver?: (excelRow: number) => number | null
}

export function RowInputGrid({
  rows,
  years,
  values,
  computedValues = {},
  onChange,
  lineItemHeader,
  onAddButtonClick,
  onRemoveAccount,
  openDropdownSection,
  dropdownCatalog = [],
  onSelectCatalogItem,
  onCustomEntry,
  onCloseDropdown,
  dropdownStrings,
  language = 'id',
  commonSize,
  commonSizeYears = [],
  growth,
  growthYears = [],
  showCommonSizeAverage = false,
  showGrowthAverage = false,
  growthAverageResolver,
}: RowInputGridProps) {
  const { t } = useT()
  const resolvedLineItemHeader = lineItemHeader ?? t('table.lineItemHeader')
  // Average columns are gated by having ≥2 historical years overall — user
  // spec: "jika hanya 1 tahun historis, tidak perlu Average".
  const csAvg = showCommonSizeAverage && commonSizeYears.length >= 2
  const grAvg = showGrowthAverage && growthYears.length >= 1 && years.length >= 2
  const csAvgExtra = csAvg ? 1 : 0
  const grAvgExtra = grAvg ? 1 : 0
  const colCount =
    1 + years.length + commonSizeYears.length + csAvgExtra + growthYears.length + grAvgExtra
  return (
    <div className="overflow-x-auto rounded-sm border border-grid bg-canvas-raised shadow-[0_1px_0_rgba(10,22,40,0.04)]">
      <table className="min-w-full border-collapse text-[13px]">
        <thead>
          <tr className="bg-canvas-raised">
            <th
              scope="col"
              className="sticky left-0 top-0 z-20 min-w-[280px] border-b border-grid-strong bg-canvas-raised px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted shadow-[1px_0_0_rgba(10,22,40,0.06)]"
            >
              {resolvedLineItemHeader}
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
            {commonSizeYears.length > 0 && (
              <th
                scope="colgroup"
                colSpan={commonSizeYears.length + csAvgExtra}
                className="sticky top-0 z-10 border-b border-l border-grid-strong bg-canvas-raised px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-accent"
              >
                {t('table.commonSize')}
              </th>
            )}
            {growthYears.length > 0 && (
              <th
                scope="colgroup"
                colSpan={growthYears.length + grAvgExtra}
                className="sticky top-0 z-10 border-b border-l border-grid-strong bg-canvas-raised px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-accent"
              >
                {t('table.growthYoY')}
              </th>
            )}
          </tr>
          {(commonSizeYears.length > 0 || growthYears.length > 0) && (
            <tr className="bg-canvas-raised">
              <th className="sticky left-0 z-20 border-b border-grid bg-canvas-raised shadow-[1px_0_0_rgba(10,22,40,0.06)]" />
              {years.map((y) => <th key={`sub-${y}`} className="border-b border-grid bg-canvas-raised" />)}
              {commonSizeYears.map((y) => (
                <th key={`cs-${y}`} className="border-b border-l border-grid bg-canvas-raised px-2 py-1 text-right text-[10px] font-medium text-ink-muted">{y}</th>
              ))}
              {csAvg && (
                <th
                  key="cs-avg"
                  className="border-b border-l border-grid-strong bg-canvas-raised px-2 py-1 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted"
                >
                  {t('table.average')}
                </th>
              )}
              {growthYears.map((y) => (
                <th key={`gr-${y}`} className="border-b border-l border-grid bg-canvas-raised px-2 py-1 text-right text-[10px] font-medium text-ink-muted">{y}</th>
              ))}
              {grAvg && (
                <th
                  key="gr-avg"
                  className="border-b border-l border-grid-strong bg-canvas-raised px-2 py-1 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted"
                >
                  {t('table.average')}
                </th>
              )}
            </tr>
          )}
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
              return (
                <AddAccountRow
                  key={`add-${row.section}-${idx}`}
                  row={row}
                  colCount={colCount}
                  isOpen={openDropdownSection === row.section}
                  dropdownCatalog={dropdownCatalog}
                  language={language}
                  dropdownStrings={dropdownStrings}
                  onAddButtonClick={onAddButtonClick}
                  onSelectCatalogItem={onSelectCatalogItem}
                  onCustomEntry={onCustomEntry}
                  onCloseDropdown={onCloseDropdown}
                />
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
              type === 'cross-ref' && 'text-ink-muted',
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
                        title={t('common.remove')}
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
                        type === 'cross-ref' && '',
                        negative ? 'text-negative' : type === 'cross-ref' ? 'text-ink-muted' : 'text-ink',
                      )}
                    >
                      {formatIdr(computed)}
                    </td>
                  )
                })}
                {commonSizeYears.map((y) => {
                  const v = commonSize?.[excelRow]?.[y] ?? 0
                  return (
                    <td key={`cs-${excelRow}-${y}`} className={cn(
                      'border-l border-grid/50 px-2 py-1.5 text-right font-mono text-[12px] tabular-nums',
                      baseBg,
                      type === 'subtotal' && 'border-t border-grid-strong font-semibold',
                      type === 'total' && 'border-t-2 border-ink font-bold',
                      isNegative(v) ? 'text-negative' : 'text-ink-muted',
                    )}>
                      {formatPercent(v)}
                    </td>
                  )
                })}
                {csAvg && (() => {
                  const avg = averageSeries(commonSize?.[excelRow], commonSizeYears)
                  return (
                    <td key={`cs-avg-${excelRow}`} className={cn(
                      'border-l border-grid-strong px-2 py-1.5 text-right font-mono text-[12px] font-semibold tabular-nums',
                      baseBg,
                      type === 'subtotal' && 'border-t border-grid-strong',
                      type === 'total' && 'border-t-2 border-ink font-bold',
                      avg == null ? 'text-ink-muted' : isNegative(avg) ? 'text-negative' : 'text-ink',
                    )}>
                      {avg == null ? '—' : formatPercent(avg)}
                    </td>
                  )
                })()}
                {growthYears.map((y) => {
                  const v = growth?.[excelRow]?.[y] ?? 0
                  return (
                    <td key={`gr-${excelRow}-${y}`} className={cn(
                      'border-l border-grid/50 px-2 py-1.5 text-right font-mono text-[12px] tabular-nums',
                      baseBg,
                      type === 'subtotal' && 'border-t border-grid-strong font-semibold',
                      type === 'total' && 'border-t-2 border-ink font-bold',
                      isNegative(v) ? 'text-negative' : 'text-ink-muted',
                    )}>
                      {formatPercent(v)}
                    </td>
                  )
                })}
                {grAvg && (() => {
                  const avg = growthAverageResolver
                    ? growthAverageResolver(excelRow)
                    : averageSeries(growth?.[excelRow], growthYears)
                  return (
                    <td key={`gr-avg-${excelRow}`} className={cn(
                      'border-l border-grid-strong px-2 py-1.5 text-right font-mono text-[12px] font-semibold tabular-nums',
                      baseBg,
                      type === 'subtotal' && 'border-t border-grid-strong',
                      type === 'total' && 'border-t-2 border-ink font-bold',
                      avg == null ? 'text-ink-muted' : isNegative(avg) ? 'text-negative' : 'text-ink',
                    )}>
                      {avg == null ? '—' : formatPercent(avg)}
                    </td>
                  )
                })()}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Add-account row — holds trigger ref + mounts InlineDropdown conditionally
// ---------------------------------------------------------------------------

function AddAccountRow({
  row,
  colCount,
  isOpen,
  dropdownCatalog,
  language,
  dropdownStrings,
  onAddButtonClick,
  onSelectCatalogItem,
  onCustomEntry,
  onCloseDropdown,
}: {
  row: ManifestRow
  colCount: number
  isOpen: boolean
  dropdownCatalog: readonly CatalogAccount[]
  language: 'en' | 'id'
  dropdownStrings?: { manualEntry: string; allAccountsAdded: string; accountNamePlaceholder: string; cancel: string; add: string }
  onAddButtonClick?: (section: string) => void
  onSelectCatalogItem?: (item: CatalogAccount) => void
  onCustomEntry?: (section: string, label: string) => void
  onCloseDropdown?: () => void
}) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  return (
    <tr>
      <td colSpan={colCount} className="relative bg-canvas px-3 py-1">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => row.section && onAddButtonClick?.(row.section)}
          className="text-[13px] font-medium text-ink-muted transition-colors hover:text-accent"
        >
          {row.label}
        </button>
        {isOpen && row.section && (
          <InlineDropdown
            section={row.section}
            catalog={dropdownCatalog}
            language={language}
            triggerRef={triggerRef}
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

// ---------------------------------------------------------------------------
// Inline dropdown for add-button rows
// ---------------------------------------------------------------------------

function InlineDropdown({
  section,
  catalog,
  language = 'id',
  triggerRef,
  onSelect,
  onCustom,
  onClose,
  strings,
}: {
  section: string
  catalog: readonly CatalogAccount[]
  language?: 'en' | 'id'
  triggerRef: RefObject<HTMLElement | null>
  onSelect: (item: CatalogAccount) => void
  onCustom: (section: string, label: string) => void
  onClose: () => void
  strings?: { manualEntry: string; allAccountsAdded: string; accountNamePlaceholder: string; cancel: string; add: string }
}) {
  const { t: translate } = useT()
  const [customMode, setCustomMode] = useState(false)
  const [customLabel, setCustomLabel] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const { placement } = useAutoFlipPosition(triggerRef, { contentHeight: 240 })

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

  const s = strings ?? {
    manualEntry: translate('dropdown.manualEntry'),
    allAccountsAdded: translate('dropdown.allAdded'),
    accountNamePlaceholder: translate('dropdown.namePlaceholder'),
    cancel: translate('dropdown.cancel'),
    add: translate('dropdown.add'),
  }

  const positionClass = placement === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'

  return (
    <div ref={ref} className={`absolute left-3 ${positionClass} z-30 w-64 rounded-sm border border-grid bg-canvas-raised shadow-lg`}>
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
            <li className="px-3 py-1.5 text-[12px] text-ink-muted">{s.allAccountsAdded}</li>
          )}
          <li className="border-t border-grid">
            <button
              type="button"
              onClick={() => setCustomMode(true)}
              className="w-full px-3 py-1.5 text-left text-[12px] font-medium text-accent transition-colors hover:bg-accent/10"
            >
              {s.manualEntry}
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
            placeholder={s.accountNamePlaceholder}
            className="w-full rounded-sm border border-grid bg-canvas px-2 py-1.5 text-[12px] text-ink focus:border-accent focus:outline-none"
            autoFocus
          />
          <div className="mt-1.5 flex justify-end gap-1.5">
            <button type="button" onClick={() => { setCustomMode(false); setCustomLabel('') }} className="px-2 py-1 text-[11px] text-ink-muted hover:text-ink">{s.cancel}</button>
            <button type="button" onClick={handleCustomSubmit} className="rounded-sm bg-accent px-2 py-1 text-[11px] text-white hover:bg-accent/90">{s.add}</button>
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

export interface NumericInputProps {
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

export function NumericInput({ value, ariaLabel, onCommit }: NumericInputProps) {
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

'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { PageEmptyState } from '@/components/shared/PageEmptyState'
import { formatIdr } from '@/components/financial/format'
import { parseFinancialInput } from '@/components/forms/parse-financial-input'
import { useT } from '@/lib/i18n/useT'
import type { YearKeyedSeries } from '@/types/financial'
import type { ApSchedule, ApSection } from '@/data/live/types'
import {
  AP_BANDS,
  apRowFor,
  computeApSentinels,
  createDefaultApState,
} from '@/data/catalogs/acc-payables-catalog'

type LocalRows = Record<number, YearKeyedSeries>

function nextSlotIndex(
  schedules: readonly ApSchedule[],
  section: ApSection,
): number {
  const bandBudget =
    AP_BANDS[section].add.extendedEnd - AP_BANDS[section].add.extendedStart + 1
  // Baseline slot 0 + up to `bandBudget` extended slots (slotIndex 1..bandBudget)
  const usedSlots = new Set(
    schedules.filter((s) => s.section === section).map((s) => s.slotIndex),
  )
  for (let i = 0; i <= bandBudget; i++) {
    if (!usedSlots.has(i)) return i
  }
  return bandBudget
}

function scheduleLabel(
  schedule: ApSchedule,
  schedulesInSection: readonly ApSchedule[],
  sectionLabel: string,
): string {
  if (schedule.customLabel) return schedule.customLabel
  const sortedIndex =
    schedulesInSection
      .slice()
      .sort((a, b) => a.slotIndex - b.slotIndex)
      .findIndex((s) => s.id === schedule.id) + 1
  return `${sectionLabel} ${sortedIndex}`
}

function AccPayablesEditor() {
  const { t } = useT()
  const home = useKkaStore((s) => s.home)!
  const accPayables = useKkaStore((s) => s.accPayables) ?? createDefaultApState()
  const setAccPayables = useKkaStore((s) => s.setAccPayables)
  const tahunTransaksi = home.tahunTransaksi

  const years = useMemo(
    () => computeHistoricalYears(tahunTransaksi, 3),
    [tahunTransaksi],
  )

  const [localSchedules, setLocalSchedules] = useState<ApSchedule[]>(
    () => accPayables.schedules,
  )
  const [localRows, setLocalRows] = useState<LocalRows>(() => accPayables.rows)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const schedulePersist = useCallback(
    (nextSchedules: ApSchedule[], nextRows: LocalRows) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        const sentinels = computeApSentinels(nextSchedules, nextRows, years)
        setAccPayables({
          schedules: nextSchedules,
          rows: { ...nextRows, ...sentinels },
        })
      }, 500)
    },
    [setAccPayables, years],
  )

  const sentinels = useMemo(
    () => computeApSentinels(localSchedules, localRows, years),
    [localSchedules, localRows, years],
  )

  function setAdditionCell(row: number, year: number, raw: string) {
    const value = parseFinancialInput(raw)
    const nextRows: LocalRows = { ...localRows }
    if (!nextRows[row]) nextRows[row] = {}
    nextRows[row] = { ...nextRows[row], [year]: value }
    setLocalRows(nextRows)
    schedulePersist(localSchedules, nextRows)
  }

  function addSchedule(section: ApSection) {
    const slotIndex = nextSlotIndex(localSchedules, section)
    // slotIndex is unique per section → deterministic pure id (LESSON — avoid
    // Date.now() in component body to satisfy react-hooks/purity).
    const next: ApSchedule = {
      id: `${section}_slot${slotIndex}`,
      section,
      slotIndex,
    }
    const nextSchedules = [...localSchedules, next]
    setLocalSchedules(nextSchedules)
    schedulePersist(nextSchedules, localRows)
  }

  function removeSchedule(id: string) {
    const nextSchedules = localSchedules.filter((s) => s.id !== id)
    const target = localSchedules.find((s) => s.id === id)
    let nextRows = localRows
    if (target) {
      const addRow = apRowFor(target.section, target.slotIndex, 'add')
      const begRow = apRowFor(target.section, target.slotIndex, 'beg')
      const endRow = apRowFor(target.section, target.slotIndex, 'end')
      nextRows = { ...localRows }
      delete nextRows[addRow]
      delete nextRows[begRow]
      delete nextRows[endRow]
    }
    setLocalSchedules(nextSchedules)
    setLocalRows(nextRows)
    schedulePersist(nextSchedules, nextRows)
  }

  function renameSchedule(id: string, label: string) {
    const nextSchedules = localSchedules.map((s) =>
      s.id === id
        ? { ...s, customLabel: label.trim() === '' ? undefined : label.trim() }
        : s,
    )
    setLocalSchedules(nextSchedules)
    schedulePersist(nextSchedules, localRows)
  }

  function renderSection(section: ApSection, sectionLabel: string, addButtonLabel: string) {
    const schedules = localSchedules
      .filter((s) => s.section === section)
      .slice()
      .sort((a, b) => a.slotIndex - b.slotIndex)

    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
            {sectionLabel}
          </h2>
          <button
            type="button"
            onClick={() => addSchedule(section)}
            className="text-xs font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {addButtonLabel}
          </button>
        </div>

        {schedules.length === 0 ? (
          <p className="py-4 text-center text-xs text-ink-muted">—</p>
        ) : (
          schedules.map((schedule) => (
            <ScheduleCard
              key={schedule.id}
              schedule={schedule}
              schedulesInSection={schedules}
              sectionLabel={sectionLabel}
              years={years}
              localRows={localRows}
              sentinels={sentinels}
              onRename={renameSchedule}
              onRemove={removeSchedule}
              onCellChange={setAdditionCell}
              t={t}
            />
          ))
        )}
      </section>
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

      <div className="mt-6 space-y-8">
        {renderSection(
          'st_bank_loans',
          t('accPayables.shortTerm'),
          t('accPayables.schedule.add.st'),
        )}
        {renderSection(
          'lt_bank_loans',
          t('accPayables.longTerm'),
          t('accPayables.schedule.add.lt'),
        )}
      </div>

      <p className="mt-6 text-xs text-ink-muted">{t('accPayables.footerNote')}</p>
      <p className="mt-2 text-xs text-ink-muted">{t('accPayables.addition.helper')}</p>
    </div>
  )
}

interface ScheduleCardProps {
  schedule: ApSchedule
  schedulesInSection: readonly ApSchedule[]
  sectionLabel: string
  years: number[]
  localRows: LocalRows
  sentinels: Record<number, YearKeyedSeries>
  onRename: (id: string, label: string) => void
  onRemove: (id: string) => void
  onCellChange: (row: number, year: number, raw: string) => void
  t: ReturnType<typeof useT>['t']
}

function ScheduleCard({
  schedule,
  schedulesInSection,
  sectionLabel,
  years,
  localRows,
  sentinels,
  onRename,
  onRemove,
  onCellChange,
  t,
}: ScheduleCardProps) {
  const begRow = apRowFor(schedule.section, schedule.slotIndex, 'beg')
  const addRow = apRowFor(schedule.section, schedule.slotIndex, 'add')
  const endRow = apRowFor(schedule.section, schedule.slotIndex, 'end')
  const displayLabel = scheduleLabel(schedule, schedulesInSection, sectionLabel)
  const isRemovable = schedulesInSection.length > 1 || schedule.slotIndex > 0

  return (
    <div className="rounded border border-grid bg-canvas-raised">
      <div className="flex items-center justify-between gap-2 border-b border-grid px-3 py-2">
        <input
          type="text"
          defaultValue={schedule.customLabel ?? displayLabel}
          placeholder={displayLabel}
          aria-label={t('accPayables.schedule.rename.aria')}
          onBlur={(e) => {
            const next = e.target.value
            if (next !== (schedule.customLabel ?? displayLabel)) {
              onRename(schedule.id, next)
            }
          }}
          className="flex-1 rounded-sm bg-transparent px-1 py-0.5 text-sm font-medium text-ink outline-none hover:bg-canvas focus:bg-canvas focus:ring-1 focus:ring-accent"
        />
        {isRemovable && (
          <button
            type="button"
            onClick={() => onRemove(schedule.id)}
            aria-label={t('accPayables.schedule.remove')}
            className="text-xs text-ink-muted hover:text-negative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-negative"
          >
            ✕
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-grid">
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-muted"></th>
              {years.map((y) => (
                <th
                  key={y}
                  className="px-3 py-2 text-right font-mono text-[11px] font-semibold text-ink-muted"
                >
                  {y}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <RowDisplay
              label={t('accPayables.row.beginning')}
              years={years}
              values={sentinels[begRow] ?? {}}
            />
            <RowEditable
              label={t('accPayables.row.addition')}
              years={years}
              values={localRows[addRow] ?? {}}
              onChange={(y, raw) => onCellChange(addRow, y, raw)}
            />
            <RowDisplay
              label={t('accPayables.row.ending')}
              years={years}
              values={sentinels[endRow] ?? {}}
              bold
            />
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RowDisplay({
  label,
  years,
  values,
  bold,
}: {
  label: string
  years: number[]
  values: YearKeyedSeries
  bold?: boolean
}) {
  return (
    <tr className={`border-b border-grid ${bold ? 'bg-canvas font-semibold' : ''}`}>
      <td className="px-3 py-1.5 text-ink-soft">{label}</td>
      {years.map((y) => {
        const v = values[y] ?? 0
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
}

function RowEditable({
  label,
  years,
  values,
  onChange,
}: {
  label: string
  years: number[]
  values: YearKeyedSeries
  onChange: (year: number, raw: string) => void
}) {
  return (
    <tr className="border-b border-grid">
      <td className="px-3 py-1.5 text-ink-soft">{label}</td>
      {years.map((y) => {
        const v = values[y] ?? 0
        return (
          <td key={y} className="px-1 py-0.5">
            <input
              type="text"
              className="w-full rounded-sm border border-grid bg-canvas px-2 py-1 text-right font-mono text-sm tabular-nums text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              defaultValue={v !== 0 ? formatIdr(v) : ''}
              placeholder="0"
              onBlur={(e) => onChange(y, e.target.value)}
            />
          </td>
        )
      })}
    </tr>
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
        section={t('nav.group.inputData')}
        title={t('nav.item.accPayables')}
        inputs={[{ label: 'HOME', href: '/', filled: false }]}
      />
    )
  }

  return <AccPayablesEditor />
}

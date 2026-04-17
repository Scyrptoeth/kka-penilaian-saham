'use client'

import { useMemo, useCallback, useState, useRef, useEffect } from 'react'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { useT } from '@/lib/i18n/useT'
import { RowInputGrid } from '@/components/forms/RowInputGrid'
import type { SheetManifest } from '@/data/manifests/types'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import type { YearKeyedSeries } from '@/types/financial'

/**
 * Generic data-entry component for any input sheet whose state fits the
 * `{ rows: excelRow → YearKeyedSeries }` shape. Used by `/input/<sheet>`
 * pages to avoid copy-pasting the hydration-seed + debounced-persist
 * pattern that first shipped in Session 010 for Balance Sheet.
 *
 * Invariants the parent MUST uphold (LESSON-034):
 *   1. Mount this component only after `store._hasHydrated === true`.
 *   2. Pass a validated `tahunTransaksi` (parent owns the HOME guard).
 *
 * With those in place, `useState` seeds the editable grid exactly once
 * from the persisted slice — no `useEffect` sync back from the store,
 * so the React Compiler lint (`set-state-in-effect`) stays satisfied.
 * Subsequent writes flow one-way: local → debounced → store.
 */

type StoreState = ReturnType<typeof useKkaStore.getState>

export interface ManifestSliceData {
  rows: Record<number, YearKeyedSeries>
}

export interface ManifestEditorProps {
  manifest: SheetManifest
  tahunTransaksi: number
  yearCount: 3 | 4
  sliceSelector: (state: StoreState) => ManifestSliceData | null
  sliceSetter: (state: StoreState) => (data: ManifestSliceData) => void
  headerTitle: string
  /** Optional override for the helper copy; defaults to a generic year-range message. */
  headerDescription?: string
}

export function ManifestEditor({
  manifest,
  tahunTransaksi,
  yearCount,
  sliceSelector,
  sliceSetter,
  headerTitle,
  headerDescription,
}: ManifestEditorProps) {
  const { t } = useT()
  const setSlice = useKkaStore(sliceSetter)

  // One-time non-subscribed seed from the persisted slice. Safe because
  // the parent guarantees the store has rehydrated before mounting us,
  // and subsequent writes originate here — we never need to listen for
  // external updates to this slice. Lazy initializer so `getState()` only
  // runs once on mount, not every re-render.
  const [localValues, setLocalValues] = useState<
    Record<number, YearKeyedSeries>
  >(() => sliceSelector(useKkaStore.getState())?.rows ?? {})

  const displayRows = manifest.rows

  const years = useMemo(
    () => computeHistoricalYears(tahunTransaksi, yearCount),
    [tahunTransaksi, yearCount],
  )

  const computedValues = useMemo(
    () => deriveComputedRows(displayRows, localValues, years),
    [displayRows, localValues, years],
  )

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = useCallback(
    (excelRow: number, year: number, value: number) => {
      setLocalValues((prev) => {
        const nextRow = { ...(prev[excelRow] ?? {}), [year]: value }
        const next = { ...prev, [excelRow]: nextRow }

        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
          setSlice({ rows: next })
        }, 500)

        return next
      })
    },
    [setSlice],
  )

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    },
    [],
  )

  const defaultDescription =
    years.length > 0
      ? t('editor.descriptionWithYears')
          .replace('{count}', String(years.length))
          .replace('{first}', String(years[0]))
          .replace('{last}', String(years[years.length - 1]))
      : t('editor.descriptionNoYears')

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <header>
        <h1 className="font-sans text-xl font-semibold tracking-tight text-ink">
          {headerTitle}
        </h1>
        <p className="mt-1 text-xs text-ink-muted">
          {headerDescription ?? defaultDescription}
        </p>
      </header>
      <RowInputGrid
        rows={displayRows}
        years={years}
        values={localValues}
        computedValues={computedValues}
        onChange={handleChange}
      />
    </div>
  )
}

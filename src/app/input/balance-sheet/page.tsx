'use client'

import { useMemo, useCallback, useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { RowInputGrid } from '@/components/forms/RowInputGrid'
import { BALANCE_SHEET_MANIFEST } from '@/data/manifests/balance-sheet'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import type { YearKeyedSeries } from '@/types/financial'

/**
 * Balance Sheet input page — pilot for Phase 3 live data mode.
 *
 * Guards on HOME form completion (`tahunTransaksi` drives the year axis);
 * if HOME is empty, renders a friendly empty-state pointing back to it.
 * Editable rows are derived from the BS manifest by filtering out
 * headers / separators / subtotals / totals — the same manifest is then
 * used downstream by <SheetPage> to render /historical/balance-sheet in
 * live mode once any row has been entered.
 *
 * The edit surface is extracted into <BalanceSheetEditor> so it only
 * mounts after Zustand has rehydrated from localStorage. That lets us
 * seed local state via `useState(initialValues)` a single time, avoiding
 * a setState-in-effect sync back from the store (LESSON-016).
 */

export default function InputBalanceSheetPage() {
  const home = useKkaStore((s) => s.home)
  const hasHydrated = useKkaStore((s) => s._hasHydrated)

  if (!hasHydrated) {
    return (
      <div className="mx-auto max-w-[1400px]">
        <p className="text-sm text-ink-muted">Memuat…</p>
      </div>
    )
  }

  if (!home) {
    return (
      <div className="mx-auto max-w-[1400px]">
        <div className="rounded-sm border-l-4 border-accent bg-canvas-raised px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
            HOME form belum diisi
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
            Lengkapi <strong className="text-ink">HOME form</strong> terlebih
            dahulu — tahun transaksi yang Anda masukkan menentukan rentang
            tahun historis yang akan diinput di halaman ini.
          </p>
          <Link
            href="/"
            className="mt-3 inline-block text-xs font-semibold uppercase tracking-[0.14em] text-accent underline underline-offset-4 hover:text-ink"
          >
            → Ke HOME form
          </Link>
        </div>
      </div>
    )
  }

  return <BalanceSheetEditor tahunTransaksi={home.tahunTransaksi} />
}

interface BalanceSheetEditorProps {
  tahunTransaksi: number
}

function BalanceSheetEditor({ tahunTransaksi }: BalanceSheetEditorProps) {
  const setBalanceSheet = useKkaStore((s) => s.setBalanceSheet)

  // One-time read of the persisted slice. Safe because this component only
  // mounts after hasHydrated is true in the parent — localStorage has been
  // replayed into the store and subsequent writes come from this form only.
  const initialValues = useKkaStore.getState().balanceSheet?.rows ?? {}

  const [localValues, setLocalValues] =
    useState<Record<number, YearKeyedSeries>>(initialValues)

  const editableRows = useMemo(
    () =>
      BALANCE_SHEET_MANIFEST.rows.filter(
        (r) =>
          r.excelRow !== undefined &&
          r.type !== 'header' &&
          r.type !== 'separator' &&
          r.type !== 'subtotal' &&
          r.type !== 'total',
      ),
    [],
  )

  const years = useMemo(
    () => computeHistoricalYears(tahunTransaksi, 4),
    [tahunTransaksi],
  )

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = useCallback(
    (excelRow: number, year: number, value: number) => {
      setLocalValues((prev) => {
        const nextRow = { ...(prev[excelRow] ?? {}), [year]: value }
        const next = { ...prev, [excelRow]: nextRow }

        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
          setBalanceSheet({ rows: next })
        }, 500)

        return next
      })
    },
    [setBalanceSheet],
  )

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    },
    [],
  )

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <header>
        <h1 className="font-sans text-xl font-semibold tracking-tight text-ink">
          Input — Balance Sheet
        </h1>
        <p className="mt-1 text-xs text-ink-muted">
          Masukkan data neraca untuk {years.length} tahun historis ({years[0]}–
          {years[years.length - 1]}). Subtotal dan total akan dihitung
          otomatis saat rendering. Data tersimpan otomatis ke perangkat Anda.
        </p>
      </header>
      <RowInputGrid
        rows={editableRows}
        years={years}
        values={localValues}
        onChange={handleChange}
      />
    </div>
  )
}

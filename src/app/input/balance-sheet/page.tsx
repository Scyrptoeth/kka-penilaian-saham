'use client'

import Link from 'next/link'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { ManifestEditor } from '@/components/forms/ManifestEditor'
import { BALANCE_SHEET_MANIFEST } from '@/data/manifests/balance-sheet'

/**
 * Balance Sheet input page — pilot for Phase 3 live data mode.
 *
 * Parent owns the hydration gate and the HOME guard; `<ManifestEditor>`
 * handles the seeded useState, debounced persist, and computed-row
 * rendering in a generic way. This file stays tiny so adding the next
 * input sheet (IS, FA) is ~15 lines + one manifest import.
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

  return (
    <ManifestEditor
      manifest={BALANCE_SHEET_MANIFEST}
      tahunTransaksi={home.tahunTransaksi}
      yearCount={4}
      sliceSelector={(s) => s.balanceSheet}
      sliceSetter={(s) => s.setBalanceSheet}
      headerTitle="Input — Balance Sheet"
    />
  )
}

'use client'

import Link from 'next/link'
import { useKkaStore } from '@/lib/store/useKkaStore'
import DynamicBsEditor from '@/components/forms/DynamicBsEditor'

/**
 * Balance Sheet input page — dynamic accounts, bilingual labels,
 * dynamic year columns (Session 020).
 *
 * Parent owns the hydration gate and HOME guard; DynamicBsEditor
 * handles all state management, account selection, and rendering.
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

  return <DynamicBsEditor />
}

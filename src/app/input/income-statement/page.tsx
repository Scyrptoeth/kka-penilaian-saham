'use client'

import Link from 'next/link'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { ManifestEditor } from '@/components/forms/ManifestEditor'
import { INCOME_STATEMENT_MANIFEST } from '@/data/manifests/income-statement'

/**
 * Income Statement input page — Session 011 follow-up to the Balance
 * Sheet pilot. Structure mirrors `/input/balance-sheet` exactly: parent
 * owns hydration gate + HOME guard, child is the generic
 * `<ManifestEditor>` pointed at the IS manifest and slice.
 */
export default function InputIncomeStatementPage() {
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
      manifest={INCOME_STATEMENT_MANIFEST}
      tahunTransaksi={home.tahunTransaksi}
      yearCount={4}
      sliceSelector={(s) => s.incomeStatement}
      sliceSetter={(s) => s.setIncomeStatement}
      headerTitle="Input — Income Statement"
    />
  )
}

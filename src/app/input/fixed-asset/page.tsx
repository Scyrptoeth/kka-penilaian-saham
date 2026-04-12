'use client'

import Link from 'next/link'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { ManifestEditor } from '@/components/forms/ManifestEditor'
import { FIXED_ASSET_MANIFEST } from '@/data/manifests/fixed-asset'

/**
 * Fixed Asset input page — Session 012. Structure mirrors
 * `/input/balance-sheet` and `/input/income-statement`: parent owns
 * hydration gate + HOME guard, child is ManifestEditor with FA slice.
 *
 * Fixed Asset uses 3-year span (historicalYearCount: 3).
 */
export default function InputFixedAssetPage() {
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
      manifest={FIXED_ASSET_MANIFEST}
      tahunTransaksi={home.tahunTransaksi}
      yearCount={3}
      sliceSelector={(s) => s.fixedAsset}
      sliceSetter={(s) => s.setFixedAsset}
      headerTitle="Input — Fixed Asset"
    />
  )
}

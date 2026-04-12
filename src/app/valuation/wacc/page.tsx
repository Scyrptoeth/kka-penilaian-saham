'use client'

import { useCallback } from 'react'
import { useKkaStore, type WaccState } from '@/lib/store/useKkaStore'
import { WaccForm } from '@/components/forms/WaccForm'

export default function WaccPage() {
  const hasHydrated = useKkaStore(s => s._hasHydrated)
  const wacc = useKkaStore(s => s.wacc)
  const setWacc = useKkaStore(s => s.setWacc)

  const handleSave = useCallback(
    (state: WaccState) => setWacc(state),
    [setWacc],
  )

  if (!hasHydrated) {
    return (
      <div className="mx-auto max-w-[1100px] p-6 text-sm text-ink-muted">
        Memuat data WACC…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1100px] p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">
        WACC — Weighted Average Cost of Capital
      </h1>
      <p className="mb-6 text-sm text-ink-muted">
        Comparable companies approach. Masukkan data perusahaan pembanding dan parameter pasar.
      </p>
      <WaccForm initial={wacc} onSave={handleSave} />
    </div>
  )
}

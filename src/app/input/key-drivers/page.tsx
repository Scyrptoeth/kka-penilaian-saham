'use client'

import { useCallback } from 'react'
import { useKkaStore, type KeyDriversState } from '@/lib/store/useKkaStore'
import { KeyDriversForm } from '@/components/forms/KeyDriversForm'

export default function KeyDriversPage() {
  const hasHydrated = useKkaStore(s => s._hasHydrated)
  const home = useKkaStore(s => s.home)
  const keyDrivers = useKkaStore(s => s.keyDrivers)
  const setKeyDrivers = useKkaStore(s => s.setKeyDrivers)

  const handleSave = useCallback(
    (state: KeyDriversState) => setKeyDrivers(state),
    [setKeyDrivers],
  )

  if (!hasHydrated) {
    return (
      <div className="mx-auto max-w-[1200px] p-6 text-sm text-ink-muted">
        Memuat data…
      </div>
    )
  }

  if (!home) {
    return (
      <div className="mx-auto max-w-[1200px] p-6">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-ink">Key Drivers</h1>
        <div className="rounded border border-grid bg-canvas-raised px-4 py-6 text-center text-sm text-ink-muted">
          <p>Isi <strong>HOME</strong> terlebih dahulu untuk menentukan tahun proyeksi.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1200px] p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">
        Key Drivers — Asumsi Proyeksi
      </h1>
      <p className="mb-6 text-sm text-ink-muted">
        Asumsi-asumsi yang digunakan untuk proyeksi kinerja keuangan. Perubahan otomatis tersimpan.
      </p>
      <KeyDriversForm
        initial={keyDrivers}
        baseYear={home.tahunTransaksi}
        onSave={handleSave}
      />
    </div>
  )
}

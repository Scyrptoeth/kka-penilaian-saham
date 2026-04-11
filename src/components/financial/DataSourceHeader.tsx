'use client'

import { useKkaStore } from '@/lib/store/useKkaStore'

/**
 * Mode-aware header that sits above every financial sheet page.
 *
 * Why mode-aware: SheetPage saat ini me-render data dari seed fixture
 * (workbook prototipe — PT Raja Voltama Elektrik). Tabel di bawah header
 * ini TIDAK terhubung ke `home.namaPerusahaan` yang user isi di HOME
 * form. Menampilkan user's company name di header sambil tabel
 * menampilkan data perusahaan lain = misleading UX.
 *
 * Solusi: header berbeda per mode.
 *
 *   mode="seed" (current state untuk semua 9 financial pages)
 *     → Warning banner: "MODE DEMO — Workbook Prototipe"
 *     → Eksplisit menyatakan bahwa data tidak dari user
 *     → Tidak membaca / tidak menampilkan home.namaPerusahaan
 *
 *   mode="live" (Phase 3 onwards, saat input mode untuk financial data
 *               sudah diimplementasi)
 *     → Neutral header: "Penilaian Saham — {namaPerusahaan}"
 *     → Reads home.namaPerusahaan dari store
 *     → Ditampilkan saat tabel benar-benar berisi data user
 *
 * Phase 3 transition: saat live mode landed, SheetPage tinggal pass
 * `mode="live"` (atau detect via prop dari page-level), zero perubahan
 * di komponen ini. Ini adalah single switching point untuk eliminate
 * seed-mode warning sekaligus dari semua financial pages.
 */

interface DataSourceHeaderProps {
  /** Data source backing the page below this header. */
  mode: 'seed' | 'live'
}

export function DataSourceHeader({ mode }: DataSourceHeaderProps) {
  if (mode === 'seed') {
    return (
      <div
        role="status"
        aria-label="Mode demo — data prototipe"
        className="mb-4 border-l-4 border-accent bg-canvas-raised px-4 py-3"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
          Mode Demo · Workbook Prototipe
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
          Data pada halaman ini adalah angka contoh dari workbook prototipe
          (PT Raja Voltama Elektrik), dipakai untuk demonstrasi sistem.{' '}
          <strong className="text-ink">
            Data ini tidak terhubung ke HOME form Anda.
          </strong>{' '}
          Phase 3 akan menambahkan input mode sehingga halaman ini bisa
          menampilkan data perusahaan Anda sendiri.
        </p>
      </div>
    )
  }

  return <LiveCompanyHeader />
}

/**
 * Live-mode subcomponent — kept inline because the entire `live` branch
 * is a 5-line render and doesn't deserve a separate file. When the
 * Phase 3 input pipeline lands, this is where we'll show the user's
 * company name above each sheet.
 */
function LiveCompanyHeader() {
  const home = useKkaStore((s) => s.home)
  const hasHydrated = useKkaStore((s) => s._hasHydrated)

  const display: string = !hasHydrated
    ? 'memuat…'
    : home?.namaPerusahaan && home.namaPerusahaan.trim().length > 0
      ? home.namaPerusahaan
      : 'belum diisi (lengkapi HOME form)'

  return (
    <div className="mb-3 flex items-baseline gap-2 border-b border-grid pb-3 text-xs">
      <span className="font-semibold uppercase tracking-[0.16em] text-ink-muted">
        Penilaian Saham
      </span>
      <span
        className="font-mono text-ink"
        aria-live="polite"
        aria-label="Nama perusahaan yang sedang dinilai"
      >
        — {display}
      </span>
    </div>
  )
}

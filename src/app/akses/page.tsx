import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AksesForm } from './AksesForm'

export const metadata: Metadata = {
  title: 'Akses — KKA Penilaian Saham',
  robots: { index: false, follow: false },
}

export default function AksesPage() {
  return (
    <main className="min-h-dvh bg-canvas text-ink flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <header className="mb-10 text-center">
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-ink-muted mb-3">
            Akses Terbatas · Fungsional Penilai DJP
          </p>
          <h1 className="text-3xl font-semibold tracking-tight mb-2">KKA Penilaian Saham</h1>
          <p className="text-sm text-ink-soft leading-relaxed">
            Kertas Kerja Analisis Penilaian Bisnis/Saham
          </p>
        </header>

        <Suspense fallback={<div className="h-[220px]" aria-hidden />}>
          <AksesForm />
        </Suspense>

        <footer className="mt-10 text-center">
          <p className="text-[11px] text-ink-muted leading-relaxed">
            Seluruh kalkulasi dan data finansial disimpan 100% di browser Anda.
            <br />
            Tidak ada data finansial yang dikirim atau disimpan di server.
          </p>
        </footer>
      </div>
    </main>
  )
}

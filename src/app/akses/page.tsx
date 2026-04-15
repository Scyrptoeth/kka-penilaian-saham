import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AksesForm } from './AksesForm'

export const metadata: Metadata = {
  title: 'Akses — KKA Penilaian Bisnis II',
  robots: { index: false, follow: false },
}

export default function AksesPage() {
  return (
    <main className="min-h-dvh bg-canvas text-ink flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <header className="mb-10 text-center">
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-ink-muted mb-3">
            Akses Terbatas · Hanya untuk Fungsional Penilai
          </p>
          <h1 className="text-3xl font-semibold tracking-tight mb-2">KKA Penilaian Bisnis II</h1>
          <p className="text-sm text-ink-soft leading-relaxed">
            Aplikasi ini Dibuat dengan Prototipe dari "KKP Saham Irwan Djaja"
          </p>
        </header>

        <Suspense fallback={<div className="h-[220px]" aria-hidden />}>
          <AksesForm />
        </Suspense>

        <footer className="mt-10 text-center">
          <p className="text-[11px] text-ink-muted leading-relaxed">
            Seluruh Proses dan Data Hanya Berjalan dan Disimpan di Perangkat Anda.
            <br />
            Tidak Ada Data Apapun yang Dikirim atau Disimpan di Server.
          </p>
        </footer>
      </div>
    </main>
  )
}

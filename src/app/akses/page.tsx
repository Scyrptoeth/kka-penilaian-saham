'use client'

import { Suspense } from 'react'
import { AksesForm } from './AksesForm'
import { useT } from '@/lib/i18n/useT'

export default function AksesPage() {
  const { t } = useT()

  return (
    <main className="min-h-dvh bg-canvas text-ink flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <header className="mb-10 text-center">
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-ink-muted mb-3">
            {t('akses.restrictedAccess')}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight mb-2">{t('akses.title')}</h1>
          <p className="text-sm text-ink-soft leading-relaxed">
            {t('akses.subtitle')}
          </p>
        </header>

        <Suspense fallback={<div className="h-[220px]" aria-hidden />}>
          <AksesForm />
        </Suspense>

        <footer className="mt-10 text-center">
          <p className="text-[11px] text-ink-muted leading-relaxed">
            {t('akses.privacyLine1')}
            <br />
            {t('akses.privacyLine2')}
          </p>
        </footer>
      </div>
    </main>
  )
}

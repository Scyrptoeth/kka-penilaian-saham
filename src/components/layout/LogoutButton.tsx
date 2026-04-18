'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useT } from '@/lib/i18n/useT'

/**
 * Session 043 Task 1 — icon-dominant pill button with inverse hover.
 *
 * Default state: outlined pill (canvas bg, ink border, ink text).
 * Hover state: filled inverse (ink bg, canvas text) for strong signal.
 * Icon: person-with-arrow-right SVG + bilingual "LOG OUT" / "KELUAR".
 */
export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const { t } = useT()

  function handleLogout() {
    startTransition(async () => {
      try {
        await fetch('/api/akses/logout', { method: 'POST' })
      } finally {
        router.replace('/akses')
        router.refresh()
      }
    })
  }

  return (
    <div className="px-4 py-3">
      <button
        type="button"
        onClick={handleLogout}
        disabled={pending}
        className={
          className ??
          'group inline-flex w-full items-center justify-center gap-2 rounded-full border border-ink bg-canvas-raised px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink transition-colors hover:bg-ink hover:text-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1 disabled:opacity-50'
        }
        aria-label={t('logout.ariaLabel')}
      >
        <LogoutIcon className="h-4 w-4 shrink-0" />
        <span>{pending ? t('logout.pending') : t('logout.label')}</span>
      </button>
    </div>
  )
}

/** Person silhouette with right arrow — exit semantic. */
function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {/* Person head */}
      <circle cx="9" cy="7" r="3" />
      {/* Person body */}
      <path d="M3 21v-1.5A5.5 5.5 0 0 1 8.5 14h1A5.5 5.5 0 0 1 14 17" />
      {/* Arrow right */}
      <path d="M16 12h6" />
      <path d="m19 9 3 3-3 3" />
    </svg>
  )
}

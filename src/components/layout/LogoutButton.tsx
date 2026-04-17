'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useT } from '@/lib/i18n/useT'

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
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      className={
        className ??
        'w-full text-left px-4 py-3 text-xs font-mono uppercase tracking-[0.18em] text-ink-soft hover:bg-accent-soft hover:text-ink transition-colors disabled:opacity-50'
      }
      aria-label={t('logout.ariaLabel')}
    >
      {pending ? t('logout.pending') : t('logout.label')}
    </button>
  )
}

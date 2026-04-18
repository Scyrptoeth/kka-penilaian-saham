'use client'

import { ThemeToggle } from './ThemeToggle'
import { LanguageToggle } from './LanguageToggle'
import { useT } from '@/lib/i18n/useT'

/**
 * Top-of-sidebar brand + privacy badge + icon-pill toggles. Reused by both
 * desktop static sidebar and mobile drawer.
 *
 * Session 043 Task 1: toggles redesigned as pill switches with flag/icon
 * thumbs — far more visible than the previous text-only buttons. They now
 * sit side-by-side (row) beneath the privacy badge to form a compact
 * "control cluster" that users can't miss.
 */
export function SidebarHeader() {
  const { t } = useT()
  return (
    <div className="border-b border-grid bg-canvas-raised px-5 py-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
        {t('sidebar.brand.line1')}
      </p>
      <p className="mt-1 text-sm font-semibold text-ink">
        {t('sidebar.brand.line2')}
      </p>
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-sm bg-accent-soft px-2 py-1 text-[8px] font-medium text-ink">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
        {t('sidebar.privacyBadge')}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <ThemeToggle />
        <LanguageToggle />
      </div>
    </div>
  )
}

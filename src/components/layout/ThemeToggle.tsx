'use client'

import { useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import { useT } from '@/lib/i18n/useT'

/**
 * Session 043 Task 1 — icon-dominant pill toggle.
 *
 * Pill (56×28): sun icon left + moon icon right. A thumb circle slides
 * left↔right to indicate the active mode. Active icon sits on the thumb
 * (ink bg + canvas glyph = high contrast); inactive icon sits on the
 * track (ink-muted). No text label — the icons speak for themselves.
 *
 * SSR-safe via `useSyncExternalStore` mounted gate (LESSON-064) — avoids
 * React Compiler's `set-state-in-effect` violation.
 */
const subscribe = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

function useMounted(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot)
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useMounted()
  const { t } = useT()

  const isDark = mounted && resolvedTheme === 'dark'
  const next = isDark ? 'light' : 'dark'
  const ariaLabel = !mounted
    ? t('theme.ariaLoading')
    : isDark
      ? t('theme.ariaCurrentDark')
      : t('theme.ariaCurrentLight')

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={ariaLabel}
      aria-checked={isDark}
      role="switch"
      className="relative inline-flex h-7 w-14 shrink-0 items-center rounded-full border border-grid-strong bg-canvas-raised transition-colors hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1"
    >
      {/* Track icons */}
      <span className="pointer-events-none absolute inset-0 flex items-center justify-between px-1.5">
        <SunIcon className={`h-3.5 w-3.5 transition-colors ${isDark ? 'text-ink-muted' : 'text-canvas'}`} />
        <MoonIcon className={`h-3.5 w-3.5 transition-colors ${isDark ? 'text-canvas' : 'text-ink-muted'}`} />
      </span>
      {/* Sliding thumb */}
      <span
        aria-hidden
        className={`pointer-events-none absolute top-0.5 h-6 w-6 rounded-full bg-ink shadow-sm transition-transform ${
          isDark ? 'translate-x-[30px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

function SunIcon({ className }: { className?: string }) {
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
      <circle cx="12" cy="12" r="4" fill="currentColor" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  )
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

'use client'

import { useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'

/**
 * Theme toggle button — flips between light ↔ dark.
 *
 * Uses `useSyncExternalStore` to derive a stable mounted flag without the
 * `useState`+`useEffect` pattern that React Compiler's `set-state-in-effect`
 * lint rule rejects. Server snapshot returns `false`, client snapshot
 * returns `true` — safe across SSR/CSR boundary.
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

  const isDark = mounted && resolvedTheme === 'dark'
  const next = isDark ? 'light' : 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={mounted ? `Aktifkan tema ${next === 'dark' ? 'gelap' : 'terang'}` : 'Tema'}
      title={mounted ? `Tema: ${isDark ? 'gelap' : 'terang'} — klik untuk ${next === 'dark' ? 'gelap' : 'terang'}` : 'Tema'}
      className="flex w-full items-center gap-3 px-5 py-3 text-left text-sm font-medium text-ink-muted transition-colors hover:bg-accent-soft hover:text-ink focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none"
    >
      <span
        aria-hidden
        className="inline-flex h-5 w-5 items-center justify-center"
      >
        {/* Render a placeholder svg until mounted to keep layout stable */}
        {!mounted ? <PlaceholderIcon /> : isDark ? <SunIcon /> : <MoonIcon />}
      </span>
      <span className="flex-1">{!mounted ? 'Tema' : isDark ? 'Mode Terang' : 'Mode Gelap'}</span>
    </button>
  )
}

function MoonIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7Z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="8" r="3" />
      <line x1="8" y1="1.5" x2="8" y2="3" />
      <line x1="8" y1="13" x2="8" y2="14.5" />
      <line x1="1.5" y1="8" x2="3" y2="8" />
      <line x1="13" y1="8" x2="14.5" y2="8" />
      <line x1="3.4" y1="3.4" x2="4.5" y2="4.5" />
      <line x1="11.5" y1="11.5" x2="12.6" y2="12.6" />
      <line x1="3.4" y1="12.6" x2="4.5" y2="11.5" />
      <line x1="11.5" y1="4.5" x2="12.6" y2="3.4" />
    </svg>
  )
}

function PlaceholderIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <circle cx="8" cy="8" r="3" />
    </svg>
  )
}

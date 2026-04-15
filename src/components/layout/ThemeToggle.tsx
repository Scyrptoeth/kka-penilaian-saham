'use client'

import { useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'

/**
 * Theme toggle pill — matches the "Seluruh Proses Berjalan di Perangkat
 * Anda" privacy badge styling (pill, dot indicator, 8px font-medium,
 * accent-soft background, ink-strong text). Single click flips between
 * light ↔ dark; label reflects the CURRENT mode.
 *
 * SSR-safe via `useSyncExternalStore` mounted gate (LESSON-064) — avoids
 * `useState+useEffect` pattern rejected by React Compiler's
 * `set-state-in-effect` rule.
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
  // Label reflects the CURRENT active mode (parallel to the privacy badge
  // which states a current state, not an action). On click, mode flips.
  const label = !mounted ? 'Mode Tampilan' : isDark ? 'Klik untuk Ganti ke Dark Mode' : 'Klik untuk Ganti ke Light Mode'
  const ariaLabel = !mounted
    ? 'Tema'
    : `Tema saat ini: ${isDark ? 'gelap' : 'terang'}. Klik untuk ganti ke ${next === 'dark' ? 'gelap' : 'terang'}.`

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1.5 rounded-sm bg-accent-soft px-2 py-1 text-[8px] font-medium text-neutral-600 dark:text-neutral-400 transition-colors hover:bg-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1"
    >
      <GlobeIcon />
      {label}
    </button>
  )
}

function GlobeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="10"
      height="10"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

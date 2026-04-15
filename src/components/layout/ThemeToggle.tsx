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
      className="inline-flex items-center gap-1.5 rounded-sm bg-accent-soft px-2 py-1 text-[10px] font-medium text-ink transition-colors hover:bg-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
      {label}
    </button>
  )
}

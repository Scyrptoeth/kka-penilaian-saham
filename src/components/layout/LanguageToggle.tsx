'use client'

import { useSyncExternalStore } from 'react'
import { useKkaStore } from '@/lib/store/useKkaStore'

/**
 * Language toggle pill — EN ↔ ID. Positioned below ThemeToggle in
 * SidebarHeader. Controls `balanceSheet.language` which propagates
 * to all dynamic catalog pages (BS, IS, FA editors, AAM display).
 *
 * SSR-safe via `useSyncExternalStore` mounted gate (LESSON-064).
 */
const subscribe = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

function useMounted(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot)
}

export function LanguageToggle() {
  const mounted = useMounted()
  const language = useKkaStore(s => s.balanceSheet?.language ?? 'id')
  const setGlobalLanguage = useKkaStore(s => s.setGlobalLanguage)

  const isEn = mounted && language === 'en'
  const next = isEn ? 'id' : 'en'
  const label = !mounted
    ? 'Bahasa'
    : isEn
      ? 'EN — Klik untuk Bahasa Indonesia'
      : 'ID — Klik untuk English'
  const ariaLabel = !mounted
    ? 'Bahasa'
    : `Bahasa saat ini: ${isEn ? 'English' : 'Indonesia'}. Klik untuk ganti ke ${next === 'en' ? 'English' : 'Indonesia'}.`

  return (
    <button
      type="button"
      onClick={() => setGlobalLanguage(next)}
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1.5 rounded-sm bg-accent-soft px-2 py-1 text-[8px] font-medium text-neutral-600 dark:text-neutral-400 transition-colors hover:bg-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1"
    >
      <LanguageIcon />
      {label}
    </button>
  )
}

function LanguageIcon() {
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
      <path d="m5 8 6 6" />
      <path d="m4 14 6-6 2-3" />
      <path d="M2 5h12" />
      <path d="M7 2h1" />
      <path d="m22 22-5-10-5 10" />
      <path d="M14 18h6" />
    </svg>
  )
}

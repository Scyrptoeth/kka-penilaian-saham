'use client'

import { useSyncExternalStore } from 'react'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { useT } from '@/lib/i18n/useT'

/**
 * Session 043 Task 1 — icon-dominant pill toggle with flag thumb.
 *
 * Pill (56×28) with a thumb circle that slides left↔right. The thumb
 * renders the ACTIVE language's flag (UK for EN, Indonesia for ID).
 * The track shows muted "EN" / "ID" text flanks. No long verbal label —
 * inline SVG flags remain consistent across platforms (emoji flags are
 * broken on Windows + Chrome Linux).
 */
const subscribe = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

function useMounted(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot)
}

export function LanguageToggle() {
  const mounted = useMounted()
  const language = useKkaStore(s => s.language)
  const setGlobalLanguage = useKkaStore(s => s.setGlobalLanguage)
  const { t } = useT()

  const isEn = mounted && language === 'en'
  const next = isEn ? 'id' : 'en'
  const ariaLabel = !mounted
    ? t('lang.ariaLoading')
    : isEn
      ? t('lang.ariaCurrentEn')
      : t('lang.ariaCurrentId')

  return (
    <button
      type="button"
      onClick={() => setGlobalLanguage(next)}
      aria-label={ariaLabel}
      aria-checked={!isEn}
      role="switch"
      className="relative inline-flex h-7 w-14 shrink-0 items-center rounded-full border border-grid-strong bg-canvas-raised transition-colors hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1"
    >
      {/* Track labels */}
      <span className="pointer-events-none absolute inset-0 flex items-center justify-between px-1.5 text-[9px] font-semibold tracking-wide">
        <span className={isEn ? 'text-canvas' : 'text-ink-muted'}>EN</span>
        <span className={isEn ? 'text-ink-muted' : 'text-canvas'}>ID</span>
      </span>
      {/* Sliding thumb with flag */}
      <span
        aria-hidden
        className={`pointer-events-none absolute top-0.5 flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-canvas-raised shadow-sm transition-transform ${
          isEn ? 'translate-x-0.5' : 'translate-x-[30px]'
        }`}
      >
        {isEn ? <UkFlag /> : <IdFlag />}
      </span>
    </button>
  )
}

/** UK Union Jack — simplified, circular-friendly rendering at ~24px. */
function UkFlag() {
  return (
    <svg viewBox="0 0 60 60" aria-hidden className="h-full w-full">
      <clipPath id="uk-clip">
        <circle cx="30" cy="30" r="30" />
      </clipPath>
      <g clipPath="url(#uk-clip)">
        <rect width="60" height="60" fill="#012169" />
        {/* White diagonals */}
        <path d="M0 0L60 60M60 0L0 60" stroke="#fff" strokeWidth="8" />
        {/* Red diagonals */}
        <path d="M0 0L60 60" stroke="#C8102E" strokeWidth="4" />
        <path d="M60 0L0 60" stroke="#C8102E" strokeWidth="4" />
        {/* White cross */}
        <path d="M30 0V60M0 30H60" stroke="#fff" strokeWidth="12" />
        {/* Red cross */}
        <path d="M30 0V60M0 30H60" stroke="#C8102E" strokeWidth="6" />
      </g>
      <circle cx="30" cy="30" r="29.5" fill="none" stroke="rgba(10,10,12,0.12)" strokeWidth="1" />
    </svg>
  )
}

/** Indonesia flag — red top, white bottom. Circular mask. */
function IdFlag() {
  return (
    <svg viewBox="0 0 60 60" aria-hidden className="h-full w-full">
      <clipPath id="id-clip">
        <circle cx="30" cy="30" r="30" />
      </clipPath>
      <g clipPath="url(#id-clip)">
        <rect width="60" height="30" fill="#CE1126" />
        <rect y="30" width="60" height="30" fill="#ffffff" />
      </g>
      <circle cx="30" cy="30" r="29.5" fill="none" stroke="rgba(10,10,12,0.12)" strokeWidth="1" />
    </svg>
  )
}

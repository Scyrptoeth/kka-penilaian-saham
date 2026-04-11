'use client'

import { useKkaStore } from '@/lib/store/useKkaStore'

/**
 * Tiny client island that prepends "Penilaian Saham — {namaPerusahaan}"
 * above every financial sheet page.
 *
 * Why a client component:
 *   - Manifests are pure data and live company-agnostic (LESSON-019,
 *     LESSON-029): they MUST NOT hardcode any specific company name.
 *   - The actual company name is a runtime property of the user's case,
 *     stored in Zustand `home.namaPerusahaan` (filled via HOME form).
 *   - Server Components cannot subscribe to Zustand. The cleanest split
 *     is: server renders the table itself + manifest title; this small
 *     client island renders only the company prefix line above it.
 *
 * Hydration safety: until the persist middleware finishes loading
 * localStorage, render a neutral placeholder so the SSR HTML and the
 * first client paint match.
 *
 * SEO impact: the prerendered HTML contains the placeholder, not the
 * actual company name. Acceptable because (a) this is a private DJP
 * tool, not public-facing, and (b) the user's case is privacy-first
 * and should NEVER appear in indexed HTML.
 */
export function CompanyContextHeader() {
  const home = useKkaStore((s) => s.home)
  const hasHydrated = useKkaStore((s) => s._hasHydrated)

  const display: string = !hasHydrated
    ? '— memuat…'
    : home?.namaPerusahaan && home.namaPerusahaan.trim().length > 0
      ? `— ${home.namaPerusahaan}`
      : '— belum diisi (lengkapi HOME form)'

  return (
    <div className="mb-3 flex items-baseline gap-2 border-b border-grid pb-3 text-xs">
      <span className="font-semibold uppercase tracking-[0.16em] text-ink-muted">
        Penilaian Saham
      </span>
      <span
        className="font-mono text-ink"
        aria-live="polite"
        aria-label="Nama perusahaan yang sedang dinilai"
      >
        {display}
      </span>
    </div>
  )
}

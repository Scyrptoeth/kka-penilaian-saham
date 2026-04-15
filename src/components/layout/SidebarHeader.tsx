import { ThemeToggle } from './ThemeToggle'

/**
 * Top-of-sidebar brand + privacy badge + theme toggle. Reused by both
 * desktop static sidebar and mobile drawer.
 *
 * Theme toggle sits parallel below the privacy badge — adopts the same
 * pill styling (column, bg-accent-soft, dot indicator, 8px font-medium,
 * text-ink) so the two read as a coherent badge stack. text-ink is the
 * tegas/strong color (B&W high contrast) so users notice the toggle.
 */
export function SidebarHeader() {
  return (
    <div className="border-b border-grid bg-canvas-raised px-5 py-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
        KKA Penilaian
      </p>
      <p className="mt-1 text-sm font-semibold text-ink">
        Bisnis II
      </p>
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-sm bg-accent-soft px-2 py-1 text-[8px] font-medium text-ink">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
        Seluruh Proses Berjalan di Perangkat Anda
      </div>
      <div className="mt-2">
        <ThemeToggle />
      </div>
    </div>
  )
}

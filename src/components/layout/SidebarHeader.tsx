/**
 * Top-of-sidebar brand + privacy badge. Pure server component, reused by
 * both desktop static sidebar and mobile drawer.
 */
export function SidebarHeader() {
  return (
    <div className="border-b border-grid bg-canvas-raised px-5 py-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
        KKA Penilaian Saham
      </p>
      <p className="mt-1 text-sm font-semibold text-ink">
        Direktorat Jenderal Pajak
      </p>
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-sm bg-accent-soft px-2 py-1 text-[10px] font-medium text-ink">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
        Privasi 100% lokal
      </div>
    </div>
  )
}

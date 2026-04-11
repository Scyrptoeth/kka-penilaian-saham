interface PlaceholderProps {
  area: string
  title: string
  description: string
}

export function Placeholder({ area, title, description }: PlaceholderProps) {
  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
        {area}
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">{title}</h1>
      <div className="mt-6 rounded-sm border border-dashed border-grid-strong bg-canvas-raised p-8">
        <p className="text-sm text-ink-soft">{description}</p>
        <p className="mt-3 text-xs text-ink-muted">
          Halaman ini akan diimplementasikan di sesi pengembangan berikutnya.
        </p>
      </div>
    </div>
  )
}

import Link from 'next/link'

interface RequiredInput {
  label: string
  href: string
  filled: boolean
}

interface AnalysisEmptyStateProps {
  title: string
  inputs: RequiredInput[]
}

/**
 * Empty state for ANALISIS pages when required INPUT DATA is incomplete.
 * Shows which inputs are needed + direct links to fill them.
 */
export function AnalysisEmptyState({ title, inputs }: AnalysisEmptyStateProps) {
  const missing = inputs.filter((i) => !i.filled)

  return (
    <div className="mx-auto max-w-3xl p-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
        Analisis
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
        {title}
      </h1>
      <div className="mt-6 rounded-sm border border-grid bg-canvas-raised p-6">
        <p className="text-sm text-ink-soft">
          Halaman ini membutuhkan data dari bagian <strong>Input Data</strong>.
          Lengkapi input berikut untuk melihat hasil analisis:
        </p>
        <ul className="mt-4 space-y-2">
          {inputs.map((input) => (
            <li key={input.href} className="flex items-center gap-3">
              <span className={input.filled ? 'text-positive' : 'text-ink-muted'}>
                {input.filled ? '✓' : '○'}
              </span>
              <Link
                href={input.href}
                className={
                  input.filled
                    ? 'text-sm text-ink-soft line-through'
                    : 'text-sm font-medium text-accent underline-offset-2 hover:underline'
                }
              >
                {input.label}
              </Link>
              {input.filled && (
                <span className="text-[11px] text-positive">Terisi</span>
              )}
            </li>
          ))}
        </ul>
        {missing.length > 0 && (
          <div className="mt-5">
            <Link
              href={missing[0].href}
              className="inline-flex items-center gap-2 rounded-sm bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-accent/90"
            >
              Lengkapi {missing[0].label}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

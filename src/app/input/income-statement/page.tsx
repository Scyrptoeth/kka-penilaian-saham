'use client'

import { useKkaStore } from '@/lib/store/useKkaStore'
import DynamicIsEditor from '@/components/forms/DynamicIsEditor'
import { PageEmptyState } from '@/components/shared/PageEmptyState'

/**
 * Income Statement input page — dynamic catalog-driven editor (Session 019).
 *
 * Parent owns hydration gate + HOME guard (LESSON-034). Child mounts
 * only after gates pass so useState initializers see hydrated store.
 */
export default function InputIncomeStatementPage() {
  const home = useKkaStore((s) => s.home)
  const hasHydrated = useKkaStore((s) => s._hasHydrated)

  if (!hasHydrated) {
    return (
      <div className="mx-auto max-w-[1400px]">
        <p className="text-sm text-ink-muted">Memuat…</p>
      </div>
    )
  }

  if (!home) {
    return (
      <PageEmptyState
        section="INPUT DATA"
        title="Income Statement"
        inputs={[{ label: 'HOME', href: '/', filled: false }]}
      />
    )
  }

  return <DynamicIsEditor />
}

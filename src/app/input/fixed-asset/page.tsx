'use client'

import { useKkaStore } from '@/lib/store/useKkaStore'
import DynamicFaEditor from '@/components/forms/DynamicFaEditor'
import { PageEmptyState } from '@/components/shared/PageEmptyState'

/**
 * Fixed Asset input page — dynamic catalog-driven editor (Session 019).
 *
 * Parent owns hydration gate + HOME guard (LESSON-034). Child mounts
 * only after gates pass so useState initializers see hydrated store.
 */
export default function InputFixedAssetPage() {
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
        title="Fixed Asset"
        inputs={[{ label: 'HOME', href: '/', filled: false }]}
      />
    )
  }

  return <DynamicFaEditor />
}

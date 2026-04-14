'use client'

import { useKkaStore } from '@/lib/store/useKkaStore'
import DynamicBsEditor from '@/components/forms/DynamicBsEditor'
import { PageEmptyState } from '@/components/shared/PageEmptyState'

/**
 * Balance Sheet input page — dynamic accounts, bilingual labels,
 * dynamic year columns (Session 020).
 *
 * Parent owns the hydration gate and HOME guard; DynamicBsEditor
 * handles all state management, account selection, and rendering.
 */
export default function InputBalanceSheetPage() {
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
        title="Balance Sheet"
        inputs={[{ label: 'HOME', href: '/', filled: false }]}
      />
    )
  }

  return <DynamicBsEditor />
}

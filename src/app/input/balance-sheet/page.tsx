'use client'

import { useKkaStore } from '@/lib/store/useKkaStore'
import DynamicBsEditor from '@/components/forms/DynamicBsEditor'
import { PageEmptyState } from '@/components/shared/PageEmptyState'
import { useT } from '@/lib/i18n/useT'

/**
 * Balance Sheet input page — dynamic accounts, bilingual labels,
 * dynamic year columns (Session 020).
 *
 * Parent owns the hydration gate and HOME guard; DynamicBsEditor
 * handles all state management, account selection, and rendering.
 */
export default function InputBalanceSheetPage() {
  const { t } = useT()
  const home = useKkaStore((s) => s.home)
  const hasHydrated = useKkaStore((s) => s._hasHydrated)

  if (!hasHydrated) {
    return (
      <div className="mx-auto max-w-[1400px]">
        <p className="text-sm text-ink-muted">{t('common.loading')}</p>
      </div>
    )
  }

  if (!home) {
    return (
      <PageEmptyState
        section={t('nav.group.inputData')}
        title={t('nav.item.balanceSheet')}
        inputs={[{ label: 'HOME', href: '/', filled: false }]}
      />
    )
  }

  return <DynamicBsEditor />
}

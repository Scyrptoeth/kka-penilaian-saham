'use client'

import { useKkaStore } from '@/lib/store/useKkaStore'
import DynamicIsEditor from '@/components/forms/DynamicIsEditor'
import { PageEmptyState } from '@/components/shared/PageEmptyState'
import { useT } from '@/lib/i18n/useT'

/**
 * Income Statement input page — dynamic catalog-driven editor (Session 019).
 *
 * Parent owns hydration gate + HOME guard (LESSON-034). Child mounts
 * only after gates pass so useState initializers see hydrated store.
 */
export default function InputIncomeStatementPage() {
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
        title={t('nav.item.incomeStatement')}
        inputs={[{ label: 'HOME', href: '/', filled: false }]}
      />
    )
  }

  return <DynamicIsEditor />
}

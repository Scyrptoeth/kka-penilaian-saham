'use client'

import { useKkaStore } from '@/lib/store/useKkaStore'
import GrowthRevenueEditor from '@/components/forms/GrowthRevenueEditor'
import { PageEmptyState } from '@/components/shared/PageEmptyState'
import { useT } from '@/lib/i18n/useT'

/**
 * Growth Revenue page. Session 054 moves it to INPUT DATA because
 * rows 40+41 (Industri benchmarks) are user input. Derived rows 8+9
 * stay read-only mirrors of IS row 6 + row 35.
 *
 * Route moves to /input/growth-revenue in Task 5. The file stays here
 * only briefly until `git mv` in that task.
 */
export default function GrowthRevenuePage() {
  const { t } = useT()
  const home = useKkaStore((s) => s.home)
  const incomeStatement = useKkaStore((s) => s.incomeStatement)
  const hasHydrated = useKkaStore((s) => s._hasHydrated)

  if (!hasHydrated) {
    return (
      <div className="mx-auto max-w-[1400px]">
        <p className="text-sm text-ink-muted">{t('common.loading')}</p>
      </div>
    )
  }

  if (!home || !incomeStatement) {
    return (
      <PageEmptyState
        section={t('nav.group.inputData')}
        title={t('nav.item.growthRevenue')}
        inputs={[
          { label: 'HOME', href: '/', filled: !!home },
          { label: 'Income Statement', href: '/input/income-statement', filled: !!incomeStatement },
        ]}
      />
    )
  }

  return <GrowthRevenueEditor />
}

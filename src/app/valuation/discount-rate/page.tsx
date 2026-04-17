'use client'

import { useCallback } from 'react'
import { useKkaStore, type DiscountRateState } from '@/lib/store/useKkaStore'
import { useT } from '@/lib/i18n/useT'
import { DiscountRateForm } from '@/components/forms/DiscountRateForm'

export default function DiscountRatePage() {
  const { t } = useT()
  const hasHydrated = useKkaStore(s => s._hasHydrated)
  const discountRate = useKkaStore(s => s.discountRate)
  const setDiscountRate = useKkaStore(s => s.setDiscountRate)

  const handleSave = useCallback(
    (state: DiscountRateState) => setDiscountRate(state),
    [setDiscountRate],
  )

  if (!hasHydrated) {
    return (
      <div className="mx-auto max-w-[1100px] p-6 text-sm text-ink-muted">
        {t('discountRate.loading')}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1100px] p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">
        {t('discountRate.pageTitle')}
      </h1>
      <p className="mb-6 text-sm text-ink-muted">
        {t('discountRate.subtitle')}
      </p>
      <DiscountRateForm initial={discountRate} onSave={handleSave} />
    </div>
  )
}

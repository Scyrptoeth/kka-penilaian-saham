'use client'

import { useCallback } from 'react'
import { useKkaStore, type WaccState } from '@/lib/store/useKkaStore'
import { useT } from '@/lib/i18n/useT'
import { WaccForm } from '@/components/forms/WaccForm'

export default function WaccPage() {
  const { t } = useT()
  const hasHydrated = useKkaStore(s => s._hasHydrated)
  const wacc = useKkaStore(s => s.wacc)
  const setWacc = useKkaStore(s => s.setWacc)

  const handleSave = useCallback(
    (state: WaccState) => setWacc(state),
    [setWacc],
  )

  if (!hasHydrated) {
    return (
      <div className="mx-auto max-w-[1100px] p-6 text-sm text-ink-muted">
        {t('wacc.loading')}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1100px] p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">
        {t('wacc.pageTitle')}
      </h1>
      <p className="mb-6 text-sm text-ink-muted">
        {t('wacc.subtitle')}
      </p>
      <WaccForm initial={wacc} onSave={handleSave} />
    </div>
  )
}

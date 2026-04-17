'use client'

import { useCallback, useMemo } from 'react'
import { useKkaStore, type KeyDriversState } from '@/lib/store/useKkaStore'
import { KeyDriversForm } from '@/components/forms/KeyDriversForm'
import { PageEmptyState } from '@/components/shared/PageEmptyState'
import { useT } from '@/lib/i18n/useT'

export default function KeyDriversPage() {
  const { t } = useT()
  const hasHydrated = useKkaStore(s => s._hasHydrated)
  const home = useKkaStore(s => s.home)
  const keyDrivers = useKkaStore(s => s.keyDrivers)
  const setKeyDrivers = useKkaStore(s => s.setKeyDrivers)
  const incomeStatement = useKkaStore(s => s.incomeStatement)

  const handleSave = useCallback(
    (state: KeyDriversState) => setKeyDrivers(state),
    [setKeyDrivers],
  )

  // Auto-compute ratios from IS data for the last historical year
  const isAutoRatios = useMemo(() => {
    if (!home || !incomeStatement?.rows) return null
    const lastYear = home.tahunTransaksi - 1
    const isRows = incomeStatement.rows
    const revenue = isRows[6]?.[lastYear] ?? 0
    if (revenue === 0) return null
    // COGS ratio: |COGS / Revenue| (COGS is negative in store)
    const cogsRatio = Math.abs((isRows[7]?.[lastYear] ?? 0) / revenue)
    // Total OpEx ratio: |Total OpEx / Revenue| (OpEx is negative)
    const opexTotal = isRows[15]?.[lastYear] ?? 0
    const opexRatio = Math.abs(opexTotal / revenue)
    // Tax rate: |Tax / PBT|
    const pbt = isRows[32]?.[lastYear] ?? 0
    const taxRate = pbt !== 0 ? Math.abs((isRows[33]?.[lastYear] ?? 0) / pbt) : 0.22
    return { cogsRatio, opexRatio, taxRate }
  }, [home, incomeStatement])

  if (!hasHydrated) {
    return (
      <div className="mx-auto max-w-[1200px] p-6 text-sm text-ink-muted">
        {t('common.loadingData')}
      </div>
    )
  }

  if (!home) {
    return (
      <PageEmptyState
        section="INPUT DATA"
        title="Key Drivers"
        inputs={[
          { label: 'HOME', href: '/', filled: !!home },
        ]}
      />
    )
  }

  return (
    <div className="mx-auto max-w-[1200px] p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">
        {t('keyDrivers.pageTitle')}
      </h1>
      <p className="mb-6 text-sm text-ink-muted">
        {t('keyDrivers.subtitle')}
      </p>
      <KeyDriversForm
        initial={keyDrivers}
        baseYear={home.tahunTransaksi}
        onSave={handleSave}
        isAutoRatios={isAutoRatios}
      />
    </div>
  )
}

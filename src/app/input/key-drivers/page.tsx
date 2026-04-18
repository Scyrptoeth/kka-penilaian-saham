'use client'

import { useCallback, useMemo } from 'react'
import { useKkaStore, type KeyDriversState } from '@/lib/store/useKkaStore'
import { KeyDriversForm } from '@/components/forms/KeyDriversForm'
import { PageEmptyState } from '@/components/shared/PageEmptyState'
import { useT } from '@/lib/i18n/useT'
import { buildKdAutoValues } from '@/lib/calculations/kd-auto-values'
import {
  computeHistoricalYears,
  computeProjectionYears,
} from '@/lib/calculations/year-helpers'

/** KD Additional Capex horizon (matches NUM_PROJECTION_YEARS in KeyDriversForm). */
const KD_PROJECTION_YEAR_COUNT = 7

export default function KeyDriversPage() {
  const { t } = useT()
  const hasHydrated = useKkaStore(s => s._hasHydrated)
  const home = useKkaStore(s => s.home)
  const keyDrivers = useKkaStore(s => s.keyDrivers)
  const setKeyDrivers = useKkaStore(s => s.setKeyDrivers)
  const incomeStatement = useKkaStore(s => s.incomeStatement)
  const fixedAsset = useKkaStore(s => s.fixedAsset)
  const language = useKkaStore(s => s.language)

  const handleSave = useCallback(
    (state: KeyDriversState) => setKeyDrivers(state),
    [setKeyDrivers],
  )

  // Session 050 — unified auto values for Cost & Expense Ratios + Additional
  // Capex. Derived from IS average common size + Proy FA 7-year projection.
  // Mirror pattern (LESSON-115): store reflects these values via KeyDriversForm
  // useEffect, allowing export path (KeyDriversBuilder) to remain unchanged.
  const kdAuto = useMemo(() => {
    if (!home || !incomeStatement || !fixedAsset) return null
    const isHistYears = computeHistoricalYears(
      home.tahunTransaksi,
      incomeStatement.yearCount,
    )
    const faHistYears = computeHistoricalYears(
      home.tahunTransaksi,
      fixedAsset.yearCount,
    )
    const projYears = computeProjectionYears(
      home.tahunTransaksi,
      KD_PROJECTION_YEAR_COUNT,
    )
    return buildKdAutoValues({
      isRows: incomeStatement.rows,
      isHistYears,
      faAccounts: fixedAsset.accounts,
      faRows: fixedAsset.rows,
      faHistYears,
      projYears,
    })
  }, [home, incomeStatement, fixedAsset])

  // Auto-derived tax rate from IS (retained for corporate tax rate seed —
  // kept here rather than inside buildKdAutoValues because tax rate is a
  // Financial Driver and uses a different derivation base: |Tax / PBT|).
  const isAutoTaxRate = useMemo(() => {
    if (!home || !incomeStatement?.rows) return null
    const lastYear = home.tahunTransaksi - 1
    const isRows = incomeStatement.rows
    const pbt = isRows[32]?.[lastYear] ?? 0
    const taxRate = pbt !== 0 ? Math.abs((isRows[33]?.[lastYear] ?? 0) / pbt) : 0.22
    return { taxRate }
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
        section={t('nav.group.inputData')}
        title={t('nav.item.keyDrivers')}
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
        kdAuto={kdAuto}
        isAutoTaxRate={isAutoTaxRate}
        faAccounts={fixedAsset?.accounts ?? []}
        faAccountLanguage={language}
      />
    </div>
  )
}

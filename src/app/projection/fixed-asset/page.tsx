'use client'

import { useMemo } from 'react'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { useT } from '@/lib/i18n/useT'
import type { TranslationKey } from '@/lib/i18n/translations'
import { computeHistoricalYears, computeProjectionYears } from '@/lib/calculations/year-helpers'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { FIXED_ASSET_MANIFEST } from '@/data/manifests/fixed-asset'
import { computeProyFixedAssetsLive } from '@/data/live/compute-proy-fixed-assets-live'
import { formatIdr } from '@/components/financial/format'
import { PageEmptyState } from '@/components/shared/PageEmptyState'

/** Simplified row labels for PROY FA display. */
const SECTIONS: { titleKey: TranslationKey; groups: { labelKey: TranslationKey | ''; rows: number[]; total: number }[] }[] = [
  {
    titleKey: 'proyFA.acquisitionCost',
    groups: [
      { labelKey: 'proyFA.beginning', rows: [8, 9, 10, 11, 12, 13], total: 14 },
      { labelKey: 'proyFA.additions', rows: [17, 18, 19, 20, 21, 22], total: 23 },
      { labelKey: 'proyFA.ending', rows: [26, 27, 28, 29, 30, 31], total: 32 },
    ],
  },
  {
    titleKey: 'proyFA.accDepreciation',
    groups: [
      { labelKey: 'proyFA.beginning', rows: [36, 37, 38, 39, 40, 41], total: 42 },
      { labelKey: 'proyFA.additions', rows: [45, 46, 47, 48, 49, 50], total: 51 },
      { labelKey: 'proyFA.ending', rows: [54, 55, 56, 57, 58, 59], total: 60 },
    ],
  },
  {
    titleKey: 'proyFA.netValue',
    groups: [
      { labelKey: '', rows: [63, 64, 65, 66, 67, 68], total: 69 },
    ],
  },
]

const CATEGORY_LABEL_KEYS: TranslationKey[] = [
  'proyFA.category.land',
  'proyFA.category.building',
  'proyFA.category.equipment',
  'proyFA.category.vehicle',
  'proyFA.category.office',
  'proyFA.category.electrical',
]

export default function ProyFixedAssetPage() {
  const { t } = useT()
  const home = useKkaStore(s => s.home)
  const fixedAsset = useKkaStore(s => s.fixedAsset)
  const hasHydrated = useKkaStore(s => s._hasHydrated)

  const data = useMemo(() => {
    if (!hasHydrated || !home || !fixedAsset) return null
    const faYears = computeHistoricalYears(home.tahunTransaksi, 3)
    const projYears = computeProjectionYears(home.tahunTransaksi)
    const lastHistYear = faYears[faYears.length - 1]

    // Get FA computed rows for ending values
    const faComp = deriveComputedRows(FIXED_ASSET_MANIFEST.rows, fixedAsset.rows, faYears)
    const allFa = { ...fixedAsset.rows, ...faComp }

    const rows = computeProyFixedAssetsLive(allFa, faYears, projYears)
    return { rows, years: [lastHistYear, ...projYears] }
  }, [hasHydrated, home, fixedAsset])

  if (!hasHydrated) {
    return <div className="mx-auto max-w-[1100px] p-6 text-sm text-ink-muted">{t('common.loadingData')}</div>
  }

  if (!data) {
    return (
      <PageEmptyState
        section={t('common.projection')}
        title={t('proyFA.title')}
        inputs={[
          { label: 'HOME', href: '/', filled: !!home },
          { label: 'Fixed Asset', href: '/input/fixed-asset', filled: !!fixedAsset },
        ]}
      />
    )
  }

  const { rows, years } = data

  return (
    <div className="mx-auto max-w-[1100px] p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">{t('proyFA.title')}</h1>
      <p className="mb-6 text-sm text-ink-muted">
        {t('proyFA.subtitle')}
      </p>

      <div className="overflow-x-auto">
        {SECTIONS.map(section => (
          <div key={section.titleKey} className="mb-6">
            <h2 className="mb-2 text-base font-semibold text-ink">{t(section.titleKey)}</h2>
            {section.groups.map(group => (
              <table key={group.labelKey || 'net'} className="mb-3 w-full border-collapse text-sm">
                {group.labelKey && (
                  <thead>
                    <tr className="border-b border-grid">
                      <th className="px-2 py-1 text-left text-ink-muted">{t(group.labelKey as TranslationKey)}</th>
                      {years.map(y => (
                        <th key={y} className="px-2 py-1 text-right font-mono text-ink-muted tabular-nums">{y}</th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {group.rows.map((row, i) => (
                    <tr key={row} className="border-b border-grid">
                      <td className="px-2 py-1 text-ink">{t(CATEGORY_LABEL_KEYS[i])}</td>
                      {years.map(y => {
                        const v = rows[row]?.[y] ?? 0
                        return (
                          <td key={y} className={`px-2 py-1 text-right font-mono tabular-nums ${v < 0 ? 'text-negative' : ''}`}>
                            {formatIdr(v)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  <tr className="border-t-2 border-grid-strong bg-canvas-raised font-semibold">
                    <td className="px-2 py-1.5 text-ink">{t('common.total')}</td>
                    {years.map(y => {
                      const v = rows[group.total]?.[y] ?? 0
                      return (
                        <td key={y} className={`px-2 py-1.5 text-right font-mono tabular-nums ${v < 0 ? 'text-negative' : ''}`}>
                          {formatIdr(v)}
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

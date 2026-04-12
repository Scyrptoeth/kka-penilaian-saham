'use client'

import { useMemo } from 'react'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { computeHistoricalYears, computeProjectionYears } from '@/lib/calculations/year-helpers'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { FIXED_ASSET_MANIFEST } from '@/data/manifests/fixed-asset'
import { computeProyFixedAssetsLive } from '@/data/live/compute-proy-fixed-assets-live'
import { formatIdr } from '@/components/financial/format'

/** Simplified row labels for PROY FA display. */
const SECTIONS = [
  {
    title: 'Acquisition Cost',
    groups: [
      { label: 'Beginning', rows: [8, 9, 10, 11, 12, 13], total: 14 },
      { label: 'Additions', rows: [17, 18, 19, 20, 21, 22], total: 23 },
      { label: 'Ending', rows: [26, 27, 28, 29, 30, 31], total: 32 },
    ],
  },
  {
    title: 'Depreciation',
    groups: [
      { label: 'Beginning', rows: [36, 37, 38, 39, 40, 41], total: 42 },
      { label: 'Additions', rows: [45, 46, 47, 48, 49, 50], total: 51 },
      { label: 'Ending', rows: [54, 55, 56, 57, 58, 59], total: 60 },
    ],
  },
  {
    title: 'Net Value Fixed Assets',
    groups: [
      { label: '', rows: [63, 64, 65, 66, 67, 68], total: 69 },
    ],
  },
]

const CATEGORY_LABELS = ['Land', 'Building & CIP', 'Equipment, Lab & Machinery', 'Vehicle & Heavy Equip.', 'Office Inventory', 'Electrical']

export default function ProyFixedAssetPage() {
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
    return <div className="mx-auto max-w-[1100px] p-6 text-sm text-ink-muted">Memuat data…</div>
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-[1100px] p-6">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-ink">Proy. Fixed Asset</h1>
        <div className="rounded border border-grid bg-canvas-raised px-4 py-6 text-center text-sm text-ink-muted">
          <p>Isi <strong>HOME</strong> dan <strong>Fixed Asset</strong> terlebih dahulu.</p>
        </div>
      </div>
    )
  }

  const { rows, years } = data

  return (
    <div className="mx-auto max-w-[1100px] p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">Proy. Fixed Asset</h1>
      <p className="mb-6 text-sm text-ink-muted">
        Proyeksi aset tetap berdasarkan growth rate historis. Kolom pertama = tahun historis terakhir.
      </p>

      <div className="overflow-x-auto">
        {SECTIONS.map(section => (
          <div key={section.title} className="mb-6">
            <h2 className="mb-2 text-base font-semibold text-ink">{section.title}</h2>
            {section.groups.map(group => (
              <table key={group.label || 'net'} className="mb-3 w-full border-collapse text-sm">
                {group.label && (
                  <thead>
                    <tr className="border-b border-grid">
                      <th className="px-2 py-1 text-left text-ink-muted">{group.label}</th>
                      {years.map(y => (
                        <th key={y} className="px-2 py-1 text-right font-mono text-ink-muted tabular-nums">{y}</th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {group.rows.map((row, i) => (
                    <tr key={row} className="border-b border-grid">
                      <td className="px-2 py-1 text-ink">{CATEGORY_LABELS[i]}</td>
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
                    <td className="px-2 py-1.5 text-ink">Total</td>
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

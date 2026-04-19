'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { RowInputGrid } from './RowInputGrid'
import { GROWTH_REVENUE_MANIFEST } from '@/data/manifests/growth-revenue'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { computeGrowthRevenueLiveRows } from '@/data/live/compute-growth-revenue-live'
import { yoyChangeSafe } from '@/lib/calculations/helpers'
import { useT } from '@/lib/i18n/useT'
import type { GrowthRevenueState } from '@/lib/store/useKkaStore'
import type { YearKeyedSeries } from '@/types/financial'

/**
 * Growth Revenue editor.
 *
 * Four rows:
 *   8  Penjualan (Revenue)       — read-only (cross-ref from IS row 6)
 *   9  Laba Bersih (NPAT)        — read-only (cross-ref from IS row 35)
 *   40 Penjualan (Industri)      — user-editable (store.growthRevenue.industryRevenue)
 *   41 Pendapatan Bersih (Industri) — user-editable (store.growthRevenue.industryNetProfit)
 *
 * Session 054: industry rows moved from static manifest placeholder to
 * live store slice. Derived rows stay sourced from IS. Growth YoY
 * derivation is computed inline per row (IFERROR-safe) and fed into
 * `RowInputGrid.growth` — LESSON-139 driver-display sync preserved.
 *
 * Hydration gate + child mount seeding follows LESSON-034.
 */
export default function GrowthRevenueEditor() {
  const hasHydrated = useKkaStore((s) => s._hasHydrated)
  const home = useKkaStore((s) => s.home)
  const incomeStatement = useKkaStore((s) => s.incomeStatement)

  if (!hasHydrated) return null
  if (!home || !incomeStatement) return null // parent PageEmptyState handles

  return <EditorInner />
}

function EditorInner() {
  const { t, language } = useT()
  const home = useKkaStore.getState().home!
  const incomeStatement = useKkaStore.getState().incomeStatement!
  const storedGr = useKkaStore.getState().growthRevenue

  const setGrowthRevenue = useKkaStore((s) => s.setGrowthRevenue)
  const resetGrowthRevenue = useKkaStore((s) => s.resetGrowthRevenue)

  const years = useMemo(
    () =>
      computeHistoricalYears(
        home.tahunTransaksi,
        GROWTH_REVENUE_MANIFEST.historicalYearCount ?? 4,
      ),
    [home.tahunTransaksi],
  )

  // Local state — industry rows only. Seeded once at mount (LESSON-034).
  const [industry, setIndustry] = useState<GrowthRevenueState>(() => ({
    industryRevenue: storedGr?.industryRevenue ?? {},
    industryNetProfit: storedGr?.industryNetProfit ?? {},
  }))

  // Debounced persist to store (LESSON-141 merge at persist via useMemo)
  const persistRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (persistRef.current) clearTimeout(persistRef.current)
    persistRef.current = setTimeout(() => {
      setGrowthRevenue(industry)
    }, 500)
    return () => {
      if (persistRef.current) clearTimeout(persistRef.current)
    }
  }, [industry, setGrowthRevenue])

  // Derived rows (IS → GR) + merged with live industry for display
  const displayRows = useMemo(
    () => computeGrowthRevenueLiveRows(incomeStatement.rows, years, industry),
    [incomeStatement.rows, years, industry],
  )

  // values: editable row store (rows 40, 41)
  const values = useMemo(
    () => ({ 40: industry.industryRevenue, 41: industry.industryNetProfit }),
    [industry],
  )

  // computedValues: read-only rows (8, 9) populated by compute-live
  const computedValues = useMemo(
    () => ({ 8: displayRows[8] ?? {}, 9: displayRows[9] ?? {} }),
    [displayRows],
  )

  // Growth YoY per row across ALL 4 rows (safe/IFERROR wrap). Feeds
  // RowInputGrid.growth for the dedicated growth columns.
  const growth = useMemo(() => {
    const out: Record<number, YearKeyedSeries> = {}
    for (const row of [8, 9, 40, 41] as const) {
      const series = displayRows[row] ?? {}
      const g: YearKeyedSeries = {}
      for (let i = 1; i < years.length; i++) {
        const prev = series[years[i - 1]] ?? 0
        const curr = series[years[i]] ?? 0
        g[years[i]] = yoyChangeSafe(curr, prev)
      }
      out[row] = g
    }
    return out
  }, [displayRows, years])

  const growthYears = useMemo(() => years.slice(1), [years])

  const handleChange = (excelRow: number, year: number, value: number) => {
    setIndustry((prev) => {
      if (excelRow === 40) {
        return {
          ...prev,
          industryRevenue: { ...prev.industryRevenue, [year]: value },
        }
      }
      if (excelRow === 41) {
        return {
          ...prev,
          industryNetProfit: { ...prev.industryNetProfit, [year]: value },
        }
      }
      return prev
    })
  }

  const handleReset = () => {
    setIndustry({ industryRevenue: {}, industryNetProfit: {} })
    resetGrowthRevenue()
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold text-ink">
          {t('nav.item.growthRevenue')}
        </h1>
        <p className="max-w-prose text-sm text-ink-muted">
          {t('growthRevenue.editor.subtitle')}
        </p>
      </header>

      <RowInputGrid
        rows={GROWTH_REVENUE_MANIFEST.rows}
        years={years}
        values={values}
        computedValues={computedValues}
        onChange={handleChange}
        growth={growth}
        growthYears={growthYears}
        showGrowthAverage={growthYears.length >= 2}
        language={language}
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleReset}
          className="rounded border border-grid px-4 py-2 text-sm text-ink-muted hover:bg-grid-subtle"
        >
          {t('common.resetPage')}
        </button>
      </div>
    </div>
  )
}

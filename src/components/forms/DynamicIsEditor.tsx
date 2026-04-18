'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { buildDynamicIsManifest } from '@/data/manifests/build-dynamic-is'
import {
  getCatalogBySection,
  generateCustomExcelRow,
  IS_SENTINEL_ROWS,
  IS_COMPUTED_SENTINEL_ROWS,
  type IsAccountEntry,
  type IsCatalogAccount,
  type IsSection,
} from '@/data/catalogs/income-statement-catalog'
import { RowInputGrid } from './RowInputGrid'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { computeDepreciationFromFa } from '@/lib/calculations/derive-depreciation'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { ratioOfBase, yoyChangeSafe } from '@/lib/calculations/helpers'
import type { YearKeyedSeries } from '@/types/financial'
import { getIsStrings } from '@/lib/i18n/income-statement'
import { IS_SENTINEL } from '@/data/catalogs/income-statement-catalog'
import { useT } from '@/lib/i18n/useT'

/**
 * Dynamic Income Statement editor — 5 sections with catalog dropdowns,
 * bilingual labels, dynamic year columns, and sentinel pre-computation
 * for downstream backward compatibility.
 *
 * At persist time, computes ALL sentinel/computed values (rows 6-35) via
 * deriveComputedRows using the dynamic manifest and stores them alongside
 * leaf data. Downstream pages read these sentinels directly — zero changes.
 */
export default function DynamicIsEditor() {
  const home = useKkaStore((s) => s.home)
  const incomeStatement = useKkaStore((s) => s.incomeStatement)
  const fixedAsset = useKkaStore((s) => s.fixedAsset)
  const setIncomeStatement = useKkaStore((s) => s.setIncomeStatement)
  const resetIncomeStatement = useKkaStore((s) => s.resetIncomeStatement)
  const resetAll = useKkaStore((s) => s.resetAll)

  // Global language from sidebar toggle
  const { t: tGlobal, language } = useT()

  const tahunTransaksi = home!.tahunTransaksi

  // Per-page i18n — catalog labels and structural rows
  const isStrings = getIsStrings(language)

  // Local state — seeded from store once at mount (LESSON-034)
  const [accounts, setAccounts] = useState<IsAccountEntry[]>(
    () => incomeStatement?.accounts ?? [],
  )
  const [yearCount, setYearCount] = useState(
    () => incomeStatement?.yearCount ?? 4,
  )
  const [localRows, setLocalRows] = useState<Record<number, YearKeyedSeries>>(() => {
    // Filter OUT computed sentinel rows from store — keep fixed leaves (Depreciation, Tax)
    if (!incomeStatement?.rows) return {}
    const leafOnly: Record<number, YearKeyedSeries> = {}
    const sentinelSet = new Set(IS_COMPUTED_SENTINEL_ROWS)
    for (const [key, val] of Object.entries(incomeStatement.rows)) {
      if (!sentinelSet.has(Number(key))) {
        leafOnly[Number(key)] = val
      }
    }
    return leafOnly
  })

  // UI state
  const [openDropdownSection, setOpenDropdownSection] = useState<IsSection | null>(null)
  const [showResetIS, setShowResetIS] = useState(false)
  const [showResetAll, setShowResetAll] = useState(false)
  // Debounced persist with sentinel pre-computation
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  function schedulePersist(
    nextAccounts: IsAccountEntry[],
    nextRows: Record<number, YearKeyedSeries>,
    nextYearCount: number,
  ) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      // Read latest language from global store at persist time
      const lang = useKkaStore.getState().language
      // Build manifest and compute sentinels for downstream compat
      const manifest = buildDynamicIsManifest(nextAccounts, lang, nextYearCount, tahunTransaksi)
      const yrs = computeHistoricalYears(tahunTransaksi, nextYearCount)
      // Inject Depreciation cross-ref from latest FA store BEFORE deriving
      // sentinels so EBIT/PBT/NPAT chain resolves correctly (LESSON-058).
      const dep = computeDepreciationFromFa(useKkaStore.getState().fixedAsset?.rows)
      const computed = deriveComputedRows(manifest.rows, { ...nextRows, ...dep }, yrs)

      // Merge sentinel values into store rows. Depreciation (21) is included
      // because it is now a computed sentinel (Session 041 Task 1).
      const sentinels: Record<number, YearKeyedSeries> = {}
      for (const r of IS_SENTINEL_ROWS) {
        if (computed[r]) sentinels[r] = computed[r]
      }
      // Session 043 fix: row 21 has type 'cross-ref' without `computedFrom`,
      // so deriveComputedRows skips it even though the value was provided via
      // the spread. Inject it explicitly from the dep object so downstream
      // consumers (EBIT chain, NOPLAT, FR ratios, export) see it in the store.
      if (dep[IS_SENTINEL.DEPRECIATION]) {
        sentinels[IS_SENTINEL.DEPRECIATION] = dep[IS_SENTINEL.DEPRECIATION]
      }

      setIncomeStatement({
        accounts: nextAccounts,
        yearCount: nextYearCount,
        language: lang,
        rows: { ...nextRows, ...sentinels },
      })
    }, 500)
  }

  // Build manifest + compute
  const years = useMemo(
    () => computeHistoricalYears(tahunTransaksi, yearCount),
    [tahunTransaksi, yearCount],
  )

  const dynamicManifest = useMemo(
    () => buildDynamicIsManifest(accounts, language, yearCount, tahunTransaksi),
    [accounts, language, yearCount, tahunTransaksi],
  )

  // Cross-ref: FA "B. Depreciation → Total Additions" (FA row 51) → IS row 21,
  // sign negated at the boundary (LESSON-011). Read-only at the UI level via
  // manifest type 'cross-ref'.
  const depCrossRef = useMemo(
    () => computeDepreciationFromFa(fixedAsset?.rows),
    [fixedAsset?.rows],
  )

  const computedValues = useMemo(
    () => {
      // Session 043 fix: row 21 (Depreciation) has type 'cross-ref' without
      // `computedFrom`, so deriveComputedRows skips it. Merge depCrossRef
      // so RowInputGrid (which reads computedValues for non-editable cells)
      // can render row 21. Derived subtotals (EBIT, PBT, NPAT) overwrite last.
      const bare = deriveComputedRows(dynamicManifest.rows, { ...localRows, ...depCrossRef }, years)
      return { ...depCrossRef, ...bare }
    },
    [dynamicManifest.rows, localRows, depCrossRef, years],
  )

  // Re-persist IS sentinels when the FA Depreciation Total Additions changes
  // (e.g. user edits FA page) so downstream pages see correct EBIT/PBT/NPAT.
  // Mirrors LESSON-058 BS-from-FA pattern.
  const prevDepRef = useRef(depCrossRef)
  useEffect(() => {
    if (prevDepRef.current === depCrossRef) return
    prevDepRef.current = depCrossRef
    if (accounts.length === 0) return
    schedulePersist(accounts, localRows, yearCount)
  })

  // Derivation columns: Common Size (% of Revenue) + Growth YoY
  const allValues = useMemo(
    () => ({ ...localRows, ...computedValues }),
    [localRows, computedValues],
  )
  const commonSizeData = useMemo(() => {
    const revenue = allValues[IS_SENTINEL.REVENUE]
    if (!revenue) return {}
    const out: Record<number, YearKeyedSeries> = {}
    for (const row of dynamicManifest.rows) {
      if (row.excelRow === undefined) continue
      const line = allValues[row.excelRow]
      if (!line) continue
      const series: YearKeyedSeries = {}
      for (const y of years) series[y] = ratioOfBase(line[y] ?? 0, revenue[y] ?? 0)
      out[row.excelRow] = series
    }
    return out
  }, [allValues, dynamicManifest.rows, years])

  const growthData = useMemo(() => {
    if (years.length < 2) return {}
    const out: Record<number, YearKeyedSeries> = {}
    for (const row of dynamicManifest.rows) {
      if (row.excelRow === undefined) continue
      const line = allValues[row.excelRow]
      if (!line) continue
      const series: YearKeyedSeries = {}
      for (let i = 1; i < years.length; i++) {
        series[years[i]] = yoyChangeSafe(line[years[i]] ?? 0, line[years[i - 1]] ?? 0)
      }
      out[row.excelRow] = series
    }
    return out
  }, [allValues, dynamicManifest.rows, years])

  const growthYears = useMemo(() => years.length >= 2 ? years.slice(1) : [], [years])

  // Existing account IDs for filtering dropdowns
  const existingIds = useMemo(() => new Set(accounts.map((a) => a.catalogId)), [accounts])

  const dropdownCatalog = useMemo(() => {
    if (!openDropdownSection) return []
    return getCatalogBySection(openDropdownSection, language)
      .filter((c) => !existingIds.has(c.id))
  }, [openDropdownSection, language, existingIds])

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleCellChange(excelRow: number, year: number, value: number) {
    setLocalRows((prev) => {
      const next = { ...prev, [excelRow]: { ...(prev[excelRow] ?? {}), [year]: value } }
      schedulePersist(accounts, next, yearCount)
      return next
    })
  }

  function handleAddAccount(catalogAccount: IsCatalogAccount) {
    const entry: IsAccountEntry = {
      catalogId: catalogAccount.id,
      excelRow: catalogAccount.excelRow,
      section: catalogAccount.section,
    }
    setAccounts((prev) => {
      const next = [...prev, entry]
      schedulePersist(next, localRows, yearCount)
      return next
    })
  }

  function handleAddCustom(section: string, label: string) {
    const excelRow = generateCustomExcelRow(accounts)
    const entry: IsAccountEntry = {
      catalogId: `custom_${Date.now()}`,
      excelRow,
      section: section as IsSection,
      customLabel: label,
    }
    setAccounts((prev) => {
      const next = [...prev, entry]
      schedulePersist(next, localRows, yearCount)
      return next
    })
  }

  function handleRemoveAccount(catalogId: string) {
    const account = accounts.find((a) => a.catalogId === catalogId)
    setAccounts((prev) => {
      const next = prev.filter((a) => a.catalogId !== catalogId)
      const nextRows = { ...localRows }
      if (account) delete nextRows[account.excelRow]
      setLocalRows(nextRows)
      schedulePersist(next, nextRows, yearCount)
      return next
    })
  }

  function handleYearCountChange(delta: number) {
    setYearCount((prev) => {
      const next = Math.min(10, Math.max(1, prev + delta))
      schedulePersist(accounts, localRows, next)
      return next
    })
  }

  function handleResetIS() {
    resetIncomeStatement()
    setAccounts([])
    setLocalRows({})
    setYearCount(4)
    setShowResetIS(false)
  }

  function handleResetAll_() {
    resetAll()
    setAccounts([])
    setLocalRows({})
    setYearCount(4)
    setShowResetAll(false)
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
            {tGlobal('editor.sectionLabel')}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            {isStrings.pageTitle}
          </h1>
        </div>
      </div>

      {/* Year axis info */}
      <p className="text-[12px] text-ink-muted">
        {tGlobal('editor.yearAxisInfo')} {years.join(', ')} ({yearCount} {tGlobal('common.year')})
      </p>

      {/* Year control section */}
      <div className="rounded-sm border border-grid bg-canvas-raised p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
            {isStrings.addHistoricalYear}
          </h3>
          <div className="flex items-center gap-1.5">
            {yearCount > 1 && (
              <button
                type="button"
                onClick={() => handleYearCountChange(-1)}
                className="rounded-sm border border-dashed border-grid px-2 py-1 text-[11px] font-medium text-ink-muted transition-colors hover:border-negative hover:text-negative"
              >
                {isStrings.reduceYear}
              </button>
            )}
            <button
              type="button"
              onClick={() => handleYearCountChange(1)}
              className="rounded-sm border border-dashed border-grid px-2 py-1 text-[11px] font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent"
            >
              {isStrings.addYear}
            </button>
          </div>
        </div>
      </div>

      {/* Financial table grid */}
      <RowInputGrid
        rows={dynamicManifest.rows}
        years={years}
        values={localRows}
        computedValues={computedValues}
        onChange={handleCellChange}
        lineItemHeader={isStrings.lineItemHeader}
        onAddButtonClick={(section) => setOpenDropdownSection(section === openDropdownSection ? null : section as IsSection)}
        onRemoveAccount={handleRemoveAccount}
        openDropdownSection={openDropdownSection}
        dropdownCatalog={dropdownCatalog}
        onSelectCatalogItem={(item) => { handleAddAccount(item as IsCatalogAccount); setOpenDropdownSection(null) }}
        onCustomEntry={(section, label) => { handleAddCustom(section, label); setOpenDropdownSection(null) }}
        onCloseDropdown={() => setOpenDropdownSection(null)}
        dropdownStrings={{ manualEntry: isStrings.manualEntry, allAccountsAdded: isStrings.allAccountsAdded, accountNamePlaceholder: isStrings.accountNamePlaceholder, cancel: tGlobal('common.cancel'), add: tGlobal('common.add') }}
        language={language}
        commonSize={commonSizeData}
        commonSizeYears={years}
        growth={growthData}
        growthYears={growthYears}
        showCommonSizeAverage={years.length >= 2}
        showGrowthAverage={years.length >= 2}
      />

      {/* Footer: RESET + auto-save indicator */}
      <footer className="flex flex-wrap items-center gap-3">
        <p className="text-xs text-ink-muted">{tGlobal('common.autoSaved')}</p>
        <button
          type="button"
          onClick={() => setShowResetIS(true)}
          className="rounded-sm border border-grid px-3 py-2 text-[13px] font-medium text-ink-soft transition-colors hover:bg-grid hover:text-ink"
        >
          {tGlobal('common.resetPage')}
        </button>
        <button
          type="button"
          onClick={() => setShowResetAll(true)}
          className="rounded-sm border border-negative/40 px-3 py-2 text-[13px] font-medium text-negative transition-colors hover:bg-negative/10"
        >
          {tGlobal('common.resetAll')}
        </button>
      </footer>

      {/* Confirmation dialogs */}
      {showResetIS && (
        <ConfirmDialog
          title={isStrings.resetIsTitle}
          message={isStrings.resetIsMessage}
          confirmLabel={isStrings.resetIsConfirm}
          cancelLabel={tGlobal('common.cancel')}
          onConfirm={handleResetIS}
          onCancel={() => setShowResetIS(false)}
        />
      )}
      {showResetAll && (
        <ConfirmDialog
          title={tGlobal('common.resetAllTitle')}
          message={tGlobal('common.resetAllMessage')}
          confirmLabel={tGlobal('common.resetAllConfirm')}
          cancelLabel={tGlobal('common.cancel')}
          destructive
          onConfirm={handleResetAll_}
          onCancel={() => setShowResetAll(false)}
        />
      )}
    </div>
  )
}

function ConfirmDialog({
  title, message, confirmLabel, cancelLabel = 'Cancel', destructive, onConfirm, onCancel,
}: {
  title: string; message: string; confirmLabel: string; cancelLabel?: string
  destructive?: boolean; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm" onClick={onCancel} role="dialog" aria-modal="true" aria-label={title}>
      <div className="mx-4 w-full max-w-sm rounded-sm border border-grid bg-canvas-raised p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <p className="mt-2 text-sm text-ink-soft">{message}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-sm border border-grid px-3 py-1.5 text-[13px] font-medium text-ink-soft transition-colors hover:bg-grid">{cancelLabel}</button>
          <button type="button" onClick={onConfirm} className={destructive ? 'rounded-sm bg-negative px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-negative/90' : 'rounded-sm bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent/90'}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

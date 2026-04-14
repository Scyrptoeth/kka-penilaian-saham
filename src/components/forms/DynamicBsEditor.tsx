'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { buildDynamicBsManifest } from '@/data/manifests/build-dynamic-bs'
import {
  getCatalogBySection,
  generateCustomExcelRow,
  BS_SENTINEL_ROWS,
  type BsAccountEntry,
  type BsCatalogAccount,
  type BsSection,
} from '@/data/catalogs/balance-sheet-catalog'
import { RowInputGrid } from './RowInputGrid'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { ratioOfBase, yoyChangeSafe } from '@/lib/calculations/helpers'
import type { YearKeyedSeries } from '@/types/financial'
import { getBsStrings } from '@/lib/i18n/balance-sheet'

/**
 * Compute BS cross-reference values from Fixed Asset store data.
 * FA row 32 (Total Ending Acquisition Cost) → BS row 20 (FA Beginning, positive)
 * FA row 60 (Total Ending Accum Depreciation) → BS row 21 (Accum Depr, negated for BS convention)
 */
function computeBsCrossRefValues(
  faRows: Record<number, YearKeyedSeries> | undefined,
): Record<number, YearKeyedSeries> {
  const rows = faRows ?? {}
  const refs: Record<number, YearKeyedSeries> = {}
  if (rows[32]) refs[20] = { ...rows[32] }
  if (rows[60]) {
    const negated: YearKeyedSeries = {}
    for (const [yr, val] of Object.entries(rows[60])) {
      negated[Number(yr)] = -(val ?? 0)
    }
    refs[21] = negated
  }
  return refs
}

/**
 * Dynamic Balance Sheet editor — user selects accounts from catalog dropdowns,
 * with bilingual labels, dynamic year columns, and auto-save.
 *
 * Replaces ManifestEditor for the BS input page (Session 020).
 */
export default function DynamicBsEditor() {
  const home = useKkaStore((s) => s.home)
  const balanceSheet = useKkaStore((s) => s.balanceSheet)
  const fixedAsset = useKkaStore((s) => s.fixedAsset)
  const setBalanceSheet = useKkaStore((s) => s.setBalanceSheet)
  const resetBalanceSheet = useKkaStore((s) => s.resetBalanceSheet)
  const resetAll = useKkaStore((s) => s.resetAll)

  const tahunTransaksi = home!.tahunTransaksi

  // i18n — all UI strings derived from language state

  // Local state — seeded from store once at mount (LESSON-034)
  const [accounts, setAccounts] = useState<BsAccountEntry[]>(
    () => balanceSheet?.accounts ?? [],
  )
  const [yearCount, setYearCount] = useState(
    () => balanceSheet?.yearCount ?? 1,
  )
  const [language, setLanguage] = useState<'en' | 'id'>(
    () => balanceSheet?.language ?? 'en',
  )
  const [localRows, setLocalRows] = useState<Record<number, YearKeyedSeries>>(() => {
    // Filter OUT sentinel rows from store — editor only shows leaf data
    if (!balanceSheet?.rows) return {}
    const leafOnly: Record<number, YearKeyedSeries> = {}
    const sentinelSet = new Set(BS_SENTINEL_ROWS)
    for (const [key, val] of Object.entries(balanceSheet.rows)) {
      if (!sentinelSet.has(Number(key))) {
        leafOnly[Number(key)] = val
      }
    }
    return leafOnly
  })
  const t = getBsStrings(language)

  // Reset dialog state
  const [showResetBS, setShowResetBS] = useState(false)
  const [showResetAll, setShowResetAll] = useState(false)
  // Inline dropdown state for add-button rows
  const [openDropdownSection, setOpenDropdownSection] = useState<BsSection | null>(null)

  // Debounced persist with sentinel pre-computation
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  function schedulePersist(
    nextAccounts: BsAccountEntry[],
    nextRows: Record<number, YearKeyedSeries>,
    nextYearCount: number,
    nextLanguage: 'en' | 'id',
  ) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      // Build manifest and compute sentinels for downstream compat
      const manifest = buildDynamicBsManifest(nextAccounts, nextLanguage, nextYearCount, tahunTransaksi)
      const yrs = computeHistoricalYears(tahunTransaksi, nextYearCount)
      // Include latest FA cross-refs so sentinels (Total Assets etc.) are correct
      const refs = computeBsCrossRefValues(useKkaStore.getState().fixedAsset?.rows)
      const computed = deriveComputedRows(manifest.rows, { ...nextRows, ...refs }, yrs)
      const sentinels: Record<number, YearKeyedSeries> = {}
      for (const r of BS_SENTINEL_ROWS) {
        if (computed[r]) sentinels[r] = computed[r]
      }
      setBalanceSheet({ accounts: nextAccounts, yearCount: nextYearCount, language: nextLanguage, rows: { ...nextRows, ...sentinels } })
    }, 500)
  }

  // Build manifest + compute
  const years = useMemo(
    () => computeHistoricalYears(tahunTransaksi, yearCount),
    [tahunTransaksi, yearCount],
  )

  const dynamicManifest = useMemo(
    () => buildDynamicBsManifest(accounts, language, yearCount, tahunTransaksi),
    [accounts, language, yearCount, tahunTransaksi],
  )

  // Cross-ref: map Fixed Asset store → BS rows 20/21
  const crossRefValues = useMemo(
    () => computeBsCrossRefValues(fixedAsset?.rows),
    [fixedAsset?.rows],
  )

  // Merge user rows + cross-ref values for computation
  const mergedValues = useMemo(
    () => ({ ...localRows, ...crossRefValues }),
    [localRows, crossRefValues],
  )

  const computedValues = useMemo(
    () => deriveComputedRows(dynamicManifest.rows, mergedValues, years),
    [dynamicManifest.rows, mergedValues, years],
  )

  // Re-persist BS sentinels when FA cross-ref values change (e.g. user edits FA page)
  // so downstream pages (Financial Ratio, ROIC, etc.) see correct TOTAL ASSETS
  const prevCrossRefRef = useRef(crossRefValues)
  useEffect(() => {
    if (prevCrossRefRef.current === crossRefValues) return
    prevCrossRefRef.current = crossRefValues
    if (accounts.length === 0) return
    schedulePersist(accounts, localRows, yearCount, language)
  })

  // Derivation columns: Common Size (% of Total Assets) + Growth YoY
  const allValues = useMemo(
    () => ({ ...mergedValues, ...computedValues }),
    [mergedValues, computedValues],
  )
  const commonSizeData = useMemo(() => {
    const totalAssets = allValues[27] // BS row 27 = TOTAL ASSETS
    if (!totalAssets) return {}
    const out: Record<number, YearKeyedSeries> = {}
    for (const row of dynamicManifest.rows) {
      if (row.excelRow === undefined) continue
      const line = allValues[row.excelRow]
      if (!line) continue
      const series: YearKeyedSeries = {}
      for (const y of years) series[y] = ratioOfBase(line[y] ?? 0, totalAssets[y] ?? 0)
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

  // Dropdown catalog for the currently open section
  const dropdownCatalog = useMemo(() => {
    if (!openDropdownSection) return []
    // Merge intangible_assets into other_non_current_assets dropdown
    const sections: BsSection[] = openDropdownSection === 'other_non_current_assets'
      ? ['other_non_current_assets', 'intangible_assets']
      : [openDropdownSection]
    return sections
      .flatMap((s) => getCatalogBySection(s, language))
      .filter((c) => !existingIds.has(c.id))
  }, [openDropdownSection, language, existingIds])

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleCellChange(excelRow: number, year: number, value: number) {
    setLocalRows((prev) => {
      const next = { ...prev, [excelRow]: { ...(prev[excelRow] ?? {}), [year]: value } }
      schedulePersist(accounts, next, yearCount, language)
      return next
    })
  }

  function handleAddAccount(catalogAccount: BsCatalogAccount) {
    const entry: BsAccountEntry = {
      catalogId: catalogAccount.id,
      excelRow: catalogAccount.excelRow,
      section: catalogAccount.section,
    }
    setAccounts((prev) => {
      const next = [...prev, entry]
      schedulePersist(next, localRows, yearCount, language)
      return next
    })
  }

  function handleAddCustom(section: BsSection, label: string) {
    const excelRow = generateCustomExcelRow(accounts)
    const entry: BsAccountEntry = {
      catalogId: `custom_${Date.now()}`,
      excelRow,
      section,
      customLabel: label,
    }
    setAccounts((prev) => {
      const next = [...prev, entry]
      schedulePersist(next, localRows, yearCount, language)
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
      schedulePersist(next, nextRows, yearCount, language)
      return next
    })
  }

  function handleYearCountChange(delta: number) {
    setYearCount((prev) => {
      const next = Math.min(10, Math.max(1, prev + delta))
      schedulePersist(accounts, localRows, next, language)
      return next
    })
  }

  function handleLanguageToggle() {
    setLanguage((prev) => {
      const next = prev === 'en' ? 'id' : 'en'
      schedulePersist(accounts, localRows, yearCount, next)
      return next
    })
  }

  function handleResetBS() {
    resetBalanceSheet()
    setAccounts([])
    setLocalRows({})
    setYearCount(1)
    setLanguage('en')
    setShowResetBS(false)
  }

  function handleResetAll_() {
    resetAll()
    setAccounts([])
    setLocalRows({})
    setYearCount(1)
    setLanguage('en')
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
            Input Data
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            {t.pageTitle}
          </h1>
        </div>
        {/* Language toggle — globe + label + description */}
        <button
          type="button"
          onClick={handleLanguageToggle}
          className="flex items-center gap-2.5 rounded-md border border-grid px-4 py-2 transition-colors hover:bg-grid/50"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink-muted" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <span className="text-sm font-semibold text-ink">
            {language === 'en' ? 'Indonesia' : 'English'}
          </span>
          <span className="text-xs text-ink-muted">
            {language === 'en'
              ? 'Tampilkan dalam Bahasa Indonesia'
              : 'Tampilkan dalam Bahasa Inggris'}
          </span>
        </button>
      </div>

      {/* Year axis info */}
      <p className="text-[12px] text-ink-muted">
        Tahun historis: {years.join(', ')} ({yearCount} {yearCount === 1 ? 'tahun' : 'tahun'})
      </p>

      {/* Year control section */}
      <div className="rounded-sm border border-grid bg-canvas-raised p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
            {t.addHistoricalYear}
          </h3>
          <div className="flex items-center gap-1.5">
            {yearCount > 1 && (
              <button
                type="button"
                onClick={() => handleYearCountChange(-1)}
                className="rounded-sm border border-dashed border-grid px-2 py-1 text-[11px] font-medium text-ink-muted transition-colors hover:border-negative hover:text-negative"
              >
                {t.reduceYear}
              </button>
            )}
            <button
              type="button"
              onClick={() => handleYearCountChange(1)}
              className="rounded-sm border border-dashed border-grid px-2 py-1 text-[11px] font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent"
            >
              {t.addYear}
            </button>
          </div>
        </div>
      </div>

      {/* Financial table grid — inline add/remove account */}
      <RowInputGrid
        rows={dynamicManifest.rows}
        years={years}
        values={localRows}
        computedValues={{ ...crossRefValues, ...computedValues }}
        onChange={handleCellChange}
        lineItemHeader={t.lineItemHeader}
        onAddButtonClick={(section) => setOpenDropdownSection(section === openDropdownSection ? null : section as BsSection)}
        onRemoveAccount={handleRemoveAccount}
        openDropdownSection={openDropdownSection}
        dropdownCatalog={dropdownCatalog}
        onSelectCatalogItem={(item) => { handleAddAccount(item as BsCatalogAccount); setOpenDropdownSection(null) }}
        onCustomEntry={(section, label) => { handleAddCustom(section as BsSection, label); setOpenDropdownSection(null) }}
        onCloseDropdown={() => setOpenDropdownSection(null)}
        dropdownStrings={{ manualEntry: t.manualEntry, allAccountsAdded: t.allAccountsAdded, accountNamePlaceholder: t.accountNamePlaceholder, cancel: t.cancel, add: t.add }}
        language={language}
        commonSize={commonSizeData}
        commonSizeYears={years}
        growth={growthData}
        growthYears={growthYears}
      />

      {/* Footer: RESET + auto-save indicator */}
      <footer className="flex flex-wrap items-center gap-3">
        <p className="text-xs text-ink-muted">Otomatis tersimpan</p>
        <button
          type="button"
          onClick={() => setShowResetBS(true)}
          className="rounded-sm border border-grid px-3 py-2 text-[13px] font-medium text-ink-soft transition-colors hover:bg-grid hover:text-ink"
        >
          Reset Halaman Ini
        </button>
        <button
          type="button"
          onClick={() => setShowResetAll(true)}
          className="rounded-sm border border-negative/40 px-3 py-2 text-[13px] font-medium text-negative transition-colors hover:bg-negative/10"
        >
          Reset Seluruh Data
        </button>
      </footer>

      {/* Confirmation dialogs */}
      {showResetBS && (
        <ConfirmDialog
          title={t.resetBsTitle}
          message={t.resetBsMessage}
          confirmLabel={t.resetBsConfirm}
          cancelLabel={t.cancel}
          onConfirm={handleResetBS}
          onCancel={() => setShowResetBS(false)}
        />
      )}
      {showResetAll && (
        <ConfirmDialog
          title={t.resetAllTitle}
          message={t.resetAllMessage}
          confirmLabel={t.resetAllConfirm}
          cancelLabel={t.cancel}
          destructive
          onConfirm={handleResetAll_}
          onCancel={() => setShowResetAll(false)}
        />
      )}
    </div>
  )
}

function ConfirmDialog({
  title, message, confirmLabel, cancelLabel = 'Batal', destructive, onConfirm, onCancel,
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

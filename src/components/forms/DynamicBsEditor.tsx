'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
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
import { computeCommonSize, computeGrowthYoY, averageYoYStrict } from '@/lib/calculations/derivation-helpers'
import type { YearKeyedSeries } from '@/types/financial'
import { getBsStrings } from '@/lib/i18n/balance-sheet'
import { useT } from '@/lib/i18n/useT'

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

  // Global language from sidebar toggle
  const { t: tGlobal, language } = useT()

  const tahunTransaksi = home!.tahunTransaksi

  // Per-page i18n — catalog labels and structural rows
  const bsStrings = getBsStrings(language)

  // Local state — seeded from store once at mount (LESSON-034)
  const [accounts, setAccounts] = useState<BsAccountEntry[]>(
    () => balanceSheet?.accounts ?? [],
  )
  const [yearCount, setYearCount] = useState(
    () => balanceSheet?.yearCount ?? 1,
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
  ) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      // Read latest language from global store at persist time
      const lang = useKkaStore.getState().language
      // Build manifest and compute sentinels for downstream compat
      const manifest = buildDynamicBsManifest(nextAccounts, lang, nextYearCount, tahunTransaksi)
      const yrs = computeHistoricalYears(tahunTransaksi, nextYearCount)
      // Include latest FA cross-refs so sentinels (Total Assets etc.) are correct
      const refs = computeBsCrossRefValues(useKkaStore.getState().fixedAsset?.rows)
      const computed = deriveComputedRows(manifest.rows, { ...nextRows, ...refs }, yrs)
      const sentinels: Record<number, YearKeyedSeries> = {}
      for (const r of BS_SENTINEL_ROWS) {
        if (computed[r]) sentinels[r] = computed[r]
      }
      // Preserve existing equityProjectionOverrides across persist cycles
      const prevEquityOverrides = useKkaStore.getState().balanceSheet?.equityProjectionOverrides ?? {}
      setBalanceSheet({
        accounts: nextAccounts,
        yearCount: nextYearCount,
        language: lang,
        rows: { ...nextRows, ...sentinels },
        equityProjectionOverrides: prevEquityOverrides,
      })
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
    schedulePersist(accounts, localRows, yearCount)
  })

  // Derivation columns: Common Size (% of Total Assets) + Growth YoY
  const allValues = useMemo(
    () => ({ ...mergedValues, ...computedValues }),
    [mergedValues, computedValues],
  )
  // Common Size denominator = BS row 27 TOTAL ASSETS.
  const commonSizeData = useMemo(
    () => computeCommonSize(dynamicManifest.rows, allValues, years, 27),
    [dynamicManifest.rows, allValues, years],
  )
  const growthData = useMemo(
    () => computeGrowthYoY(dynamicManifest.rows, allValues, years),
    [dynamicManifest.rows, allValues, years],
  )

  const growthYears = useMemo(() => years.length >= 2 ? years.slice(1) : [], [years])

  // Session 051 — strict-average resolver for Growth YoY Average column.
  // Returns null for sparse-historical accounts (< 2 real YoY observations),
  // which RowInputGrid renders as "—". Matches Proy BS projection behavior
  // (driver-display sync per LESSON-139).
  const growthAverageResolver = useMemo(
    () => (excelRow: number) => averageYoYStrict(allValues[excelRow], years),
    [allValues, years],
  )

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
      schedulePersist(accounts, next, yearCount)
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
      schedulePersist(next, localRows, yearCount)
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

  function handleResetBS() {
    resetBalanceSheet()
    setAccounts([])
    setLocalRows({})
    setYearCount(1)
    setShowResetBS(false)
  }

  function handleResetAll_() {
    resetAll()
    setAccounts([])
    setLocalRows({})
    setYearCount(1)
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
            {bsStrings.pageTitle}
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
            {bsStrings.addHistoricalYear}
          </h3>
          <div className="flex items-center gap-1.5">
            {yearCount > 1 && (
              <button
                type="button"
                onClick={() => handleYearCountChange(-1)}
                className="rounded-sm border border-dashed border-grid px-2 py-1 text-[11px] font-medium text-ink-muted transition-colors hover:border-negative hover:text-negative"
              >
                {bsStrings.reduceYear}
              </button>
            )}
            <button
              type="button"
              onClick={() => handleYearCountChange(1)}
              className="rounded-sm border border-dashed border-grid px-2 py-1 text-[11px] font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent"
            >
              {bsStrings.addYear}
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
        lineItemHeader={bsStrings.lineItemHeader}
        onAddButtonClick={(section) => setOpenDropdownSection(section === openDropdownSection ? null : section as BsSection)}
        onRemoveAccount={handleRemoveAccount}
        openDropdownSection={openDropdownSection}
        dropdownCatalog={dropdownCatalog}
        onSelectCatalogItem={(item) => { handleAddAccount(item as BsCatalogAccount); setOpenDropdownSection(null) }}
        onCustomEntry={(section, label) => { handleAddCustom(section as BsSection, label); setOpenDropdownSection(null) }}
        onCloseDropdown={() => setOpenDropdownSection(null)}
        dropdownStrings={{ manualEntry: bsStrings.manualEntry, allAccountsAdded: bsStrings.allAccountsAdded, accountNamePlaceholder: bsStrings.accountNamePlaceholder, cancel: tGlobal('common.cancel'), add: tGlobal('common.add') }}
        language={language}
        commonSize={commonSizeData}
        commonSizeYears={years}
        growth={growthData}
        growthYears={growthYears}
        showCommonSizeAverage={years.length >= 2}
        showGrowthAverage={years.length >= 2}
        growthAverageResolver={growthAverageResolver}
      />

      {/* Footer: RESET + auto-save indicator */}
      <footer className="flex flex-wrap items-center gap-3">
        <p className="text-xs text-ink-muted">{tGlobal('common.autoSaved')}</p>
        <button
          type="button"
          onClick={() => setShowResetBS(true)}
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

      {/* Tax-impact reminder for IS Koreksi Fiskal entries (Session 041 Task 2) */}
      <KoreksiFiskalNote />

      {/* Confirmation dialogs */}
      {showResetBS && (
        <ConfirmDialog
          title={bsStrings.resetBsTitle}
          message={bsStrings.resetBsMessage}
          confirmLabel={bsStrings.resetBsConfirm}
          cancelLabel={tGlobal('common.cancel')}
          onConfirm={handleResetBS}
          onCancel={() => setShowResetBS(false)}
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

/**
 * Tiny markdown-bold renderer: splits a string on `**phrase**` markers and
 * returns a Fragment of plain text + `<strong>` nodes. Avoids `dangerouslySetInnerHTML`
 * while keeping i18n strings declarative (LESSON-109 — use Fragment + key in map).
 */
function renderBold(input: string): React.ReactNode {
  const parts = input.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-ink">{part.slice(2, -2)}</strong>
    }
    return <React.Fragment key={i}>{part}</React.Fragment>
  })
}

function KoreksiFiskalNote() {
  const { t } = useT()
  return (
    <aside
      role="note"
      aria-labelledby="bs-koreksi-fiskal-note-heading"
      className="mt-4 rounded-sm border border-grid border-l-2 border-l-accent bg-canvas-raised/40 p-4 shadow-[0_1px_0_rgba(10,22,40,0.04)]"
    >
      <h2
        id="bs-koreksi-fiskal-note-heading"
        className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent"
      >
        {t('bs.koreksiFiskal.note.heading')}
      </h2>
      <p className="text-sm leading-relaxed text-ink-soft">
        {t('bs.koreksiFiskal.note.intro')}
      </p>
      <ol className="mt-2 list-decimal space-y-2 pl-6 text-sm leading-relaxed text-ink-soft">
        <li>{renderBold(t('bs.koreksiFiskal.note.positive'))}</li>
        <li>{renderBold(t('bs.koreksiFiskal.note.negative'))}</li>
      </ol>
    </aside>
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

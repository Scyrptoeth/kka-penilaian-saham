'use client'

import { useState, useMemo, useRef } from 'react'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { buildDynamicIsManifest } from '@/data/manifests/build-dynamic-is'
import {
  getCatalogBySection,
  generateCustomExcelRow,
  IS_SENTINEL_ROWS,
  type IsAccountEntry,
  type IsCatalogAccount,
  type IsSection,
} from '@/data/catalogs/income-statement-catalog'
import { RowInputGrid } from './RowInputGrid'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import type { YearKeyedSeries } from '@/types/financial'
import { getIsStrings } from '@/lib/i18n/income-statement'

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
  const setIncomeStatement = useKkaStore((s) => s.setIncomeStatement)
  const resetIncomeStatement = useKkaStore((s) => s.resetIncomeStatement)
  const resetAll = useKkaStore((s) => s.resetAll)

  const tahunTransaksi = home!.tahunTransaksi

  // Local state — seeded from store once at mount (LESSON-034)
  const [accounts, setAccounts] = useState<IsAccountEntry[]>(
    () => incomeStatement?.accounts ?? [],
  )
  const [yearCount, setYearCount] = useState(
    () => incomeStatement?.yearCount ?? 4,
  )
  const [language, setLanguage] = useState<'en' | 'id'>(
    () => incomeStatement?.language ?? 'id',
  )
  const [localRows, setLocalRows] = useState<Record<number, YearKeyedSeries>>(() => {
    // Filter OUT sentinel rows from store — editor only shows leaf data
    if (!incomeStatement?.rows) return {}
    const leafOnly: Record<number, YearKeyedSeries> = {}
    const sentinelSet = new Set(IS_SENTINEL_ROWS)
    for (const [key, val] of Object.entries(incomeStatement.rows)) {
      if (!sentinelSet.has(Number(key))) {
        leafOnly[Number(key)] = val
      }
    }
    return leafOnly
  })
  const t = getIsStrings(language)

  // UI state
  const [openDropdownSection, setOpenDropdownSection] = useState<IsSection | null>(null)
  const [showResetIS, setShowResetIS] = useState(false)
  const [showResetAll, setShowResetAll] = useState(false)
  const [saved, setSaved] = useState(false)

  // Debounced persist with sentinel pre-computation
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  function schedulePersist(
    nextAccounts: IsAccountEntry[],
    nextRows: Record<number, YearKeyedSeries>,
    nextYearCount: number,
    nextLanguage: 'en' | 'id',
  ) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      // Build manifest and compute sentinels for downstream compat
      const manifest = buildDynamicIsManifest(nextAccounts, nextLanguage, nextYearCount, tahunTransaksi)
      const yrs = computeHistoricalYears(tahunTransaksi, nextYearCount)
      const computed = deriveComputedRows(manifest.rows, nextRows, yrs)

      // Merge sentinel values into store rows
      const sentinels: Record<number, YearKeyedSeries> = {}
      for (const r of IS_SENTINEL_ROWS) {
        if (computed[r]) sentinels[r] = computed[r]
      }

      setIncomeStatement({
        accounts: nextAccounts,
        yearCount: nextYearCount,
        language: nextLanguage,
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

  const computedValues = useMemo(
    () => deriveComputedRows(dynamicManifest.rows, localRows, years),
    [dynamicManifest.rows, localRows, years],
  )

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
      schedulePersist(accounts, next, yearCount, language)
      return next
    })
  }

  function handleAddAccount(catalogAccount: IsCatalogAccount) {
    const entry: IsAccountEntry = {
      catalogId: catalogAccount.id,
      excelRow: catalogAccount.excelRow,
      section: catalogAccount.section,
      ...(catalogAccount.interestType && { interestType: catalogAccount.interestType }),
    }
    setAccounts((prev) => {
      const next = [...prev, entry]
      schedulePersist(next, localRows, yearCount, language)
      return next
    })
  }

  function handleAddCustom(section: string, label: string) {
    const excelRow = generateCustomExcelRow(accounts)
    // Determine interestType for net_interest custom accounts
    // Default to 'expense' for custom net_interest accounts
    const interestType = section === 'net_interest' ? 'expense' as const : undefined
    const entry: IsAccountEntry = {
      catalogId: `custom_${Date.now()}`,
      excelRow,
      section: section as IsSection,
      customLabel: label,
      ...(interestType && { interestType }),
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

  function handleSave() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const manifest = buildDynamicIsManifest(accounts, language, yearCount, tahunTransaksi)
    const computed = deriveComputedRows(manifest.rows, localRows, years)
    const sentinels: Record<number, YearKeyedSeries> = {}
    for (const r of IS_SENTINEL_ROWS) {
      if (computed[r]) sentinels[r] = computed[r]
    }
    setIncomeStatement({ accounts, yearCount, language, rows: { ...localRows, ...sentinels } })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleResetIS() {
    resetIncomeStatement()
    setAccounts([])
    setLocalRows({})
    setYearCount(4)
    setLanguage('id')
    setShowResetIS(false)
  }

  function handleResetAll_() {
    resetAll()
    setAccounts([])
    setLocalRows({})
    setYearCount(4)
    setLanguage('id')
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
        {/* Language toggle */}
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
        Tahun historis: {years.join(', ')} ({yearCount} tahun)
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

      {/* Financial table grid */}
      <RowInputGrid
        rows={dynamicManifest.rows}
        years={years}
        values={localRows}
        computedValues={computedValues}
        onChange={handleCellChange}
        lineItemHeader={t.lineItemHeader}
        onAddButtonClick={(section) => setOpenDropdownSection(section === openDropdownSection ? null : section as IsSection)}
        onRemoveAccount={handleRemoveAccount}
        openDropdownSection={openDropdownSection}
        dropdownCatalog={dropdownCatalog}
        onSelectCatalogItem={(item) => { handleAddAccount(item as IsCatalogAccount); setOpenDropdownSection(null) }}
        onCustomEntry={(section, label) => { handleAddCustom(section, label); setOpenDropdownSection(null) }}
        onCloseDropdown={() => setOpenDropdownSection(null)}
        dropdownStrings={{ manualEntry: t.manualEntry, allAccountsAdded: t.allAccountsAdded, accountNamePlaceholder: t.accountNamePlaceholder, cancel: t.cancel, add: t.add }}
        language={language}
      />

      {/* Footer: SIMPAN + RESET */}
      <footer className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-sm bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-accent/90"
        >
          Simpan
        </button>
        <button
          type="button"
          onClick={() => setShowResetIS(true)}
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
        {saved && (
          <span className="text-xs font-medium text-positive" role="status">
            Tersimpan
          </span>
        )}
      </footer>

      {/* Confirmation dialogs */}
      {showResetIS && (
        <ConfirmDialog
          title={t.resetIsTitle}
          message={t.resetIsMessage}
          confirmLabel={t.resetIsConfirm}
          cancelLabel={t.cancel}
          onConfirm={handleResetIS}
          onCancel={() => setShowResetIS(false)}
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

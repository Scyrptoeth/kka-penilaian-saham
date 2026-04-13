'use client'

import { useState, useMemo, useRef } from 'react'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { buildDynamicFaManifest } from '@/data/manifests/build-dynamic-fa'
import {
  getCatalogBySection,
  generateCustomExcelRow,
  FA_OFFSET,
  type FaAccountEntry,
  type FaCatalogAccount,
} from '@/data/catalogs/fixed-asset-catalog'
import { RowInputGrid } from './RowInputGrid'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import type { YearKeyedSeries } from '@/types/financial'
import { getFaStrings } from '@/lib/i18n/fixed-asset'

/**
 * Dynamic Fixed Asset editor — user selects accounts from a single catalog
 * dropdown. Each account mirrors across 7 sub-blocks (Acq Begin/Add/End,
 * Dep Begin/Add/End, Net Value). Computed rows auto-derive via manifest.
 *
 * Pattern follows DynamicBsEditor (Session 020), adapted for FA specifics:
 * - Single add-button (not per-section like BS)
 * - Row mirroring across 7 sub-blocks via FA_OFFSET multipliers
 * - No cross-ref to other sheets
 */
export default function DynamicFaEditor() {
  const home = useKkaStore((s) => s.home)
  const fixedAsset = useKkaStore((s) => s.fixedAsset)
  const setFixedAsset = useKkaStore((s) => s.setFixedAsset)
  const resetFixedAsset = useKkaStore((s) => s.resetFixedAsset)
  const resetAll = useKkaStore((s) => s.resetAll)

  const tahunTransaksi = home!.tahunTransaksi

  // Local state — seeded from store once at mount (LESSON-034)
  const [accounts, setAccounts] = useState<FaAccountEntry[]>(
    () => fixedAsset?.accounts ?? [],
  )
  const [yearCount, setYearCount] = useState(
    () => fixedAsset?.yearCount ?? 3,
  )
  const [language, setLanguage] = useState<'en' | 'id'>(
    () => fixedAsset?.language ?? 'id',
  )
  const [localRows, setLocalRows] = useState<Record<number, YearKeyedSeries>>(
    () => fixedAsset?.rows ?? {},
  )
  const t = getFaStrings(language)

  // UI state
  const [showDropdown, setShowDropdown] = useState(false)
  const [showResetFA, setShowResetFA] = useState(false)
  const [showResetAll, setShowResetAll] = useState(false)
  const [saved, setSaved] = useState(false)

  // Debounced persist
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  function schedulePersist(
    nextAccounts: FaAccountEntry[],
    nextRows: Record<number, YearKeyedSeries>,
    nextYearCount: number,
    nextLanguage: 'en' | 'id',
  ) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setFixedAsset({ accounts: nextAccounts, yearCount: nextYearCount, language: nextLanguage, rows: nextRows })
    }, 500)
  }

  // Build manifest + compute
  const years = useMemo(
    () => computeHistoricalYears(tahunTransaksi, yearCount),
    [tahunTransaksi, yearCount],
  )

  const dynamicManifest = useMemo(
    () => buildDynamicFaManifest(accounts, language, yearCount, tahunTransaksi),
    [accounts, language, yearCount, tahunTransaksi],
  )

  const computedValues = useMemo(
    () => deriveComputedRows(dynamicManifest.rows, localRows, years),
    [dynamicManifest.rows, localRows, years],
  )

  // Existing account IDs for filtering dropdown
  const existingIds = useMemo(() => new Set(accounts.map((a) => a.catalogId)), [accounts])

  const dropdownCatalog = useMemo(() => {
    if (!showDropdown) return []
    return getCatalogBySection(language).filter((c) => !existingIds.has(c.id))
  }, [showDropdown, language, existingIds])

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  /** All sub-block offsets where a new account gets empty rows. */
  const EDITABLE_OFFSETS = [
    FA_OFFSET.ACQ_BEGINNING,
    FA_OFFSET.ACQ_ADDITIONS,
    FA_OFFSET.DEP_BEGINNING,
    FA_OFFSET.DEP_ADDITIONS,
  ] as const

  function handleCellChange(excelRow: number, year: number, value: number) {
    setLocalRows((prev) => {
      const next = { ...prev, [excelRow]: { ...(prev[excelRow] ?? {}), [year]: value } }
      schedulePersist(accounts, next, yearCount, language)
      return next
    })
  }

  function handleAddAccount(catalogAccount: FaCatalogAccount) {
    const entry: FaAccountEntry = {
      catalogId: catalogAccount.id,
      excelRow: catalogAccount.excelRow,
      section: 'fixed_asset',
    }
    setAccounts((prev) => {
      const next = [...prev, entry]
      // Pre-create empty row entries for all editable sub-blocks
      setLocalRows((prevRows) => {
        const nextRows = { ...prevRows }
        for (const offset of EDITABLE_OFFSETS) {
          nextRows[entry.excelRow + offset] = {}
        }
        schedulePersist(next, nextRows, yearCount, language)
        return nextRows
      })
      return next
    })
  }

  function handleAddCustom(_section: string, label: string) {
    const excelRow = generateCustomExcelRow(accounts)
    const entry: FaAccountEntry = {
      catalogId: `custom_${Date.now()}`,
      excelRow,
      section: 'fixed_asset',
      customLabel: label,
    }
    setAccounts((prev) => {
      const next = [...prev, entry]
      setLocalRows((prevRows) => {
        const nextRows = { ...prevRows }
        for (const offset of EDITABLE_OFFSETS) {
          nextRows[entry.excelRow + offset] = {}
        }
        schedulePersist(next, nextRows, yearCount, language)
        return nextRows
      })
      return next
    })
  }

  /** Remove account and all its mirrored sub-block rows. */
  function handleRemoveAccount(catalogId: string) {
    const account = accounts.find((a) => a.catalogId === catalogId)
    setAccounts((prev) => {
      const next = prev.filter((a) => a.catalogId !== catalogId)
      const nextRows = { ...localRows }
      if (account) {
        // Delete all 7 sub-block rows for this account
        const allOffsets = Object.values(FA_OFFSET)
        for (const offset of allOffsets) {
          delete nextRows[account.excelRow + offset]
        }
      }
      setLocalRows(nextRows)
      schedulePersist(next, nextRows, yearCount, language)
      return next
    })
  }

  function handleYearCountChange(delta: number) {
    setYearCount((prev) => {
      const next = Math.max(1, prev + delta)
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
    setFixedAsset({ accounts, yearCount, language, rows: localRows })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleResetFA() {
    resetFixedAsset()
    setAccounts([])
    setLocalRows({})
    setYearCount(3)
    setLanguage('id')
    setShowResetFA(false)
  }

  function handleResetAll_() {
    resetAll()
    setAccounts([])
    setLocalRows({})
    setYearCount(3)
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

      {/* Financial table grid — inline add/remove account */}
      <RowInputGrid
        rows={dynamicManifest.rows}
        years={years}
        values={localRows}
        computedValues={computedValues}
        onChange={handleCellChange}
        lineItemHeader={t.lineItemHeader}
        onAddButtonClick={() => setShowDropdown((prev) => !prev)}
        onRemoveAccount={handleRemoveAccount}
        openDropdownSection={showDropdown ? 'fixed_asset' : null}
        dropdownCatalog={dropdownCatalog}
        onSelectCatalogItem={(item) => { handleAddAccount(item as FaCatalogAccount); setShowDropdown(false) }}
        onCustomEntry={(_, label) => { handleAddCustom('fixed_asset', label); setShowDropdown(false) }}
        onCloseDropdown={() => setShowDropdown(false)}
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
          onClick={() => setShowResetFA(true)}
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
      {showResetFA && (
        <ConfirmDialog
          title={t.resetFaTitle}
          message={t.resetFaMessage}
          confirmLabel={t.resetFaConfirm}
          cancelLabel={t.cancel}
          onConfirm={handleResetFA}
          onCancel={() => setShowResetFA(false)}
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

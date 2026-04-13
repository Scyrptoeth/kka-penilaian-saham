'use client'

import { useState, useMemo, useRef } from 'react'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { buildDynamicFaManifest } from '@/data/manifests/build-dynamic-fa'
import {
  getCatalogBySection,
  generateCustomExcelRow,
  FA_OFFSET,
  FA_SENTINEL_ROWS,
  FA_LEGACY_OFFSET,
  isOriginalFaRow,
  type FaAccountEntry,
  type FaCatalogAccount,
} from '@/data/catalogs/fixed-asset-catalog'
import { RowInputGrid } from './RowInputGrid'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import type { YearKeyedSeries } from '@/types/financial'
import { getFaStrings } from '@/lib/i18n/fixed-asset'

/**
 * Compute FA sentinel rows for downstream backward compatibility.
 *
 * At persist time, the editor:
 * 1. Maps original account offset rows (2008→17, 4008→36, 5008→45) to legacy positions
 * 2. Computes ALL subtotals (including extended accounts) at sentinel positions
 * 3. Stores sentinels alongside leaf data so downstream reads the correct values
 *
 * This mirrors the IS sentinel pattern (LESSON-052). Without this mapping,
 * downstream consumers (upstream-helpers, CFS, FCF, PROY FA, export) would
 * find zeros because they reference legacy row positions (17-22, 36-41, 45-50).
 */
function computeFaSentinels(
  accounts: FaAccountEntry[],
  leafRows: Record<number, YearKeyedSeries>,
  manifest: { rows: import('@/data/manifests/types').ManifestRow[] },
  years: readonly number[],
): Record<number, YearKeyedSeries> {
  // Step 1: Map original account offset rows to legacy positions
  const legacyMapped: Record<number, YearKeyedSeries> = {}
  for (const acct of accounts) {
    if (!isOriginalFaRow(acct.excelRow)) continue
    for (const [dynamicOffset, legacyDelta] of Object.entries(FA_LEGACY_OFFSET)) {
      const offsetKey = acct.excelRow + Number(dynamicOffset)
      const legacyKey = acct.excelRow + legacyDelta
      if (leafRows[offsetKey]) {
        legacyMapped[legacyKey] = leafRows[offsetKey]
      }
    }
  }

  // Step 2: Merge legacy-mapped leaves with original leaf data
  const mergedLeaves = { ...leafRows, ...legacyMapped }

  // Step 3: Compute all subtotals and derived rows via dynamic manifest
  const computed = deriveComputedRows(manifest.rows, mergedLeaves, years)

  // Step 4: Collect sentinel subtotals + legacy leaf rows
  const sentinels: Record<number, YearKeyedSeries> = { ...legacyMapped }
  for (const r of FA_SENTINEL_ROWS) {
    if (computed[r]) sentinels[r] = computed[r]
  }
  return sentinels
}

/**
 * Dynamic Fixed Asset editor — user selects accounts from a single catalog
 * dropdown. Each account mirrors across 7 sub-blocks (Acq Begin/Add/End,
 * Dep Begin/Add/End, Net Value). Computed rows auto-derive via manifest.
 *
 * At persist time, pre-computes sentinel values for downstream backward
 * compat — maps offset rows to legacy positions and computes 7 subtotals.
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
  const [localRows, setLocalRows] = useState<Record<number, YearKeyedSeries>>(() => {
    // Filter OUT sentinel/legacy-mapped rows — editor only shows offset-keyed leaf data
    if (!fixedAsset?.rows) return {}
    const leafOnly: Record<number, YearKeyedSeries> = {}
    const sentinelSet = new Set(FA_SENTINEL_ROWS)
    // Legacy-mapped rows for original accounts (rows 17-22, 36-41, 45-50)
    const legacyRows = new Set<number>()
    for (const acct of (fixedAsset.accounts ?? [])) {
      if (isOriginalFaRow(acct.excelRow)) {
        for (const legacyDelta of Object.values(FA_LEGACY_OFFSET)) {
          legacyRows.add(acct.excelRow + legacyDelta)
        }
      }
    }
    for (const [key, val] of Object.entries(fixedAsset.rows)) {
      const row = Number(key)
      if (!sentinelSet.has(row) && !legacyRows.has(row)) {
        leafOnly[row] = val
      }
    }
    return leafOnly
  })
  const t = getFaStrings(language)

  // UI state
  const [showDropdown, setShowDropdown] = useState(false)
  const [showResetFA, setShowResetFA] = useState(false)
  const [showResetAll, setShowResetAll] = useState(false)
  const [saved, setSaved] = useState(false)

  // Debounced persist with sentinel pre-computation
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  function schedulePersist(
    nextAccounts: FaAccountEntry[],
    nextRows: Record<number, YearKeyedSeries>,
    nextYearCount: number,
    nextLanguage: 'en' | 'id',
  ) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      // Build manifest and compute sentinels for downstream compat
      const manifest = buildDynamicFaManifest(nextAccounts, nextLanguage, nextYearCount, tahunTransaksi)
      const yrs = computeHistoricalYears(tahunTransaksi, nextYearCount)
      const sentinels = computeFaSentinels(nextAccounts, nextRows, manifest, yrs)
      setFixedAsset({ accounts: nextAccounts, yearCount: nextYearCount, language: nextLanguage, rows: { ...nextRows, ...sentinels } })
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
    const sentinels = computeFaSentinels(accounts, localRows, dynamicManifest, years)
    setFixedAsset({ accounts, yearCount, language, rows: { ...localRows, ...sentinels } })
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

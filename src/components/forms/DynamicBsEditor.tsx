'use client'

import { useState, useMemo, useRef } from 'react'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { buildDynamicBsManifest } from '@/data/manifests/build-dynamic-bs'
import {
  BS_CATALOG_ALL,
  getCatalogBySection,
  generateCustomExcelRow,
  type BsAccountEntry,
  type BsCatalogAccount,
  type BsSection,
} from '@/data/catalogs/balance-sheet-catalog'
import { RowInputGrid } from './RowInputGrid'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import type { YearKeyedSeries } from '@/types/financial'
import { cn } from '@/lib/utils/cn'

const SECTIONS_ASSETS: BsSection[] = ['current_assets', 'other_non_current_assets', 'intangible_assets']
const SECTIONS_LIABILITIES: BsSection[] = ['current_liabilities', 'non_current_liabilities']
const SECTIONS_EQUITY: BsSection[] = ['equity']
const ALL_SECTIONS = [...SECTIONS_ASSETS, ...SECTIONS_LIABILITIES, ...SECTIONS_EQUITY]

const SECTION_LABELS: Record<BsSection, string> = {
  current_assets: 'Current Assets',
  fixed_assets: 'Fixed Assets',
  intangible_assets: 'Intangible Assets',
  other_non_current_assets: 'Other Non-Current Assets',
  current_liabilities: 'Current Liabilities',
  non_current_liabilities: 'Non-Current Liabilities',
  equity: 'Equity',
}

/**
 * Dynamic Balance Sheet editor — user selects accounts from catalog dropdowns,
 * with bilingual labels, dynamic year columns, and SIMPAN/RESET buttons.
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
  const [localRows, setLocalRows] = useState<Record<number, YearKeyedSeries>>(
    () => balanceSheet?.rows ?? {},
  )

  // Reset dialog state
  const [showResetBS, setShowResetBS] = useState(false)
  const [showResetAll, setShowResetAll] = useState(false)
  const [saved, setSaved] = useState(false)

  // Debounced persist
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  function schedulePersist(
    nextAccounts: BsAccountEntry[],
    nextRows: Record<number, YearKeyedSeries>,
    nextYearCount: number,
    nextLanguage: 'en' | 'id',
  ) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setBalanceSheet({ accounts: nextAccounts, yearCount: nextYearCount, language: nextLanguage, rows: nextRows })
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
  // FA row 32 (Total Ending Acquisition Cost) → BS row 20 (FA Beginning, positive)
  // FA row 60 (Total Ending Accum Depreciation) → BS row 21 (Accum Depr, negated for BS convention)
  const crossRefValues = useMemo(() => {
    const faRows = fixedAsset?.rows ?? {}
    const refs: Record<number, YearKeyedSeries> = {}
    const fa32 = faRows[32]
    const fa60 = faRows[60]
    if (fa32) {
      refs[20] = { ...fa32 }
    }
    if (fa60) {
      const negated: YearKeyedSeries = {}
      for (const [yr, val] of Object.entries(fa60)) {
        negated[Number(yr)] = -(val ?? 0)
      }
      refs[21] = negated
    }
    return refs
  }, [fixedAsset?.rows])

  // Merge user rows + cross-ref values for computation
  const mergedValues = useMemo(
    () => ({ ...localRows, ...crossRefValues }),
    [localRows, crossRefValues],
  )

  const computedValues = useMemo(
    () => deriveComputedRows(dynamicManifest.rows, mergedValues, years),
    [dynamicManifest.rows, mergedValues, years],
  )

  // Existing account IDs for filtering dropdowns
  const existingIds = useMemo(() => new Set(accounts.map((a) => a.catalogId)), [accounts])

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
    setBalanceSheet({ accounts, yearCount, language, rows: localRows })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
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
            Balance Sheet
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleYearCountChange(1)}
            className="rounded-sm border border-grid px-2.5 py-1.5 text-[12px] font-medium text-ink-soft transition-colors hover:bg-grid hover:text-ink"
          >
            + Tambah Tahun
          </button>
          {yearCount > 1 && (
            <button
              type="button"
              onClick={() => handleYearCountChange(-1)}
              className="rounded-sm border border-grid px-2.5 py-1.5 text-[12px] font-medium text-ink-soft transition-colors hover:bg-grid hover:text-ink"
            >
              - Kurangi
            </button>
          )}
          <button
            type="button"
            onClick={handleLanguageToggle}
            className="rounded-sm border border-accent/40 px-3 py-1.5 text-[12px] font-medium text-accent transition-colors hover:bg-accent/10"
          >
            {language === 'en'
              ? 'Tampilkan Nama Akun dalam Bahasa Indonesia'
              : 'Tampilkan Nama Akun dalam Bahasa Inggris'}
          </button>
        </div>
      </div>

      {/* Year axis info */}
      <p className="text-[12px] text-ink-muted">
        Tahun historis: {years.join(', ')} ({yearCount} {yearCount === 1 ? 'tahun' : 'tahun'})
      </p>

      {/* Add accounts per section */}
      <div className="space-y-4">
        {ALL_SECTIONS.map((section) => (
          <SectionDropdown
            key={section}
            section={section}
            language={language}
            existingIds={existingIds}
            accounts={accounts.filter((a) => a.section === section)}
            onAdd={handleAddAccount}
            onAddCustom={handleAddCustom}
            onRemove={handleRemoveAccount}
          />
        ))}
      </div>

      {/* Financial table grid — always visible, structural rows shown even without accounts */}
      <RowInputGrid
        rows={dynamicManifest.rows}
        years={years}
        values={localRows}
        computedValues={{ ...crossRefValues, ...computedValues }}
        onChange={handleCellChange}
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
        {saved && (
          <span className="text-xs font-medium text-positive" role="status">
            Tersimpan
          </span>
        )}
      </footer>

      {/* Confirmation dialogs */}
      {showResetBS && (
        <ConfirmDialog
          title="Reset Balance Sheet"
          message="Yakin ingin mereset data Balance Sheet? Semua akun dan nilai yang sudah diinput akan dihapus."
          confirmLabel="Reset BS"
          onConfirm={handleResetBS}
          onCancel={() => setShowResetBS(false)}
        />
      )}
      {showResetAll && (
        <ConfirmDialog
          title="Reset Seluruh Data"
          message="Yakin ingin mereset SELURUH data? Semua input di semua halaman akan dihapus. Tindakan ini tidak bisa dibatalkan."
          confirmLabel="Reset Semua"
          destructive
          onConfirm={handleResetAll_}
          onCancel={() => setShowResetAll(false)}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section dropdown — add/remove accounts within a section
// ---------------------------------------------------------------------------

function SectionDropdown({
  section,
  language,
  existingIds,
  accounts,
  onAdd,
  onAddCustom,
  onRemove,
}: {
  section: BsSection
  language: 'en' | 'id'
  existingIds: Set<string>
  accounts: BsAccountEntry[]
  onAdd: (catalog: BsCatalogAccount) => void
  onAddCustom: (section: BsSection, label: string) => void
  onRemove: (catalogId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [customMode, setCustomMode] = useState(false)
  const [customLabel, setCustomLabel] = useState('')

  const available = getCatalogBySection(section, language).filter(
    (c) => !existingIds.has(c.id),
  )

  function handleSelect(catalog: BsCatalogAccount) {
    onAdd(catalog)
    setOpen(false)
  }

  function handleCustomSubmit() {
    if (customLabel.trim()) {
      onAddCustom(section, customLabel.trim())
      setCustomLabel('')
      setCustomMode(false)
      setOpen(false)
    }
  }

  return (
    <div className="rounded-sm border border-grid bg-canvas-raised p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
          {SECTION_LABELS[section]}
        </h3>
        <div className="relative">
          <button
            type="button"
            onClick={() => { setOpen(!open); setCustomMode(false) }}
            className="rounded-sm border border-dashed border-grid px-2 py-1 text-[11px] font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent"
          >
            + Tambah Akun
          </button>
          {open && (
            <div className="absolute right-0 top-full z-30 mt-1 w-64 rounded-sm border border-grid bg-canvas-raised shadow-lg">
              {!customMode ? (
                <ul className="max-h-48 overflow-y-auto py-1">
                  {available.map((cat) => (
                    <li key={cat.id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(cat)}
                        className="w-full px-3 py-1.5 text-left text-[12px] text-ink-soft transition-colors hover:bg-grid hover:text-ink"
                      >
                        {language === 'en' ? cat.labelEn : cat.labelId}
                      </button>
                    </li>
                  ))}
                  {available.length === 0 && (
                    <li className="px-3 py-1.5 text-[12px] text-ink-muted">
                      Semua akun sudah ditambahkan
                    </li>
                  )}
                  <li className="border-t border-grid">
                    <button
                      type="button"
                      onClick={() => setCustomMode(true)}
                      className="w-full px-3 py-1.5 text-left text-[12px] font-medium text-accent transition-colors hover:bg-accent/10"
                    >
                      Isi Manual...
                    </button>
                  </li>
                </ul>
              ) : (
                <div className="p-2">
                  <input
                    type="text"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCustomSubmit() }}
                    placeholder="Nama akun..."
                    className="w-full rounded-sm border border-grid bg-canvas px-2 py-1.5 text-[12px] text-ink focus:border-accent focus:outline-none"
                    autoFocus
                  />
                  <div className="mt-1.5 flex justify-end gap-1.5">
                    <button type="button" onClick={() => { setCustomMode(false); setCustomLabel('') }} className="px-2 py-1 text-[11px] text-ink-muted hover:text-ink">Batal</button>
                    <button type="button" onClick={handleCustomSubmit} className="rounded-sm bg-accent px-2 py-1 text-[11px] text-white hover:bg-accent/90">Tambah</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* List of added accounts */}
      {accounts.length > 0 && (
        <ul className="mt-2 space-y-1">
          {accounts.map((acc) => {
            const catalog = BS_CATALOG_ALL.find((c) => c.id === acc.catalogId)
            const label = acc.customLabel ?? (catalog ? (language === 'en' ? catalog.labelEn : catalog.labelId) : acc.catalogId)
            return (
              <li key={acc.catalogId} className="flex items-center gap-2 text-[12px] text-ink-soft">
                <button
                  type="button"
                  onClick={() => onRemove(acc.catalogId)}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-ink-muted transition-colors hover:bg-negative/10 hover:text-negative"
                  title="Hapus akun"
                >
                  <TrashIcon />
                </button>
                <span className={cn(acc.customLabel && 'italic')}>{label}</span>
                <span className="ml-auto font-mono text-[10px] text-ink-muted">row {acc.excelRow}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared UI pieces
// ---------------------------------------------------------------------------

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

function ConfirmDialog({
  title, message, confirmLabel, destructive, onConfirm, onCancel,
}: {
  title: string; message: string; confirmLabel: string
  destructive?: boolean; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm" onClick={onCancel} role="dialog" aria-modal="true" aria-label={title}>
      <div className="mx-4 w-full max-w-sm rounded-sm border border-grid bg-canvas-raised p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <p className="mt-2 text-sm text-ink-soft">{message}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-sm border border-grid px-3 py-1.5 text-[13px] font-medium text-ink-soft transition-colors hover:bg-grid">Batal</button>
          <button type="button" onClick={onConfirm} className={destructive ? 'rounded-sm bg-negative px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-negative/90' : 'rounded-sm bg-accent px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent/90'}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useCallback, useState } from 'react'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { exportToXlsx, downloadBlob, buildExportFilename } from '@/lib/export'
import type { ExportableState } from '@/lib/export'
import { cn } from '@/lib/utils/cn'
import { useT } from '@/lib/i18n/useT'

/**
 * Export button — generates a .xlsx from the user's live data using the
 * template-based approach (clone original workbook, inject user data,
 * preserve all 3,084 formulas).
 *
 * Disabled when `home === null` (seed mode — no user data to export).
 */
export function ExportButton() {
  const home = useKkaStore((s) => s.home)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { t } = useT()

  const handleExport = useCallback(async () => {
    setExporting(true)
    setError(null)

    try {
      // Read full store state (non-subscribed snapshot — LESSON-034)
      const state = useKkaStore.getState()

      const exportState: ExportableState = {
        home: state.home,
        balanceSheet: state.balanceSheet,
        incomeStatement: state.incomeStatement,
        fixedAsset: state.fixedAsset,
        accPayables: state.accPayables,
        wacc: state.wacc,
        discountRate: state.discountRate,
        keyDrivers: state.keyDrivers,
        dlom: state.dlom,
        dloc: state.dloc,
        borrowingCapInput: state.borrowingCapInput,
        aamAdjustments: state.aamAdjustments,
        nilaiPengalihanDilaporkan: state.nilaiPengalihanDilaporkan,
        interestBearingDebt: state.interestBearingDebt,
      }

      const blob = await exportToXlsx(exportState)

      const filename = buildExportFilename(
        state.home?.namaPerusahaan ?? 'Perusahaan',
      )
      downloadBlob(blob, filename)
    } catch (e) {
      const message = e instanceof Error ? e.message : t('export.errorFallback')
      setError(message)
    } finally {
      setExporting(false)
    }
  }, [t])

  const disabled = !home || exporting

  return (
    <div className="px-3 py-3">
      <button
        type="button"
        onClick={handleExport}
        disabled={disabled}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-sm border px-3 py-2 text-[13px] font-medium transition-colors',
          disabled
            ? 'cursor-not-allowed border-grid bg-canvas text-ink-muted'
            : 'border-accent bg-accent/10 text-accent hover:bg-accent/20 active:bg-accent/30',
        )}
        title={!home ? t('export.disabledTitle') : t('export.enabledTitle')}
      >
        {exporting ? (
          <>
            <SpinnerIcon />
            {t('export.exporting')}
          </>
        ) : (
          <>
            <DownloadIcon />
            {t('export.buttonLabel')}
          </>
        )}
      </button>

      {error && (
        <p className="mt-1.5 text-[11px] text-negative" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function DownloadIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="animate-spin"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" opacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" opacity="1" />
    </svg>
  )
}

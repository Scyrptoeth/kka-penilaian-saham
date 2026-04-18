'use client'

import { useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { useKkaStore, computeProporsiSaham } from '@/lib/store/useKkaStore'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { BALANCE_SHEET_MANIFEST } from '@/data/manifests/balance-sheet'
import { computeAam } from '@/lib/calculations/aam-valuation'
import { buildAamInput } from '@/lib/calculations/upstream-helpers'
import { formatIdr, formatPercent } from '@/components/financial/format'
import { parseFinancialInput } from '@/components/forms/parse-financial-input'
import { PageEmptyState } from '@/components/shared/PageEmptyState'
import { useT } from '@/lib/i18n/useT'
import type { TranslationKey } from '@/lib/i18n/translations'
import {
  type BsAccountEntry,
  type BsSection,
  resolveAccountLabel,
} from '@/data/catalogs/balance-sheet-catalog'

// ---------------------------------------------------------------------------
// AAM section definitions — maps BS sections to display groups
// ---------------------------------------------------------------------------

interface AamSection {
  /** Translation key for section header */
  title: TranslationKey
  /** BS sections to include */
  bsSections: readonly BsSection[]
  /** Type: 'asset' | 'liability' | 'equity' for subtotal labeling */
  type: 'asset' | 'liability' | 'equity'
  /** Translation key for subtotal label */
  subtotalLabel: TranslationKey
  /** Key in AamResult for subtotal E column value */
  subtotalResultKey?: string
}

const AAM_SECTIONS: readonly AamSection[] = [
  {
    title: 'aam.section.currentAssets',
    bsSections: ['current_assets'],
    type: 'asset',
    subtotalLabel: 'aam.subtotal.currentAssets',
    subtotalResultKey: 'totalCurrentAssets',
  },
  {
    title: 'aam.section.nonCurrentAssets',
    bsSections: ['other_non_current_assets', 'intangible_assets'],
    type: 'asset',
    subtotalLabel: 'aam.subtotal.nonCurrentAssets',
    subtotalResultKey: 'totalNonCurrentAssets',
  },
  {
    title: 'aam.section.currentLiabilities',
    bsSections: ['current_liabilities'],
    type: 'liability',
    subtotalLabel: 'aam.subtotal.currentLiabilities',
    subtotalResultKey: 'totalCurrentLiabilities',
  },
  {
    title: 'aam.section.nonCurrentLiabilities',
    bsSections: ['non_current_liabilities'],
    type: 'liability',
    subtotalLabel: 'aam.subtotal.nonCurrentLiabilities',
    subtotalResultKey: 'totalNonCurrentLiabilities',
  },
  {
    title: 'aam.section.equity',
    bsSections: ['equity'],
    type: 'equity',
    subtotalLabel: 'aam.subtotal.equity',
    subtotalResultKey: 'totalEquity',
  },
]

// Fixed Asset Net — special row not in BS accounts, always included in NCA
const FIXED_ASSET_NET_ROW = 22

// ---------------------------------------------------------------------------
// AdjustmentCell — inline editable cell for D column
// ---------------------------------------------------------------------------

function AdjustmentCell({
  value,
  onCommit,
  editTitle,
}: {
  value: number
  onCommit: (v: number) => void
  editTitle: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const isEditing = draft !== null

  const handleBlur = useCallback(() => {
    if (draft === null) return
    const parsed = parseFinancialInput(draft)
    if (parsed !== value) onCommit(parsed)
    setDraft(null)
  }, [draft, value, onCommit])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    } else if (e.key === 'Escape') {
      setDraft(null)
    }
  }, [])

  return (
    <td className="px-1 py-1 text-right">
      {isEditing ? (
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          className="w-full rounded border border-accent/40 bg-canvas px-2 py-1 text-right font-mono text-sm tabular-nums text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setDraft(value === 0 ? '' : String(value))}
          className="w-full rounded px-2 py-1 text-right font-mono text-sm tabular-nums text-accent hover:bg-accent/5 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          title={editTitle}
        >
          {formatIdr(value)}
        </button>
      )}
    </td>
  )
}

// ---------------------------------------------------------------------------
// Main AAM Page
// ---------------------------------------------------------------------------

export default function AamPage() {
  const home = useKkaStore(s => s.home)
  const balanceSheet = useKkaStore(s => s.balanceSheet)
  const aamAdjustments = useKkaStore(s => s.aamAdjustments)
  const setAamAdjustments = useKkaStore(s => s.setAamAdjustments)
  const interestBearingDebt = useKkaStore(s => s.interestBearingDebt)
  const hasHydrated = useKkaStore(s => s._hasHydrated)
  const { t, language } = useT()

  const handleAdjustmentCommit = useCallback((bsRow: number, value: number) => {
    const next = { ...aamAdjustments }
    if (value === 0) {
      delete next[bsRow]
    } else {
      next[bsRow] = value
    }
    setAamAdjustments(next)
  }, [aamAdjustments, setAamAdjustments])

  const data = useMemo(() => {
    if (!hasHydrated || !home || !balanceSheet || interestBearingDebt === null) return null

    const histYears = computeHistoricalYears(home.tahunTransaksi, 4)
    const bsComp = deriveComputedRows(BALANCE_SHEET_MANIFEST.rows, balanceSheet.rows, histYears)
    const allBs = { ...bsComp, ...balanceSheet.rows }
    const ly = histYears[histYears.length - 1]!

    const result = computeAam(buildAamInput({
      accounts: balanceSheet.accounts,
      allBs,
      lastYear: ly,
      home,
      aamAdjustments,
      interestBearingDebt,
    }))

    return { result, allBs, ly, accounts: balanceSheet.accounts }
  }, [hasHydrated, home, balanceSheet, aamAdjustments, interestBearingDebt])

  if (!hasHydrated) {
    return <div className="mx-auto max-w-[1100px] p-6 text-sm text-ink-muted">{t('common.loadingData')}</div>
  }

  if (!data) {
    return (
      <PageEmptyState
        section="PENILAIAN"
        title="AAM"
        inputs={[
          { label: 'HOME', href: '/', filled: !!home },
          { label: 'Balance Sheet', href: '/input/balance-sheet', filled: !!balanceSheet },
          { label: t('nav.item.interestBearingDebt'), href: '/valuation/interest-bearing-debt', filled: interestBearingDebt !== null },
        ]}
      />
    )
  }

  const { result: r, allBs, ly, accounts } = data
  const bs = (row: number) => allBs[row]?.[ly] ?? 0

  /** Get accounts belonging to given BS sections, in store order */
  const getAccountsForSections = (sections: readonly BsSection[]): BsAccountEntry[] => {
    const sectionSet = new Set(sections)
    return accounts.filter(a => sectionSet.has(a.section))
  }

  /** Sum adjustments for a set of excelRows */
  const sumAdj = (rows: number[]) => rows.reduce((s, row) => s + (aamAdjustments[row] ?? 0), 0)

  // Build list of all excelRows per section for subtotal D-column sum
  const sectionExcelRows = (section: AamSection): number[] => {
    const rows = getAccountsForSections(section.bsSections).map(a => a.excelRow)
    // NCA sections include Fixed Asset Net row
    if (section.bsSections.includes('other_non_current_assets') || section.bsSections.includes('intangible_assets')) {
      if (section === AAM_SECTIONS[1]) rows.push(FIXED_ASSET_NET_ROW)
    }
    return rows
  }

  return (
    <div className="mx-auto max-w-[1100px] p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">{t('aam.title')}</h1>
      <p className="mb-6 text-sm text-ink-muted">{t('aam.subtitle')}</p>

      {/* Dynamic Balance Sheet Table */}
      <div className="mb-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-grid-strong">
              <th className="px-3 py-2 text-left font-medium text-ink-muted">{t('aam.table.description')}</th>
              <th className="px-3 py-2 text-right font-medium text-ink-muted">{t('aam.table.historical')}</th>
              <th className="px-3 py-2 text-right font-medium text-ink-muted">{t('aam.table.adjustment')}</th>
              <th className="px-3 py-2 text-right font-medium text-ink-muted">{t('aam.table.adjusted')}</th>
            </tr>
          </thead>
          <tbody>
            {AAM_SECTIONS.map((section, sIdx) => {
              const sectionAccounts = getAccountsForSections(section.bsSections)
              const allRows = sectionExcelRows(section)
              const adjTotal = sumAdj(allRows)

              // Get subtotal E value from result
              const subtotalE = section.subtotalResultKey
                ? (r as unknown as Record<string, number>)[section.subtotalResultKey]
                : undefined

              return (
                <SectionGroup key={sIdx}>
                  {/* Section header */}
                  <tr className="border-t-2 border-grid-strong">
                    <td colSpan={4} className="px-3 pt-3 pb-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">
                      {t(section.title)}
                    </td>
                  </tr>

                  {/* Special: Fixed Asset Net for NCA section */}
                  {section === AAM_SECTIONS[1] && (
                    <AccountRow
                      label={t('aam.fixedAssetNet')}
                      bsRow={FIXED_ASSET_NET_ROW}
                      bsVal={bs(FIXED_ASSET_NET_ROW)}
                      adjVal={aamAdjustments[FIXED_ASSET_NET_ROW] ?? 0}
                      onAdjCommit={handleAdjustmentCommit}
                      editTitle={t('aam.editAdjustment')}
                    />
                  )}

                  {/* Dynamic account rows */}
                  {sectionAccounts.map((acct) => (
                    <AccountRow
                      key={acct.excelRow}
                      label={resolveAccountLabel(acct, language)}
                      bsRow={acct.excelRow}
                      bsVal={bs(acct.excelRow)}
                      adjVal={aamAdjustments[acct.excelRow] ?? 0}
                      onAdjCommit={handleAdjustmentCommit}
                      editTitle={t('aam.editAdjustment')}
                    />
                  ))}

                  {/* Section subtotal */}
                  <tr className="border-t border-grid-strong bg-canvas-raised font-semibold">
                    <td className="px-3 py-2 text-ink">{t(section.subtotalLabel)}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums" />
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-ink-muted">{formatIdr(adjTotal)}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{subtotalE !== undefined ? formatIdr(subtotalE) : ''}</td>
                  </tr>
                </SectionGroup>
              )
            })}

            {/* TOTAL ASSETS row */}
            <tr className="border-t-2 border-grid-strong bg-canvas-raised font-bold">
              <td className="px-3 py-2 text-ink">{t('aam.totalAssets')}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums" />
              <td className="px-3 py-2 text-right font-mono tabular-nums text-ink-muted" />
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(r.totalAssets)}</td>
            </tr>

            {/* TOTAL LIABILITIES & EQUITY row */}
            <tr className="border-t border-grid-strong bg-canvas-raised font-bold">
              <td className="px-3 py-2 text-ink">{t('aam.totalLiabilitiesEquity')}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums" />
              <td className="px-3 py-2 text-right font-mono tabular-nums text-ink-muted" />
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(r.totalLiabilitiesAndEquity)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Session 038 — IBD workflow cross-reference note */}
      <aside
        role="note"
        aria-label={t('aam.tleNote.linkAria')}
        className="mb-8 rounded-sm border-l-2 border-accent bg-canvas-raised px-4 py-3 text-[13px] leading-relaxed text-ink-soft"
      >
        {t('aam.tleNote.prefix')}{' '}
        <Link
          href="/valuation/interest-bearing-debt"
          aria-label={t('aam.tleNote.linkAria')}
          className="font-semibold text-accent underline decoration-accent/40 underline-offset-2 transition-colors hover:decoration-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {t('aam.tleNote.linkText')}
        </Link>
        .
      </aside>

      {/* Valuation Chain */}
      <h2 className="mb-3 text-base font-semibold text-ink">{t('aam.valuation')}</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-grid-strong">
              <th className="px-3 py-2 text-left font-medium text-ink-muted">{t('common.description')}</th>
              <th className="px-3 py-2 text-right font-medium text-ink-muted">{t('common.value')}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">{t('aam.netAssetValue')}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(r.netAssetValue)}</td>
            </tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">{t('aam.interestBearingDebt')}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(r.interestBearingDebt)}</td>
            </tr>
            <tr className="border-b border-grid font-semibold">
              <td className="px-3 py-2 text-ink">{t('aam.equityValue')}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(r.equityValue)}</td>
            </tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">{t('aam.dlomLabel')} ({formatPercent(home!.dlomPercent)})</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums text-negative">{formatIdr(r.dlomDiscount)}</td>
            </tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">{t('aam.equityLessDlom')}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(r.equityLessDlom)}</td>
            </tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">{t('aam.dlocPfcLabel')} ({formatPercent(home!.dlocPercent)})</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums text-negative">{formatIdr(r.dlocDiscount)}</td>
            </tr>
            <tr className="border-b border-grid font-semibold">
              <td className="px-3 py-2 text-ink">{t('aam.marketValue100')}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(r.marketValue100)}</td>
            </tr>
            <tr className="border-t-2 border-grid-strong bg-canvas-raised">
              <td className="px-3 py-3 font-semibold text-ink">{t('aam.marketValuePortion')} ({formatPercent(computeProporsiSaham(home!))} {t('common.equity')})</td>
              <td className="px-3 py-3 text-right font-mono text-lg font-semibold tabular-nums text-accent">
                {formatIdr(r.marketValuePortion)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

/** Fragment wrapper for section groups */
function SectionGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

/** Single account row with editable D column */
function AccountRow({
  label,
  bsRow,
  bsVal,
  adjVal,
  onAdjCommit,
  editTitle,
}: {
  label: string
  bsRow: number
  bsVal: number
  adjVal: number
  onAdjCommit: (bsRow: number, value: number) => void
  editTitle: string
}) {
  return (
    <tr className="border-b border-grid">
      <td className="px-3 py-2 text-ink">{label}</td>
      <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(bsVal)}</td>
      <AdjustmentCell
        value={adjVal}
        onCommit={(v) => onAdjCommit(bsRow, v)}
        editTitle={editTitle}
      />
      <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(bsVal + adjVal)}</td>
    </tr>
  )
}

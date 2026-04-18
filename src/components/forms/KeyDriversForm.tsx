'use client'

import { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import type { KeyDriversState } from '@/lib/store/useKkaStore'
import { computeSalesVolumes, computeSalesPrices } from '@/lib/calculations/key-drivers'
import { useT } from '@/lib/i18n/useT'
import type { FaAccountEntry } from '@/data/catalogs/fixed-asset-catalog'
import { getCatalogAccount } from '@/data/catalogs/fixed-asset-catalog'
import type { YearKeyedSeries } from '@/types/financial'

const NUM_PROJECTION_YEARS = 7

function makeDefaultArray(len: number, val: number): number[] {
  return Array.from({ length: len }, () => val)
}

function defaultState(): KeyDriversState {
  return {
    financialDrivers: {
      interestRateShortTerm: 0.14,
      interestRateLongTerm: 0.12,
      bankDepositRate: 0.09,
      corporateTaxRate: 0.22,
    },
    operationalDrivers: {
      salesVolumeBase: 0,
      salesPriceBase: 0,
      salesVolumeIncrements: makeDefaultArray(NUM_PROJECTION_YEARS - 1, 0.05),
      salesPriceIncrements: makeDefaultArray(NUM_PROJECTION_YEARS - 1, 0.05),
      cogsRatio: 0,
      sellingExpenseRatio: 0,
      gaExpenseRatio: 0,
    },
    bsDrivers: {
      accReceivableDays: makeDefaultArray(NUM_PROJECTION_YEARS, 35),
      inventoryDays: makeDefaultArray(NUM_PROJECTION_YEARS, 50),
      accPayableDays: makeDefaultArray(NUM_PROJECTION_YEARS, 90),
    },
    additionalCapexByAccount: {},
  }
}

interface KeyDriversFormProps {
  initial: KeyDriversState | null
  baseYear: number
  onSave: (state: KeyDriversState) => void
  /** Auto-computed ratios from IS data — used as defaults if Key Drivers not yet saved */
  isAutoRatios?: { cogsRatio: number; opexRatio: number; taxRate: number } | null
  /** Session 036: FA accounts for dynamic Additional Capex rows. */
  faAccounts?: readonly FaAccountEntry[]
  /** Active language for FA account labels. */
  faAccountLanguage?: 'en' | 'id'
}

export function KeyDriversForm({
  initial, baseYear, onSave, isAutoRatios,
  faAccounts = [], faAccountLanguage = 'en',
}: KeyDriversFormProps) {
  const { t } = useT()
  const [state, setState] = useState<KeyDriversState>(() => {
    if (initial) return initial
    const base = defaultState()
    // Auto-populate from IS data if Key Drivers not yet saved
    if (isAutoRatios) {
      return {
        ...base,
        financialDrivers: { ...base.financialDrivers, corporateTaxRate: isAutoRatios.taxRate },
        operationalDrivers: { ...base.operationalDrivers, cogsRatio: isAutoRatios.cogsRatio, gaExpenseRatio: isAutoRatios.opexRatio },
      }
    }
    return base
  })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const projYears = useMemo(
    () => Array.from({ length: NUM_PROJECTION_YEARS }, (_, i) => baseYear + i),
    [baseYear],
  )

  // Debounced persist
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onSave(state), 500)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [state, onSave])

  const salesVols = useMemo(
    () => computeSalesVolumes(state.operationalDrivers.salesVolumeBase, state.operationalDrivers.salesVolumeIncrements),
    [state.operationalDrivers.salesVolumeBase, state.operationalDrivers.salesVolumeIncrements],
  )

  const salesPrices = useMemo(
    () => computeSalesPrices(state.operationalDrivers.salesPriceBase, state.operationalDrivers.salesPriceIncrements),
    [state.operationalDrivers.salesPriceBase, state.operationalDrivers.salesPriceIncrements],
  )

  // Session 036: per-account Additional Capex. Total per year = sum across
  // all accounts. Accounts iterated in fixedAsset.accounts order.
  const totalCapex = useMemo<number[]>(() => {
    return projYears.map((year) => {
      let sum = 0
      for (const acct of faAccounts) {
        sum += state.additionalCapexByAccount[acct.excelRow]?.[year] ?? 0
      }
      return sum
    })
  }, [state.additionalCapexByAccount, projYears, faAccounts])

  // --- Updaters ---
  const updateFin = useCallback((key: keyof KeyDriversState['financialDrivers'], raw: string) => {
    const v = parseFloat(raw)
    setState(s => ({
      ...s,
      financialDrivers: { ...s.financialDrivers, [key]: Number.isFinite(v) ? v / 100 : 0 },
    }))
  }, [])

  const updateOpScalar = useCallback((key: string, raw: string) => {
    const v = parseFloat(raw)
    setState(s => ({
      ...s,
      operationalDrivers: { ...s.operationalDrivers, [key]: Number.isFinite(v) ? v : 0 },
    }))
  }, [])

  const updateOpRatio = useCallback((key: string, raw: string) => {
    const v = parseFloat(raw)
    setState(s => ({
      ...s,
      operationalDrivers: { ...s.operationalDrivers, [key]: Number.isFinite(v) ? v / 100 : 0 },
    }))
  }, [])

  const updateIncrement = useCallback((field: 'salesVolumeIncrements' | 'salesPriceIncrements', idx: number, raw: string) => {
    const v = parseFloat(raw)
    setState(s => {
      const arr = [...s.operationalDrivers[field]]
      arr[idx] = Number.isFinite(v) ? v / 100 : 0
      return { ...s, operationalDrivers: { ...s.operationalDrivers, [field]: arr } }
    })
  }, [])

  const updateBsDriver = useCallback((field: keyof KeyDriversState['bsDrivers'], idx: number, raw: string) => {
    const v = parseFloat(raw)
    setState(s => {
      const arr = [...s.bsDrivers[field]]
      arr[idx] = Number.isFinite(v) ? v : 0
      return { ...s, bsDrivers: { ...s.bsDrivers, [field]: arr } }
    })
  }, [])

  const updateCapex = useCallback((excelRow: number, year: number, raw: string) => {
    const v = parseFloat(raw)
    setState((s) => {
      const byAccount = { ...s.additionalCapexByAccount }
      const series: YearKeyedSeries = { ...(byAccount[excelRow] ?? {}) }
      series[year] = Number.isFinite(v) ? v : 0
      byAccount[excelRow] = series
      return { ...s, additionalCapexByAccount: byAccount }
    })
  }, [])

  const IDR = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })

  return (
    <div className="space-y-8">
      {/* Section 1 — Financial Drivers */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-ink">{t('keyDrivers.financialDrivers')}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {([
            ['interestRateShortTerm', t('keyDrivers.field.interestRateST')],
            ['interestRateLongTerm', t('keyDrivers.field.interestRateLT')],
            ['bankDepositRate', t('keyDrivers.field.depositRate')],
            ['corporateTaxRate', t('keyDrivers.field.taxRate')],
          ] as [keyof KeyDriversState['financialDrivers'], string][]).map(([key, label]) => (
            <div key={key}>
              <label className="mb-1 block text-sm font-medium text-ink-soft">{label}</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.1"
                  className="w-full rounded border border-grid bg-canvas px-2 py-1.5 text-right font-mono text-sm tabular-nums focus-visible:ring-2 focus-visible:ring-accent"
                  value={state.financialDrivers[key] ? (state.financialDrivers[key] * 100).toString() : ''}
                  onChange={e => updateFin(key, e.target.value)}
                  placeholder="0"
                />
                <span className="text-sm text-ink-muted">%</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 2 — Operational Drivers */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-ink">{t('keyDrivers.operationalDrivers')}</h2>

        {/* Sales Volume */}
        <h3 className="mb-2 text-sm font-medium text-ink-soft">{t('keyDrivers.salesVolume')}</h3>
        <div className="mb-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-grid">
                <th className="px-2 py-1 text-left text-ink-muted" />
                {projYears.map(y => (
                  <th key={y} className="px-2 py-1 text-right font-mono text-ink-muted tabular-nums">{y}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-grid">
                <td className="px-2 py-1 text-ink">{t('keyDrivers.volume')}</td>
                <td className="px-2 py-1">
                  <input type="number" className="w-28 rounded border border-grid bg-canvas px-2 py-1 text-right font-mono text-sm tabular-nums focus-visible:ring-2 focus-visible:ring-accent"
                    value={state.operationalDrivers.salesVolumeBase || ''} onChange={e => updateOpScalar('salesVolumeBase', e.target.value)} placeholder="0" />
                </td>
                {salesVols.slice(1).map((v, i) => (
                  <td key={i} className="px-2 py-1 text-right font-mono tabular-nums text-ink-muted">{IDR.format(v)}</td>
                ))}
              </tr>
              <tr className="border-b border-grid">
                <td className="px-2 py-1 text-ink">{t('keyDrivers.increment')}</td>
                <td className="px-2 py-1 text-center text-ink-muted">—</td>
                {state.operationalDrivers.salesVolumeIncrements.map((inc, i) => (
                  <td key={i} className="px-2 py-1">
                    <div className="flex items-center gap-0.5">
                      <input type="number" step="1" className="w-16 rounded border border-grid bg-canvas px-1 py-1 text-right font-mono text-sm tabular-nums focus-visible:ring-2 focus-visible:ring-accent"
                        value={inc ? (inc * 100).toString() : ''} onChange={e => updateIncrement('salesVolumeIncrements', i, e.target.value)} placeholder="0" />
                      <span className="text-xs text-ink-muted">%</span>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Sales Price */}
        <h3 className="mb-2 text-sm font-medium text-ink-soft">{t('keyDrivers.salesPrice')}</h3>
        <div className="mb-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-grid">
                <th className="px-2 py-1 text-left text-ink-muted" />
                {projYears.map(y => (
                  <th key={y} className="px-2 py-1 text-right font-mono text-ink-muted tabular-nums">{y}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-grid">
                <td className="px-2 py-1 text-ink">{t('keyDrivers.price')}</td>
                <td className="px-2 py-1">
                  <input type="number" className="w-28 rounded border border-grid bg-canvas px-2 py-1 text-right font-mono text-sm tabular-nums focus-visible:ring-2 focus-visible:ring-accent"
                    value={state.operationalDrivers.salesPriceBase || ''} onChange={e => updateOpScalar('salesPriceBase', e.target.value)} placeholder="0" />
                </td>
                {salesPrices.slice(1).map((v, i) => (
                  <td key={i} className="px-2 py-1 text-right font-mono tabular-nums text-ink-muted">{IDR.format(v)}</td>
                ))}
              </tr>
              <tr className="border-b border-grid">
                <td className="px-2 py-1 text-ink">{t('keyDrivers.increment')}</td>
                <td className="px-2 py-1 text-center text-ink-muted">—</td>
                {state.operationalDrivers.salesPriceIncrements.map((inc, i) => (
                  <td key={i} className="px-2 py-1">
                    <div className="flex items-center gap-0.5">
                      <input type="number" step="1" className="w-16 rounded border border-grid bg-canvas px-1 py-1 text-right font-mono text-sm tabular-nums focus-visible:ring-2 focus-visible:ring-accent"
                        value={inc ? (inc * 100).toString() : ''} onChange={e => updateIncrement('salesPriceIncrements', i, e.target.value)} placeholder="0" />
                      <span className="text-xs text-ink-muted">%</span>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Cost/Expense Ratios */}
        <h3 className="mb-2 text-sm font-medium text-ink-soft">{t('keyDrivers.costRatios')}</h3>
        <p className="mb-3 text-xs text-ink-muted">{t('keyDrivers.costRatiosHint')}</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {([
            ['cogsRatio', t('keyDrivers.field.cogs')],
            ['sellingExpenseRatio', t('keyDrivers.field.sellingExp')],
            ['gaExpenseRatio', t('keyDrivers.field.gaExp')],
          ] as ['cogsRatio' | 'sellingExpenseRatio' | 'gaExpenseRatio', string][]).map(([key, label]) => (
            <div key={key}>
              <label className="mb-1 block text-sm font-medium text-ink-soft">{label}</label>
              <div className="flex items-center gap-1">
                <input type="number" step="0.1"
                  className="w-full rounded border border-grid bg-canvas px-2 py-1.5 text-right font-mono text-sm tabular-nums focus-visible:ring-2 focus-visible:ring-accent"
                  value={state.operationalDrivers[key] ? (state.operationalDrivers[key] * 100).toString() : ''}
                  onChange={e => updateOpRatio(key, e.target.value)} placeholder="0" />
                <span className="text-sm text-ink-muted">%</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 3 — Balance Sheet Drivers */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-ink">{t('keyDrivers.bsDrivers')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-grid">
                <th className="px-2 py-1 text-left text-ink-muted" />
                {projYears.map(y => (
                  <th key={y} className="px-2 py-1 text-right font-mono text-ink-muted tabular-nums">{y}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {([
                ['accReceivableDays', t('keyDrivers.field.arDays')],
                ['inventoryDays', t('keyDrivers.field.invDays')],
                ['accPayableDays', t('keyDrivers.field.apDays')],
              ] as [keyof KeyDriversState['bsDrivers'], string][]).map(([field, label]) => (
                <tr key={field} className="border-b border-grid">
                  <td className="px-2 py-1 text-ink">{label}</td>
                  {state.bsDrivers[field].map((v, i) => (
                    <td key={i} className="px-2 py-1">
                      <input type="number" step="1"
                        className="w-16 rounded border border-grid bg-canvas px-1 py-1 text-right font-mono text-sm tabular-nums focus-visible:ring-2 focus-visible:ring-accent"
                        value={v || ''} onChange={e => updateBsDriver(field, i, e.target.value)} placeholder="0" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 4 — Additional Capex (Session 036 dynamic per-FA-account) */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-ink">{t('keyDrivers.additionalCapex')}</h2>
        {faAccounts.length === 0 ? (
          <p className="text-sm text-ink-muted">
            {t('keyDrivers.additionalCapex.emptyState')}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-grid">
                  <th className="px-2 py-1 text-left text-ink-muted" />
                  {projYears.map((y) => (
                    <th key={y} className="px-2 py-1 text-right font-mono text-ink-muted tabular-nums">{y}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {faAccounts.map((acct) => {
                  const label =
                    acct.customLabel
                    ?? (getCatalogAccount(acct.catalogId)?.[faAccountLanguage === 'en' ? 'labelEn' : 'labelId'])
                    ?? acct.catalogId
                  const series = state.additionalCapexByAccount[acct.excelRow] ?? {}
                  return (
                    <tr key={acct.excelRow} className="border-b border-grid">
                      <td className="px-2 py-1 text-ink">{label}</td>
                      {projYears.map((y) => (
                        <td key={y} className="px-2 py-1">
                          <input
                            type="number"
                            step="1"
                            className="w-28 rounded border border-grid bg-canvas px-1 py-1 text-right font-mono text-sm tabular-nums focus-visible:ring-2 focus-visible:ring-accent"
                            value={series[y] || ''}
                            onChange={(e) => updateCapex(acct.excelRow, y, e.target.value)}
                            placeholder="0"
                          />
                        </td>
                      ))}
                    </tr>
                  )
                })}
                <tr className="border-t-2 border-grid-strong bg-canvas-raised font-semibold">
                  <td className="px-2 py-1 text-ink">{t('common.total')}</td>
                  {totalCapex.map((v, i) => (
                    <td key={i} className="px-2 py-1 text-right font-mono tabular-nums">{IDR.format(v)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

'use client'

import { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import type { KeyDriversState } from '@/lib/store/useKkaStore'
import { computeSalesVolumes, computeSalesPrices, computeTotalCapex } from '@/lib/calculations/key-drivers'

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
    additionalCapex: {
      land: makeDefaultArray(NUM_PROJECTION_YEARS, 0),
      building: makeDefaultArray(NUM_PROJECTION_YEARS, 0),
      equipment: makeDefaultArray(NUM_PROJECTION_YEARS, 0),
      others: makeDefaultArray(NUM_PROJECTION_YEARS, 0),
    },
  }
}

interface KeyDriversFormProps {
  initial: KeyDriversState | null
  baseYear: number
  onSave: (state: KeyDriversState) => void
}

export function KeyDriversForm({ initial, baseYear, onSave }: KeyDriversFormProps) {
  const [state, setState] = useState<KeyDriversState>(initial ?? defaultState)
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

  const totalCapex = useMemo(
    () => computeTotalCapex(
      state.additionalCapex.land,
      state.additionalCapex.building,
      state.additionalCapex.equipment,
      state.additionalCapex.others,
    ),
    [state.additionalCapex],
  )

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

  const updateCapex = useCallback((field: keyof KeyDriversState['additionalCapex'], idx: number, raw: string) => {
    const v = parseFloat(raw)
    setState(s => {
      const arr = [...s.additionalCapex[field]]
      arr[idx] = Number.isFinite(v) ? v : 0
      return { ...s, additionalCapex: { ...s.additionalCapex, [field]: arr } }
    })
  }, [])

  const IDR = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })

  return (
    <div className="space-y-8">
      {/* Section 1 — Financial Drivers */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-ink">Financial Drivers</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {([
            ['interestRateShortTerm', 'Interest Rate (Short Term Loan)'],
            ['interestRateLongTerm', 'Interest Rate (Long Term Loan)'],
            ['bankDepositRate', 'Bank Deposit Rate'],
            ['corporateTaxRate', 'Corporate Tax Rate'],
          ] as const).map(([key, label]) => (
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
        <h2 className="mb-4 text-lg font-semibold text-ink">Operational Drivers</h2>

        {/* Sales Volume */}
        <h3 className="mb-2 text-sm font-medium text-ink-soft">Sales Volume (unit)</h3>
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
                <td className="px-2 py-1 text-ink">Volume</td>
                <td className="px-2 py-1">
                  <input type="number" className="w-28 rounded border border-grid bg-canvas px-2 py-1 text-right font-mono text-sm tabular-nums focus-visible:ring-2 focus-visible:ring-accent"
                    value={state.operationalDrivers.salesVolumeBase || ''} onChange={e => updateOpScalar('salesVolumeBase', e.target.value)} placeholder="0" />
                </td>
                {salesVols.slice(1).map((v, i) => (
                  <td key={i} className="px-2 py-1 text-right font-mono tabular-nums text-ink-muted">{IDR.format(v)}</td>
                ))}
              </tr>
              <tr className="border-b border-grid">
                <td className="px-2 py-1 text-ink">Increment</td>
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
        <h3 className="mb-2 text-sm font-medium text-ink-soft">Sales Price (IDR/unit)</h3>
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
                <td className="px-2 py-1 text-ink">Price</td>
                <td className="px-2 py-1">
                  <input type="number" className="w-28 rounded border border-grid bg-canvas px-2 py-1 text-right font-mono text-sm tabular-nums focus-visible:ring-2 focus-visible:ring-accent"
                    value={state.operationalDrivers.salesPriceBase || ''} onChange={e => updateOpScalar('salesPriceBase', e.target.value)} placeholder="0" />
                </td>
                {salesPrices.slice(1).map((v, i) => (
                  <td key={i} className="px-2 py-1 text-right font-mono tabular-nums text-ink-muted">{IDR.format(v)}</td>
                ))}
              </tr>
              <tr className="border-b border-grid">
                <td className="px-2 py-1 text-ink">Increment</td>
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
        <h3 className="mb-2 text-sm font-medium text-ink-soft">Cost &amp; Expense Ratios (% of Revenue)</h3>
        <p className="mb-3 text-xs text-ink-muted">Input sebagai angka positif. Sign convention ditangani otomatis di computation.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {([
            ['cogsRatio', 'COGS (% of Revenue)'],
            ['sellingExpenseRatio', 'Selling Expense (% of Revenue)'],
            ['gaExpenseRatio', 'G&A Expense (% of Revenue)'],
          ] as const).map(([key, label]) => (
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
        <h2 className="mb-4 text-lg font-semibold text-ink">Balance Sheet Drivers (Working Capital Days)</h2>
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
                ['accReceivableDays', 'Acc. Receivable (days)'],
                ['inventoryDays', 'Inventory (days)'],
                ['accPayableDays', 'Acc. Payable (days)'],
              ] as const).map(([field, label]) => (
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

      {/* Section 4 — Additional Capex */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-ink">Additional Capex</h2>
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
                ['land', 'Land'],
                ['building', 'Building'],
                ['equipment', 'Equipment'],
                ['others', 'Others'],
              ] as const).map(([field, label]) => (
                <tr key={field} className="border-b border-grid">
                  <td className="px-2 py-1 text-ink">{label}</td>
                  {state.additionalCapex[field].map((v, i) => (
                    <td key={i} className="px-2 py-1">
                      <input type="number" step="1"
                        className="w-28 rounded border border-grid bg-canvas px-1 py-1 text-right font-mono text-sm tabular-nums focus-visible:ring-2 focus-visible:ring-accent"
                        value={v || ''} onChange={e => updateCapex(field, i, e.target.value)} placeholder="0" />
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t-2 border-grid-strong bg-canvas-raised font-semibold">
                <td className="px-2 py-1 text-ink">Total</td>
                {totalCapex.map((v, i) => (
                  <td key={i} className="px-2 py-1 text-right font-mono tabular-nums">{IDR.format(v)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

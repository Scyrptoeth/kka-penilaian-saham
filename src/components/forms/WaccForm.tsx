'use client'

import { useCallback, useMemo, useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { computeWacc, type WaccResult } from '@/lib/calculations/wacc'
import type { WaccComparableCompany, WaccState } from '@/lib/store/useKkaStore'

const PERCENT_FMT = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function fmtPct(v: number): string {
  return `${PERCENT_FMT.format(v * 100)}%`
}

const IDR_FMT = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })

function fmtIdr(v: number): string {
  return IDR_FMT.format(v)
}

const DEFAULT_COMPANY: WaccComparableCompany = {
  name: '',
  betaLevered: 0,
  marketCap: 0,
  debt: 0,
}

const DEFAULT_BANK_RATES = [
  { name: 'Bank Persero', rate: 0 },
  { name: 'Bank Swasta', rate: 0 },
  { name: 'Bank Umum', rate: 0 },
]

interface WaccFormProps {
  initial: WaccState | null
  onSave: (state: WaccState) => void
}

export function WaccForm({ initial, onSave }: WaccFormProps) {
  const [marketParams, setMarketParams] = useState(
    initial?.marketParams ?? {
      equityRiskPremium: 0,
      ratingBasedDefaultSpread: 0,
      riskFree: 0,
    },
  )
  const [companies, setCompanies] = useState<WaccComparableCompany[]>(
    initial?.comparableCompanies ?? [{ ...DEFAULT_COMPANY }],
  )
  const [taxRate, setTaxRate] = useState(initial?.taxRate ?? 0)
  const [bankRates, setBankRates] = useState(
    initial?.bankRates ?? DEFAULT_BANK_RATES.map(b => ({ ...b })),
  )
  const [waccOverride, setWaccOverride] = useState<number | null>(
    initial?.waccOverride ?? null,
  )

  const avgBankRate = useMemo(() => {
    if (bankRates.length === 0) return 0
    return bankRates.reduce((s, b) => s + b.rate, 0) / bankRates.length
  }, [bankRates])

  const result: WaccResult = useMemo(
    () => computeWacc(companies, taxRate, marketParams, avgBankRate),
    [companies, taxRate, marketParams, avgBankRate],
  )

  const finalWacc = waccOverride ?? result.computedWacc

  const persist = useCallback(() => {
    onSave({
      marketParams,
      comparableCompanies: companies,
      taxRate,
      bankRates,
      waccOverride,
    })
  }, [onSave, marketParams, companies, taxRate, bankRates, waccOverride])

  // --- Handlers ---
  const updateMarketParam = (key: keyof typeof marketParams, raw: string) => {
    const v = parseFloat(raw)
    setMarketParams(p => ({ ...p, [key]: Number.isFinite(v) ? v : 0 }))
  }

  const updateCompany = (idx: number, key: keyof WaccComparableCompany, raw: string) => {
    setCompanies(prev =>
      prev.map((c, i) => {
        if (i !== idx) return c
        if (key === 'name') return { ...c, name: raw }
        const v = parseFloat(raw)
        return { ...c, [key]: Number.isFinite(v) ? v : 0 }
      }),
    )
  }

  const addCompany = () => setCompanies(prev => [...prev, { ...DEFAULT_COMPANY }])
  const removeCompany = (idx: number) =>
    setCompanies(prev => prev.filter((_, i) => i !== idx))

  const updateBankRate = (idx: number, raw: string) => {
    const v = parseFloat(raw)
    setBankRates(prev =>
      prev.map((b, i) => (i === idx ? { ...b, rate: Number.isFinite(v) ? v : 0 } : b)),
    )
  }

  const updateBankName = (idx: number, raw: string) => {
    setBankRates(prev =>
      prev.map((b, i) => (i === idx ? { ...b, name: raw } : b)),
    )
  }

  const addBankRate = () =>
    setBankRates(prev => [...prev, { name: '', rate: 0 }])

  const removeBankRate = (idx: number) =>
    setBankRates(prev => prev.filter((_, i) => i !== idx))

  return (
    <div className="space-y-8">
      {/* Section A — Market Parameters */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-ink">Market Parameters</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Equity Risk Premium"
            value={marketParams.equityRiskPremium}
            onChange={v => updateMarketParam('equityRiskPremium', v)}
            suffix="%"
            isPercent
          />
          <Field
            label="Rating Based Default Spread"
            value={marketParams.ratingBasedDefaultSpread}
            onChange={v => updateMarketParam('ratingBasedDefaultSpread', v)}
            suffix="%"
            isPercent
          />
          <Field
            label="Risk Free (SUN)"
            value={marketParams.riskFree}
            onChange={v => updateMarketParam('riskFree', v)}
            suffix="%"
            isPercent
          />
        </div>
        <div className="mt-4 max-w-xs">
          <Field
            label="Tax Rate (Hamada)"
            value={taxRate}
            onChange={v => {
              const parsed = parseFloat(v)
              setTaxRate(Number.isFinite(parsed) ? parsed : 0)
            }}
            suffix="%"
            isPercent
          />
        </div>
      </section>

      {/* Section B — Comparable Companies */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-ink">Perusahaan Pembanding</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-grid-strong text-left">
                <th className="px-2 py-2 font-medium text-ink-muted">#</th>
                <th className="px-2 py-2 font-medium text-ink-muted">Nama Perusahaan</th>
                <th className="px-2 py-2 text-right font-medium text-ink-muted">Beta Levered</th>
                <th className="px-2 py-2 text-right font-medium text-ink-muted">Market Cap</th>
                <th className="px-2 py-2 text-right font-medium text-ink-muted">Debt</th>
                <th className="px-2 py-2 text-right font-medium text-ink-muted">Beta Unlevered</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {companies.map((c, i) => (
                <tr key={i} className="border-b border-grid">
                  <td className="px-2 py-1.5 text-ink-muted">{i + 1}</td>
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      className="w-full rounded border border-grid bg-canvas px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-accent"
                      value={c.name}
                      onChange={e => updateCompany(i, 'name', e.target.value)}
                      placeholder="PT Contoh, Tbk"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      step="0.01"
                      className="w-24 rounded border border-grid bg-canvas px-2 py-1 text-right font-mono text-sm tabular-nums focus-visible:ring-2 focus-visible:ring-accent"
                      value={c.betaLevered || ''}
                      onChange={e => updateCompany(i, 'betaLevered', e.target.value)}
                      placeholder="0.00"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      step="1"
                      className="w-40 rounded border border-grid bg-canvas px-2 py-1 text-right font-mono text-sm tabular-nums focus-visible:ring-2 focus-visible:ring-accent"
                      value={c.marketCap || ''}
                      onChange={e => updateCompany(i, 'marketCap', e.target.value)}
                      placeholder="0"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      step="1"
                      className="w-40 rounded border border-grid bg-canvas px-2 py-1 text-right font-mono text-sm tabular-nums focus-visible:ring-2 focus-visible:ring-accent"
                      value={c.debt || ''}
                      onChange={e => updateCompany(i, 'debt', e.target.value)}
                      placeholder="0"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-sm tabular-nums text-ink-muted">
                    {c.marketCap > 0 ? result.betaUnlevered[i]?.toFixed(4) ?? '—' : '—'}
                  </td>
                  <td className="px-2 py-1.5">
                    {companies.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCompany(i)}
                        className="text-negative hover:underline focus-visible:ring-2 focus-visible:ring-accent"
                        aria-label={`Hapus perusahaan ${i + 1}`}
                      >
                        ×
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {/* Aggregate row */}
              <tr className="border-t-2 border-grid-strong bg-canvas-raised font-semibold">
                <td className="px-2 py-1.5" />
                <td className="px-2 py-1.5 text-ink">Rata-rata / Total</td>
                <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                  {result.avgBetaLevered.toFixed(4)}
                </td>
                <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                  {fmtIdr(result.totalMarketCap)}
                </td>
                <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                  {fmtIdr(result.totalDebt)}
                </td>
                <td className="px-2 py-1.5 text-right font-mono tabular-nums">
                  {result.avgBetaUnlevered.toFixed(4)}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={addCompany}
          className="mt-3 rounded border border-grid bg-canvas px-3 py-1.5 text-sm text-ink-soft hover:bg-canvas-raised focus-visible:ring-2 focus-visible:ring-accent"
        >
          + Tambah Perusahaan
        </button>

        <div className="mt-4 rounded border border-grid bg-canvas-raised px-4 py-3">
          <span className="text-sm text-ink-muted">Relevered Beta: </span>
          <span className="font-mono text-sm font-semibold tabular-nums">
            {result.relleveredBeta.toFixed(4)}
          </span>
        </div>
      </section>

      {/* Section C — Bank Reference Rates */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-ink">Bunga Pinjaman Investasi</h2>
        <div className="space-y-2">
          {bankRates.map((b, i) => (
            <div key={i} className="flex items-center gap-3">
              <input
                type="text"
                className="w-48 rounded border border-grid bg-canvas px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-accent"
                value={b.name}
                onChange={e => updateBankName(i, e.target.value)}
                placeholder={`Bank ${i + 1}`}
              />
              <input
                type="number"
                step="0.01"
                className="w-24 rounded border border-grid bg-canvas px-2 py-1 text-right font-mono text-sm tabular-nums focus-visible:ring-2 focus-visible:ring-accent"
                value={b.rate ? (b.rate * 100).toString() : ''}
                onChange={e => {
                  const v = parseFloat(e.target.value)
                  updateBankRate(i, Number.isFinite(v) ? (v / 100).toString() : '0')
                }}
                placeholder="0,00"
              />
              <span className="text-sm text-ink-muted">%</span>
              {bankRates.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeBankRate(i)}
                  className="text-negative hover:underline focus-visible:ring-2 focus-visible:ring-accent"
                  aria-label={`Hapus bank ${i + 1}`}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addBankRate}
          className="mt-3 rounded border border-grid bg-canvas px-3 py-1.5 text-sm text-ink-soft hover:bg-canvas-raised focus-visible:ring-2 focus-visible:ring-accent"
        >
          + Tambah Bank
        </button>
        <div className="mt-3 rounded border border-grid bg-canvas-raised px-4 py-3">
          <span className="text-sm text-ink-muted">Rata-rata Bunga: </span>
          <span className="font-mono text-sm font-semibold tabular-nums">
            {fmtPct(avgBankRate)}
          </span>
        </div>
      </section>

      {/* Section D — Capital Structure + WACC Result */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-ink">Struktur Kapital & WACC</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-grid-strong text-left">
              <th className="px-2 py-2 font-medium text-ink-muted">Komponen</th>
              <th className="px-2 py-2 text-right font-medium text-ink-muted">Bobot (%)</th>
              <th className="px-2 py-2 text-right font-medium text-ink-muted">Biaya Modal (%)</th>
              <th className="px-2 py-2 text-right font-medium text-ink-muted">WACC (%)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-grid">
              <td className="px-2 py-2 text-ink">Hutang</td>
              <td className="px-2 py-2 text-right font-mono tabular-nums">{fmtPct(result.weightDebt)}</td>
              <td className="px-2 py-2 text-right font-mono tabular-nums">{fmtPct(result.costOfDebt)}</td>
              <td className="px-2 py-2 text-right font-mono tabular-nums">{fmtPct(result.waccDebtComponent)}</td>
            </tr>
            <tr className="border-b border-grid">
              <td className="px-2 py-2 text-ink">Ekuitas</td>
              <td className="px-2 py-2 text-right font-mono tabular-nums">{fmtPct(result.weightEquity)}</td>
              <td className="px-2 py-2 text-right font-mono tabular-nums">{fmtPct(result.costOfEquity)}</td>
              <td className="px-2 py-2 text-right font-mono tabular-nums">{fmtPct(result.waccEquityComponent)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4 space-y-3">
          <div className="rounded border border-grid bg-canvas-raised px-4 py-3">
            <span className="text-sm text-ink-muted">WACC (Computed): </span>
            <span className="font-mono font-semibold tabular-nums">{fmtPct(result.computedWacc)}</span>
          </div>

          <div className="rounded border-2 border-accent bg-canvas-raised px-4 py-3">
            <div className="mb-2 flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={waccOverride !== null}
                  onChange={e =>
                    setWaccOverride(e.target.checked ? result.computedWacc : null)
                  }
                  className="accent-accent"
                />
                Override WACC (Menurut Wajib Pajak)
              </label>
            </div>
            {waccOverride !== null && (
              <input
                type="number"
                step="0.0001"
                className="w-36 rounded border border-grid bg-canvas px-2 py-1 text-right font-mono text-sm tabular-nums focus-visible:ring-2 focus-visible:ring-accent"
                value={waccOverride ? (waccOverride * 100).toString() : ''}
                onChange={e => {
                  const v = parseFloat(e.target.value)
                  setWaccOverride(Number.isFinite(v) ? v / 100 : 0)
                }}
              />
            )}
            <div className="mt-2 text-lg font-semibold">
              <span className="text-ink-muted">WACC Final: </span>
              <span className={cn('font-mono tabular-nums', waccOverride !== null ? 'text-accent' : 'text-ink')}>
                {fmtPct(finalWacc)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Save Button */}
      <button
        type="button"
        onClick={persist}
        className="rounded border-2 border-ink bg-ink px-6 py-2.5 text-sm font-semibold text-canvas transition-colors hover:bg-transparent hover:text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        Simpan WACC
      </button>
    </div>
  )
}

/** Small field helper for percentage inputs displayed as whole numbers. */
function Field({
  label,
  value,
  onChange,
  suffix,
  isPercent,
}: {
  label: string
  value: number
  onChange: (raw: string) => void
  suffix?: string
  isPercent?: boolean
}) {
  const display = isPercent && value ? (value * 100).toString() : value ? value.toString() : ''
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-ink-soft">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          step="0.01"
          className="w-full rounded border border-grid bg-canvas px-2 py-1.5 text-right font-mono text-sm tabular-nums focus-visible:ring-2 focus-visible:ring-accent"
          value={display}
          onChange={e => {
            if (isPercent) {
              const v = parseFloat(e.target.value)
              onChange(Number.isFinite(v) ? (v / 100).toString() : '0')
            } else {
              onChange(e.target.value)
            }
          }}
          placeholder="0,00"
        />
        {suffix && <span className="text-sm text-ink-muted">{suffix}</span>}
      </div>
    </div>
  )
}

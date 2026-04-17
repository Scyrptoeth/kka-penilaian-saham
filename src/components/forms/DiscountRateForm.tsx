'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils/cn'
import {
  computeDiscountRate,
  computeDebtRateFromBanks,
  type DiscountRateResult,
} from '@/lib/calculations/discount-rate'
import type { DiscountRateState } from '@/lib/store/useKkaStore'
import { useT } from '@/lib/i18n/useT'

const PERCENT_FMT = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
})

function fmtPct(v: number): string {
  return `${PERCENT_FMT.format(v * 100)}%`
}

const DEFAULT_BANK_RATES = [
  { name: 'Bank Persero', rate: 0 },
  { name: 'Bank Pemdas', rate: 0 },
  { name: 'Bank Swasnas', rate: 0 },
  { name: 'Bank Asing', rate: 0 },
  { name: 'Bank Umum', rate: 0 },
]

interface DiscountRateFormProps {
  initial: DiscountRateState | null
  onSave: (state: DiscountRateState) => void
}

export function DiscountRateForm({ initial, onSave }: DiscountRateFormProps) {
  const { t } = useT()
  const [taxRate, setTaxRate] = useState(initial?.taxRate ?? 0.22)
  const [riskFree, setRiskFree] = useState(initial?.riskFree ?? 0)
  const [beta, setBeta] = useState(initial?.beta ?? 0)
  const [erp, setErp] = useState(initial?.equityRiskPremium ?? 0)
  const [countrySpread, setCountrySpread] = useState(initial?.countryDefaultSpread ?? 0)
  const [der, setDer] = useState(initial?.derIndustry ?? 0)
  const [bankRates, setBankRates] = useState(
    initial?.bankRates ?? DEFAULT_BANK_RATES.map(b => ({ ...b })),
  )

  // Bank rates → debt rate via ROUND(AVG/100, 3) formula
  const debtRate = useMemo(
    () => computeDebtRateFromBanks(bankRates.map(b => b.rate)),
    [bankRates],
  )

  const result: DiscountRateResult = useMemo(
    () =>
      computeDiscountRate({
        taxRate,
        riskFree,
        beta,
        erp,
        countrySpread,
        debtRate,
        der,
      }),
    [taxRate, riskFree, beta, erp, countrySpread, debtRate, der],
  )

  const persist = useCallback(() => {
    onSave({
      taxRate,
      riskFree,
      beta,
      equityRiskPremium: erp,
      countryDefaultSpread: countrySpread,
      derIndustry: der,
      bankRates,
    })
  }, [onSave, taxRate, riskFree, beta, erp, countrySpread, der, bankRates])

  // Auto-save with debounce
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isInitialMount = useRef(true)
  useEffect(() => {
    // Skip auto-save on initial mount (data loaded from store)
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => persist(), 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [persist])

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

  const addBankRate = () => setBankRates(prev => [...prev, { name: '', rate: 0 }])
  const removeBankRate = (idx: number) =>
    setBankRates(prev => prev.filter((_, i) => i !== idx))

  return (
    <div className="space-y-8">
      {/* Input Parameters */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-ink">{t('discountRate.capmParams')}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PctField label={t('discountRate.taxRate')} value={taxRate} onChange={setTaxRate} />
          <PctField label={t('discountRate.riskFree')} value={riskFree} onChange={setRiskFree} />
          <NumField label={t('discountRate.betaLevered')} value={beta} onChange={setBeta} step={0.001} />
          <PctField label={t('discountRate.erp')} value={erp} onChange={setErp} />
          <PctField label={t('discountRate.countrySpread')} value={countrySpread} onChange={setCountrySpread} />
          <PctField label={t('discountRate.derIndustry')} value={der} onChange={setDer} />
        </div>
      </section>

      {/* Bank Reference Rates */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-ink">{t('discountRate.investmentLoanRate')}</h2>
        <p className="mb-3 text-sm text-ink-muted">
          {t('discountRate.rateHint')}
        </p>
        <div className="space-y-2">
          {bankRates.map((b, i) => (
            <div key={i} className="flex items-center gap-3">
              <input
                type="text"
                className="w-40 rounded border border-grid bg-canvas px-2 py-1 text-sm focus-visible:ring-2 focus-visible:ring-accent"
                value={b.name}
                onChange={e => updateBankName(i, e.target.value)}
                placeholder={`Bank ${i + 1}`}
              />
              <input
                type="number"
                step="0.01"
                className="w-24 rounded border border-grid bg-canvas px-2 py-1 text-right font-mono text-sm tabular-nums focus-visible:ring-2 focus-visible:ring-accent"
                value={b.rate || ''}
                onChange={e => updateBankRate(i, e.target.value)}
                placeholder="0,00"
              />
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
          {t('discountRate.addBank')}
        </button>
        <div className="mt-3 flex gap-6 rounded border border-grid bg-canvas-raised px-4 py-3 text-sm">
          <div>
            <span className="text-ink-muted">{t('discountRate.avgLabel')}</span>
            <span className="font-mono tabular-nums">
              {bankRates.length > 0
                ? (bankRates.reduce((s, b) => s + b.rate, 0) / bankRates.length).toFixed(3)
                : '0'}
            </span>
          </div>
          <div>
            <span className="text-ink-muted">{t('discountRate.debtRateLabel')}</span>
            <span className="font-mono font-semibold tabular-nums">{fmtPct(debtRate)}</span>
          </div>
        </div>
      </section>

      {/* Computed Results */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-ink">{t('discountRate.capmResults')}</h2>

        {/* Beta computations */}
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <ResultBox label={t('discountRate.result.bu')} formula="β / (1 + (1−t)×DER)" value={result.bu.toFixed(6)} />
          <ResultBox label={t('discountRate.result.bl')} formula="BU × (1 + (1−t)×DER)" value={result.bl.toFixed(6)} />
          <ResultBox label={t('discountRate.result.ke')} formula="Rf + (BL×ERP) − CDS" value={fmtPct(result.ke)} />
          <ResultBox label={t('discountRate.result.kd')} formula="Debt Rate × (1−t)" value={fmtPct(result.kd)} />
        </div>

        {/* WACC Table */}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-grid-strong text-left">
              <th className="px-2 py-2 font-medium text-ink-muted">{t('discountRate.table.structure')}</th>
              <th className="px-2 py-2 text-right font-medium text-ink-muted">{t('discountRate.table.weight')}</th>
              <th className="px-2 py-2 text-right font-medium text-ink-muted">{t('discountRate.table.costOfCapital')}</th>
              <th className="px-2 py-2 text-right font-medium text-ink-muted">{t('discountRate.table.waccPercent')}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-grid">
              <td className="px-2 py-2 text-ink">{t('common.debt')}</td>
              <td className="px-2 py-2 text-right font-mono tabular-nums">{fmtPct(result.weightDebt)}</td>
              <td className="px-2 py-2 text-right font-mono tabular-nums">{fmtPct(result.kd)}</td>
              <td className="px-2 py-2 text-right font-mono tabular-nums">{fmtPct(result.waccDebt)}</td>
            </tr>
            <tr className="border-b border-grid">
              <td className="px-2 py-2 text-ink">{t('common.equity')}</td>
              <td className="px-2 py-2 text-right font-mono tabular-nums">{fmtPct(result.weightEquity)}</td>
              <td className="px-2 py-2 text-right font-mono tabular-nums">{fmtPct(result.ke)}</td>
              <td className="px-2 py-2 text-right font-mono tabular-nums">{fmtPct(result.waccEquity)}</td>
            </tr>
          </tbody>
        </table>

        {/* Final WACC */}
        <div className="mt-4 rounded border-2 border-accent bg-canvas-raised px-4 py-4">
          <span className="text-sm text-ink-muted">{t('discountRate.waccLabel')}</span>
          <span className="text-xl font-semibold font-mono tabular-nums text-accent">
            {fmtPct(result.wacc)}
          </span>
        </div>

        {/* Summary mirrors C9-C12 */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryBox label="CoE" value={fmtPct(result.ke)} />
          <SummaryBox label="CoD" value={fmtPct(result.kd)} />
          <SummaryBox label="WACC" value={fmtPct(result.wacc)} />
          <SummaryBox label="Debt Rate" value={fmtPct(debtRate)} />
        </div>
      </section>

      {/* Auto-save indicator */}
      <p className="text-xs text-ink-muted">{t('common.autoSaved')}</p>
    </div>
  )
}

function PctField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-ink-soft">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          step="0.01"
          className="w-full rounded border border-grid bg-canvas px-2 py-1.5 text-right font-mono text-sm tabular-nums focus-visible:ring-2 focus-visible:ring-accent"
          value={value ? (value * 100).toString() : ''}
          onChange={e => {
            const v = parseFloat(e.target.value)
            onChange(Number.isFinite(v) ? v / 100 : 0)
          }}
          placeholder="0,00"
        />
        <span className="text-sm text-ink-muted">%</span>
      </div>
    </div>
  )
}

function NumField({
  label,
  value,
  onChange,
  step,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step?: number
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-ink-soft">{label}</label>
      <input
        type="number"
        step={step ?? 0.01}
        className="w-full rounded border border-grid bg-canvas px-2 py-1.5 text-right font-mono text-sm tabular-nums focus-visible:ring-2 focus-visible:ring-accent"
        value={value || ''}
        onChange={e => {
          const v = parseFloat(e.target.value)
          onChange(Number.isFinite(v) ? v : 0)
        }}
        placeholder="0,000"
      />
    </div>
  )
}

function ResultBox({ label, formula, value }: { label: string; formula: string; value: string }) {
  return (
    <div className="rounded border border-grid bg-canvas-raised px-4 py-3">
      <div className="text-sm font-medium text-ink">{label}</div>
      <div className="text-xs text-ink-muted">{formula}</div>
      <div className="mt-1 font-mono text-sm font-semibold tabular-nums">{value}</div>
    </div>
  )
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn('rounded border border-grid px-3 py-2 text-center')}>
      <div className="text-xs text-ink-muted">{label}</div>
      <div className="font-mono text-sm font-semibold tabular-nums">{value}</div>
    </div>
  )
}

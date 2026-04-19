'use client'

import { useMemo } from 'react'
import { useKkaStore, computeProporsiSaham } from '@/lib/store/useKkaStore'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { BALANCE_SHEET_MANIFEST } from '@/data/manifests/balance-sheet'
import { computeDiscountRate, buildDiscountRateInput } from '@/lib/calculations/discount-rate'
import { computeDcf } from '@/lib/calculations/dcf'
import { computeAam } from '@/lib/calculations/aam-valuation'
import { computeEem } from '@/lib/calculations/eem-valuation'
import { computeBorrowingCap } from '@/lib/calculations/borrowing-cap'
import { computeShareValue } from '@/lib/calculations/share-value'
import { computeFullProjectionPipeline } from '@/lib/calculations/projection-pipeline'
import {
  computeHistoricalUpstream,
  buildAamInput,
  buildDcfInput,
  buildEemInput,
  buildBorrowingCapInput,
  computeInterestBearingDebt,
} from '@/lib/calculations/upstream-helpers'
import { formatIdr } from '@/components/financial/format'
import { PageEmptyState } from '@/components/shared/PageEmptyState'
import { useT } from '@/lib/i18n/useT'

interface ValuationRow {
  method: 'AAM' | 'DCF' | 'EEM'
  equityValue100: number
  equityValuePortion: number
  perShare: number
}

export default function ResumePage() {
  const { t } = useT()
  const home = useKkaStore((s) => s.home)
  const balanceSheet = useKkaStore((s) => s.balanceSheet)
  const incomeStatement = useKkaStore((s) => s.incomeStatement)
  const fixedAsset = useKkaStore((s) => s.fixedAsset)
  const keyDrivers = useKkaStore((s) => s.keyDrivers)
  const discountRateState = useKkaStore((s) => s.discountRate)
  const bcInput = useKkaStore((s) => s.borrowingCapInput)
  const aamAdjustments = useKkaStore((s) => s.aamAdjustments)
  const interestBearingDebt = useKkaStore((s) => s.interestBearingDebt)
  const changesInWorkingCapital = useKkaStore((s) => s.changesInWorkingCapital)
  const hasHydrated = useKkaStore((s) => s._hasHydrated)

  const data = useMemo(() => {
    if (
      !hasHydrated ||
      !home ||
      !balanceSheet ||
      !incomeStatement ||
      !fixedAsset ||
      !keyDrivers ||
      !discountRateState ||
      interestBearingDebt === null ||
      changesInWorkingCapital === null
    ) {
      return null
    }

    const histYears4 = computeHistoricalYears(home.tahunTransaksi, 4)
    const histYears3 = computeHistoricalYears(home.tahunTransaksi, 3)
    const bsComp = deriveComputedRows(
      BALANCE_SHEET_MANIFEST.rows,
      balanceSheet.rows,
      histYears4,
    )
    const allBs = { ...bsComp, ...balanceSheet.rows }
    const ly = histYears4[histYears4.length - 1]
    const proporsiSaham = computeProporsiSaham(home)

    const ibdAmount = computeInterestBearingDebt({
      balanceSheetAccounts: balanceSheet.accounts,
      balanceSheetRows: allBs,
      interestBearingDebt,
      year: ly,
    })
    const exclCL = new Set(interestBearingDebt.excludedCurrentLiabilities)
    const exclNCL = new Set(interestBearingDebt.excludedNonCurrentLiabilities)

    // ── AAM ──
    const aamResult = computeAam(
      buildAamInput({
        accounts: balanceSheet.accounts,
        allBs,
        lastYear: ly,
        home,
        aamAdjustments,
        interestBearingDebt: ibdAmount,
        excludedCurrentLiabIbd: exclCL,
        excludedNonCurrentLiabIbd: exclNCL,
      }),
    )
    const aamEquityValuePortion =
      aamResult.marketValuePortion
    const aamPerShare =
      aamResult.marketValuePortion /
      (home.jumlahSahamBeredar * proporsiSaham || 1)

    // ── Historical upstream + DCF + EEM ──
    const upstream = computeHistoricalUpstream({
      balanceSheetRows: balanceSheet.rows,
      balanceSheetAccounts: balanceSheet.accounts,
      incomeStatementRows: incomeStatement.rows,
      fixedAssetRows: fixedAsset.rows,
      accPayablesRows: null,
      allBs,
      histYears3,
      histYears4,
      changesInWorkingCapital,
    })
    const pipeline = computeFullProjectionPipeline({
      home,
      balanceSheet,
      incomeStatement,
      fixedAsset,
      keyDrivers,
      changesInWorkingCapital,
    })
    const dr = computeDiscountRate(buildDiscountRateInput(discountRateState))

    const dcfResult = computeDcf(
      buildDcfInput({
        upstream,
        allBs,
        lastHistYear: pipeline.lastHistYear,
        projYears: pipeline.projYears,
        proyNoplatRows: pipeline.proyNoplatRows,
        proyFaRows: pipeline.proyFaRows,
        proyCfsRows: pipeline.proyCfsRows,
        wacc: dr.wacc,
        growthRate: upstream.growthRate,
        interestBearingDebt: ibdAmount,
      }),
    )
    const svDcf = computeShareValue({
      equityValue100: dcfResult.equityValue100,
      dlomPercent: home.dlomPercent,
      dlocPercent: 0,
      proporsiSaham,
      jumlahSahamBeredar: home.jumlahSahamBeredar,
    })

    // ── EEM ──
    const bcData = computeBorrowingCap(
      buildBorrowingCapInput({ allBs, lastYear: ly, bcInput, dr }),
    )
    const eemResult = computeEem(
      buildEemInput({
        aamResult,
        allBs,
        upstream,
        lastYear: ly,
        waccTangible: bcData.waccTangible,
        wacc: dr.wacc,
        interestBearingDebt: ibdAmount,
      }),
    )
    const svEem = computeShareValue({
      equityValue100: eemResult.equityValue100,
      dlomPercent: home.dlomPercent,
      dlocPercent: home.dlocPercent,
      proporsiSaham,
      jumlahSahamBeredar: home.jumlahSahamBeredar,
    })

    const rows: ValuationRow[] = [
      {
        method: 'AAM',
        equityValue100: aamResult.equityValue,
        equityValuePortion: aamEquityValuePortion,
        perShare: aamPerShare,
      },
      {
        method: 'DCF',
        equityValue100: dcfResult.equityValue100,
        equityValuePortion: svDcf.marketValuePortion,
        perShare: svDcf.perShare,
      },
      {
        method: 'EEM',
        equityValue100: eemResult.equityValue100,
        equityValuePortion: svEem.marketValuePortion,
        perShare: svEem.perShare,
      },
    ]

    const perShareValues = rows.map((r) => r.perShare)
    const perShareMin = Math.min(...perShareValues)
    const perShareMax = Math.max(...perShareValues)
    const perShareMidpoint = (perShareMin + perShareMax) / 2

    return {
      rows,
      perShareMin,
      perShareMax,
      perShareMidpoint,
      home,
    }
  }, [
    hasHydrated,
    home,
    balanceSheet,
    incomeStatement,
    fixedAsset,
    keyDrivers,
    discountRateState,
    bcInput,
    aamAdjustments,
    interestBearingDebt,
    changesInWorkingCapital,
  ])

  if (!hasHydrated) {
    return (
      <div className="mx-auto max-w-[1100px] p-6 text-sm text-ink-muted">
        {t('common.loadingData')}
      </div>
    )
  }

  if (!data) {
    return (
      <PageEmptyState
        section={t('resume.section')}
        title={t('resume.title')}
        inputs={[
          { label: 'HOME', href: '/', filled: !!home },
          {
            label: 'Balance Sheet',
            href: '/input/balance-sheet',
            filled: !!balanceSheet,
          },
          {
            label: 'Income Statement',
            href: '/input/income-statement',
            filled: !!incomeStatement,
          },
          {
            label: 'Fixed Asset',
            href: '/input/fixed-asset',
            filled: !!fixedAsset,
          },
          {
            label: 'Key Drivers',
            href: '/input/key-drivers',
            filled: !!keyDrivers,
          },
          {
            label: t('nav.item.discountRate'),
            href: '/input/discount-rate',
            filled: !!discountRateState,
          },
          {
            label: t('nav.item.interestBearingDebt'),
            href: '/input/interest-bearing-debt',
            filled: interestBearingDebt !== null,
          },
          {
            label: t('wc.gate.required.label'),
            href: '/input/changes-in-working-capital',
            filled: changesInWorkingCapital !== null,
          },
        ]}
      />
    )
  }

  const { rows, perShareMin, perShareMax, perShareMidpoint } = data

  return (
    <div className="mx-auto max-w-[1100px] p-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
          {t('resume.section')}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
          {t('resume.title')}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">{t('resume.subtitle')}</p>
      </div>

      {/* Comparison table */}
      <section className="mt-8">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
          {t('resume.table.heading')}
        </h2>
        <div className="mt-3 overflow-x-auto rounded border border-grid">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-grid-strong bg-canvas-raised">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  {t('resume.table.metric')}
                </th>
                {rows.map((r) => (
                  <th
                    key={r.method}
                    className="px-4 py-3 text-right font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-muted"
                  >
                    {r.method}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-grid">
                <td className="px-4 py-2 text-ink-soft">
                  {t('resume.table.equity100')}
                </td>
                {rows.map((r) => (
                  <td
                    key={r.method}
                    className="px-4 py-2 text-right font-mono tabular-nums"
                  >
                    {formatIdr(r.equityValue100)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-grid">
                <td className="px-4 py-2 text-ink-soft">
                  {t('resume.table.equityPortion')}
                </td>
                {rows.map((r) => (
                  <td
                    key={r.method}
                    className="px-4 py-2 text-right font-mono tabular-nums"
                  >
                    {formatIdr(r.equityValuePortion)}
                  </td>
                ))}
              </tr>
              <tr className="bg-canvas-raised font-semibold">
                <td className="px-4 py-2 text-ink">
                  {t('resume.table.perShare')}
                </td>
                {rows.map((r) => (
                  <td
                    key={r.method}
                    className="px-4 py-2 text-right font-mono tabular-nums text-ink"
                  >
                    {formatIdr(r.perShare)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Methodology cards */}
      <section className="mt-10">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
          {t('resume.metodologi.heading')}
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
          <MethodologyCard
            code="AAM"
            title={t('resume.metodologi.aam.title')}
            body={t('resume.metodologi.aam.body')}
          />
          <MethodologyCard
            code="DCF"
            title={t('resume.metodologi.dcf.title')}
            body={t('resume.metodologi.dcf.body')}
          />
          <MethodologyCard
            code="EEM"
            title={t('resume.metodologi.eem.title')}
            body={t('resume.metodologi.eem.body')}
          />
        </div>
      </section>

      {/* Recommendation block */}
      <section className="mt-10">
        <div className="rounded border-l-2 border-accent bg-canvas-raised/40 p-5">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
            {t('resume.rekomendasi.heading')}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            {t('resume.rekomendasi.intro')}
          </p>
          <dl className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
            <StatLine
              label={t('resume.rekomendasi.min')}
              value={formatIdr(perShareMin)}
            />
            <StatLine
              label={t('resume.rekomendasi.midpoint')}
              value={formatIdr(perShareMidpoint)}
            />
            <StatLine
              label={t('resume.rekomendasi.max')}
              value={formatIdr(perShareMax)}
            />
          </dl>
          <p className="mt-4 text-xs text-ink-muted">
            {t('resume.rekomendasi.disclaimer')}
          </p>
        </div>
      </section>
    </div>
  )
}

function MethodologyCard({
  code,
  title,
  body,
}: {
  code: string
  title: string
  body: string
}) {
  return (
    <div className="rounded border border-grid bg-canvas-raised p-4">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-accent">
        {code}
      </p>
      <h3 className="mt-1 text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-xs leading-relaxed text-ink-soft">{body}</p>
    </div>
  )
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-ink-muted">
        {label}
      </dt>
      <dd className="mt-1 font-mono tabular-nums text-ink">{value}</dd>
    </div>
  )
}

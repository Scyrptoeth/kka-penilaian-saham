'use client'

import { cn } from '@/lib/utils/cn'
import { useT } from '@/lib/i18n/useT'
import { averageSeries } from '@/lib/calculations/derivation-helpers'
import type {
  FinancialRow,
  FinancialTableProps,
  ValueKind,
} from './types'
import {
  formatIdr,
  formatPercent,
  formatRatio,
  isNegative,
} from './format'
/**
 * <FinancialTable> — the reusable core table for every Historis/Analisis
 * page. Renders a sticky-header table with right-aligned tabular-nums, an
 * always-visible first column (label), optional common-size and growth
 * column groups.
 */
export function FinancialTable({
  title,
  years,
  rows,
  showCommonSize = false,
  showGrowth = false,
  showValueAverage = false,
  showCommonSizeAverage = false,
  showGrowthAverage = false,
  currency = 'IDR',
  disclaimer,
}: FinancialTableProps) {
  const { t } = useT()
  const commonSizeYears = showCommonSize ? years.slice(1) : []
  const growthYears = showGrowth ? years.slice(1) : []

  // Average columns: user spec — hide entirely when <2 historical years.
  const hasMultiYear = years.length >= 2
  const valueAvg = showValueAverage && hasMultiYear
  const csAvg = showCommonSizeAverage && commonSizeYears.length >= 2
  const grAvg = showGrowthAverage && growthYears.length >= 1 && hasMultiYear
  const valueAvgExtra = valueAvg ? 1 : 0
  const csAvgExtra = csAvg ? 1 : 0
  const grAvgExtra = grAvg ? 1 : 0

  const totalCols =
    1 +
    years.length +
    valueAvgExtra +
    commonSizeYears.length +
    csAvgExtra +
    growthYears.length +
    grAvgExtra

  return (
    <section aria-labelledby="financial-table-title" className="w-full">
      <header className="mb-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1
            id="financial-table-title"
            className="font-sans text-xl font-semibold tracking-tight text-ink"
          >
            {title}
          </h1>
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">
            {currency}
          </span>
        </div>
        {disclaimer && (
          <p className="mt-1 text-[11px] text-ink-muted">{disclaimer}</p>
        )}
      </header>

      <div className="overflow-x-auto rounded-sm border border-grid bg-canvas-raised shadow-[0_1px_0_rgba(10,22,40,0.04)]">
        <table
          className="min-w-full border-collapse text-[13px]"
          aria-describedby="financial-table-title"
        >
          <thead>
            <tr className="bg-canvas-raised">
              <th
                scope="col"
                className="sticky left-0 top-0 z-20 min-w-[280px] border-b border-grid-strong bg-canvas-raised px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted shadow-[1px_0_0_rgba(10,22,40,0.06)]"
              >
                {t('table.lineItemHeader')}
              </th>
              {years.map((year) => (
                <th
                  key={`value-${year}`}
                  scope="col"
                  className="sticky top-0 z-10 border-b border-grid-strong bg-canvas-raised px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted"
                >
                  {year}
                </th>
              ))}
              {valueAvg && (
                <th
                  key="value-avg"
                  scope="col"
                  className="sticky top-0 z-10 border-b border-l border-grid-strong bg-canvas-raised px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-accent"
                >
                  {t('table.average')}
                </th>
              )}
              {commonSizeYears.length > 0 && (
                <th
                  scope="colgroup"
                  colSpan={commonSizeYears.length + csAvgExtra}
                  className="sticky top-0 z-10 border-b border-l border-grid-strong bg-canvas-raised px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-accent"
                >
                  {t('table.commonSize')}
                </th>
              )}
              {growthYears.length > 0 && (
                <th
                  scope="colgroup"
                  colSpan={growthYears.length + grAvgExtra}
                  className="sticky top-0 z-10 border-b border-l border-grid-strong bg-canvas-raised px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-accent"
                >
                  {t('table.growthYoY')}
                </th>
              )}
            </tr>
            {(commonSizeYears.length > 0 || growthYears.length > 0) && (
              <tr className="bg-canvas-raised">
                <th
                  scope="col"
                  className="sticky left-0 z-20 border-b border-grid bg-canvas-raised px-3 py-1 shadow-[1px_0_0_rgba(10,22,40,0.06)]"
                />
                {years.map((year) => (
                  <th
                    key={`sub-value-${year}`}
                    scope="col"
                    className="border-b border-grid bg-canvas-raised px-3 py-1"
                  />
                ))}
                {valueAvg && (
                  <th
                    key="sub-value-avg"
                    scope="col"
                    className="border-b border-l border-grid bg-canvas-raised px-3 py-1"
                  />
                )}
                {commonSizeYears.map((year, idx) => (
                  <th
                    key={`sub-cs-${year}`}
                    scope="col"
                    className={cn(
                      'border-b border-grid bg-canvas-raised px-3 py-1 text-right text-[10px] font-medium text-ink-muted',
                      idx === 0 && 'border-l border-grid',
                    )}
                  >
                    {year}
                  </th>
                ))}
                {csAvg && (
                  <th
                    key="sub-cs-avg"
                    scope="col"
                    className="border-b border-l border-grid-strong bg-canvas-raised px-3 py-1 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted"
                  >
                    {t('table.average')}
                  </th>
                )}
                {growthYears.map((year, idx) => (
                  <th
                    key={`sub-gr-${year}`}
                    scope="col"
                    className={cn(
                      'border-b border-grid bg-canvas-raised px-3 py-1 text-right text-[10px] font-medium text-ink-muted',
                      idx === 0 && 'border-l border-grid',
                    )}
                  >
                    {year}
                  </th>
                ))}
                {grAvg && (
                  <th
                    key="sub-gr-avg"
                    scope="col"
                    className="border-b border-l border-grid-strong bg-canvas-raised px-3 py-1 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted"
                  >
                    {t('table.average')}
                  </th>
                )}
              </tr>
            )}
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <TableRow
                key={`${row.label}-${idx}`}
                row={row}
                rowIdx={idx}
                years={years}
                commonSizeYears={commonSizeYears}
                growthYears={growthYears}
                totalCols={totalCols}
                valueAvg={valueAvg}
                csAvg={csAvg}
                grAvg={grAvg}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

interface TableRowProps {
  row: FinancialRow
  rowIdx: number
  years: number[]
  commonSizeYears: number[]
  growthYears: number[]
  totalCols: number
  valueAvg: boolean
  csAvg: boolean
  grAvg: boolean
}

function TableRow({
  row,
  rowIdx,
  years,
  commonSizeYears,
  growthYears,
  totalCols,
  valueAvg,
  csAvg,
  grAvg,
}: TableRowProps) {
  const type = row.type ?? 'normal'

  if (type === 'separator') {
    return (
      <tr aria-hidden>
        <td colSpan={totalCols} className="h-2 border-b border-grid bg-canvas" />
      </tr>
    )
  }

  if (type === 'header') {
    return (
      <tr>
        <th
          scope="row"
          colSpan={totalCols}
          className="sticky left-0 border-t-2 border-grid-strong bg-grid px-3 py-1.5 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft"
        >
          {row.label}
        </th>
      </tr>
    )
  }

  const isTotal = type === 'total'
  const isSubtotal = type === 'subtotal'

  const baseBg = rowIdx % 2 === 0 ? 'bg-canvas' : 'bg-canvas-raised/60'

  return (
    <tr
      className={cn(
        'group transition-colors hover:bg-accent-soft/40',
        isSubtotal && 'font-semibold',
        isTotal && 'font-bold bg-canvas-raised',
      )}
    >
      <th
        scope="row"
        className={cn(
          'sticky left-0 z-10 text-left font-normal text-ink-soft transition-colors group-hover:bg-accent-soft/40',
          baseBg,
          'shadow-[1px_0_0_rgba(10,22,40,0.06)]',
          isSubtotal && 'border-t border-grid-strong font-semibold text-ink',
          isTotal && 'border-t-2 border-ink font-bold text-ink',
          getIndentClass(row.indent),
          'py-1.5 pr-4',
        )}
      >
        {row.label}
      </th>

      {years.map((year) => (
        <NumericCell
          key={`v-${year}`}
          value={row.values[year]}
          kind="value"
          valueKind={row.valueKind ?? 'idr'}
          rowType={type}
          baseBg={baseBg}
        />
      ))}

      {valueAvg && (
        <NumericCell
          key="v-avg"
          value={averageSeries(row.values, years) ?? undefined}
          kind="value"
          valueKind={row.valueKind ?? 'idr'}
          rowType={type}
          baseBg={baseBg}
          borderLeft
          emphasize
        />
      )}

      {commonSizeYears.map((year, idx) => (
        <NumericCell
          key={`cs-${year}`}
          value={row.commonSize?.[year]}
          kind="percent"
          rowType={type}
          baseBg={baseBg}
          borderLeft={idx === 0}
        />
      ))}

      {csAvg && (
        <NumericCell
          key="cs-avg"
          value={averageSeries(row.commonSize, commonSizeYears) ?? undefined}
          kind="percent"
          rowType={type}
          baseBg={baseBg}
          borderLeft
          emphasize
        />
      )}

      {growthYears.map((year, idx) => (
        <NumericCell
          key={`gr-${year}`}
          value={row.growth?.[year]}
          kind="percent"
          rowType={type}
          baseBg={baseBg}
          borderLeft={idx === 0}
        />
      ))}

      {grAvg && (
        <NumericCell
          key="gr-avg"
          value={averageSeries(row.growth, growthYears) ?? undefined}
          kind="percent"
          rowType={type}
          baseBg={baseBg}
          borderLeft
          emphasize
        />
      )}
    </tr>
  )
}

interface NumericCellProps {
  value: number | undefined
  kind: 'value' | 'percent'
  valueKind?: ValueKind
  rowType: FinancialRow['type']
  baseBg: string
  borderLeft?: boolean
  /** Heavier left border + bold weight — used for Average columns. */
  emphasize?: boolean
}

function NumericCell({
  value,
  kind,
  valueKind,
  rowType,
  baseBg,
  borderLeft,
  emphasize,
}: NumericCellProps) {
  const cellClasses = cn(
    'px-3 py-1.5 text-right font-mono tabular-nums transition-colors',
    baseBg,
    'group-hover:bg-accent-soft/40',
    rowType === 'subtotal' && 'border-t border-grid-strong',
    rowType === 'total' && 'border-t-2 border-ink',
    borderLeft && (emphasize ? 'border-l border-grid-strong' : 'border-l border-grid'),
    emphasize && 'font-semibold',
  )

  if (value === undefined || !Number.isFinite(value)) {
    return (
      <td className={cn(cellClasses, 'text-ink-muted')}>—</td>
    )
  }

  const text =
    kind === 'percent'
      ? formatPercent(value)
      : valueKind === 'percent'
        ? formatPercent(value)
        : valueKind === 'ratio'
          ? formatRatio(value)
          : formatIdr(value)
  const negative = isNegative(value)
  const colorClass = negative ? 'text-negative' : 'text-ink'

  return <td className={cellClasses}><span className={colorClass}>{text}</span></td>
}

function getIndentClass(indent: 0 | 1 | 2 | undefined): string {
  switch (indent) {
    case 1:
      return 'pl-8'
    case 2:
      return 'pl-12'
    case 0:
    case undefined:
    default:
      return 'pl-3'
  }
}

export type { FinancialRow, FinancialTableProps } from './types'

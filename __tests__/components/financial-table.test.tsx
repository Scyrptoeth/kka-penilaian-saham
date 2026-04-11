import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FinancialTable } from '@/components/financial/FinancialTable'
import { formatIdr, formatPercent } from '@/components/financial/format'
import type { FinancialRow } from '@/components/financial/types'

describe('formatIdr', () => {
  it('formats positive integers with Indonesian thousand separators', () => {
    expect(formatIdr(1234567)).toBe('1.234.567')
  })
  it('wraps negatives in parentheses without minus', () => {
    expect(formatIdr(-500)).toBe('(500)')
    expect(formatIdr(-1234567)).toBe('(1.234.567)')
  })
  it('renders zero as a dash', () => {
    expect(formatIdr(0)).toBe('-')
  })
  it('returns em dash for non-finite values', () => {
    expect(formatIdr(Number.POSITIVE_INFINITY)).toBe('—')
    expect(formatIdr(Number.NaN)).toBe('—')
  })
})

describe('formatPercent', () => {
  it('formats positive ratios as one-decimal percent', () => {
    expect(formatPercent(0.2345)).toBe('23,5%')
  })
  it('wraps negative ratios in parentheses', () => {
    expect(formatPercent(-0.05)).toBe('(5,0%)')
  })
  it('renders zero as a dash', () => {
    expect(formatPercent(0)).toBe('-')
  })
})

const SAMPLE_ROWS: FinancialRow[] = [
  { label: 'ASSETS', values: {}, type: 'header' },
  {
    label: 'Cash',
    indent: 1,
    values: { 2019: 1111, 2020: 2222, 2021: 3333 },
    commonSize: { 2020: 0.2, 2021: 0.3 },
    growth: { 2020: 1.0, 2021: 0.5 },
    formula: {
      commonSize: { description: 'Cash / Total Assets' },
      growth: { description: 'YoY Cash' },
    },
  },
  {
    label: 'Liabilities',
    values: { 2019: -555, 2020: 0, 2021: -1234 },
    type: 'normal',
  },
  {
    label: 'TOTAL',
    values: { 2019: 9000, 2020: 8500, 2021: 7750 },
    type: 'total',
  },
]

describe('<FinancialTable>', () => {
  it('renders title, disclaimer, and currency badge', () => {
    render(
      <FinancialTable
        title="Balance Sheet"
        years={[2019, 2020, 2021]}
        rows={SAMPLE_ROWS}
        currency="IDR"
        disclaimer="Demo data"
      />,
    )
    expect(screen.getByText('Balance Sheet')).toBeInTheDocument()
    expect(screen.getByText('IDR')).toBeInTheDocument()
    expect(screen.getByText('Demo data')).toBeInTheDocument()
  })

  it('renders year headers in ascending order', () => {
    render(
      <FinancialTable
        title="Test"
        years={[2019, 2020, 2021]}
        rows={SAMPLE_ROWS}
      />,
    )
    const headers = screen.getAllByRole('columnheader')
    const texts = headers.map((h) => h.textContent?.trim())
    expect(texts).toContain('2019')
    expect(texts).toContain('2020')
    expect(texts).toContain('2021')
  })

  it('renders positive values formatted and negatives wrapped in parens', () => {
    render(
      <FinancialTable
        title="Test"
        years={[2019, 2020, 2021]}
        rows={SAMPLE_ROWS}
      />,
    )
    expect(screen.getByText('1.111')).toBeInTheDocument()
    expect(screen.getByText('2.222')).toBeInTheDocument()
    expect(screen.getByText('3.333')).toBeInTheDocument()
    expect(screen.getByText('(555)')).toBeInTheDocument()
    expect(screen.getByText('(1.234)')).toBeInTheDocument()
    expect(screen.getByText('9.000')).toBeInTheDocument()
    expect(screen.getByText('7.750')).toBeInTheDocument()
  })

  it('renders header rows distinct from data rows', () => {
    render(
      <FinancialTable
        title="Test"
        years={[2019, 2020, 2021]}
        rows={SAMPLE_ROWS}
      />,
    )
    const header = screen.getByText('ASSETS')
    expect(header.tagName).toBe('TH')
  })

  it('renders common-size and growth columns when requested', () => {
    render(
      <FinancialTable
        title="Test"
        years={[2019, 2020, 2021]}
        rows={SAMPLE_ROWS}
        showCommonSize
        showGrowth
      />,
    )
    expect(screen.getByText(/common size/i)).toBeInTheDocument()
    expect(screen.getByText(/growth yo/i)).toBeInTheDocument()
    expect(screen.getByText('20,0%')).toBeInTheDocument()
    expect(screen.getByText('30,0%')).toBeInTheDocument()
    expect(screen.getByText('100,0%')).toBeInTheDocument()
    expect(screen.getByText('50,0%')).toBeInTheDocument()
  })

  it('falls back to an em-dash when a value is missing', () => {
    render(
      <FinancialTable
        title="Test"
        years={[2019, 2020]}
        rows={[
          { label: 'Sparse', values: { 2019: 100 } },
        ]}
      />,
    )
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

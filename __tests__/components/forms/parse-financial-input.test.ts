import { describe, expect, it } from 'vitest'
import { parseFinancialInput } from '@/components/forms/parse-financial-input'

describe('parseFinancialInput', () => {
  it('parses plain integers', () => {
    expect(parseFinancialInput('1234567')).toBe(1234567)
  })

  it('parses Indonesian thousand separators (dots)', () => {
    expect(parseFinancialInput('1.234.567')).toBe(1234567)
    expect(parseFinancialInput('14.216.370.131')).toBe(14216370131)
  })

  it('strips Rp prefix and whitespace', () => {
    expect(parseFinancialInput('Rp 14.216.370.131')).toBe(14216370131)
    expect(parseFinancialInput('rp 1.000')).toBe(1000)
    expect(parseFinancialInput('  1.000  ')).toBe(1000)
  })

  it('parses accounting parentheses as negatives', () => {
    expect(parseFinancialInput('(750.000)')).toBe(-750000)
    expect(parseFinancialInput('(1.234.567)')).toBe(-1234567)
  })

  it('parses explicit negative sign', () => {
    expect(parseFinancialInput('-3.182.342.447')).toBe(-3182342447)
    expect(parseFinancialInput('-1000')).toBe(-1000)
  })

  it('parses comma as decimal separator', () => {
    expect(parseFinancialInput('1234567,89')).toBeCloseTo(1234567.89, 2)
    expect(parseFinancialInput('0,5')).toBeCloseTo(0.5, 2)
  })

  it('returns 0 for empty string', () => {
    expect(parseFinancialInput('')).toBe(0)
    expect(parseFinancialInput('   ')).toBe(0)
  })

  it('returns 0 for non-numeric garbage', () => {
    expect(parseFinancialInput('abc')).toBe(0)
    expect(parseFinancialInput('hello')).toBe(0)
  })

  it('handles zero explicitly', () => {
    expect(parseFinancialInput('0')).toBe(0)
  })

  it('handles mixed Rp + parens (negative currency)', () => {
    expect(parseFinancialInput('(Rp 500.000)')).toBe(-500000)
  })
})

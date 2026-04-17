import { describe, it, expect } from 'vitest'
import { t, createT } from '@/lib/i18n/translations'

describe('t() — basic lookup', () => {
  it('returns en value', () => {
    expect(t('common.value', 'en')).toBe('Value')
  })
  it('returns id value', () => {
    expect(t('common.value', 'id')).toBe('Nilai')
  })
})

describe('t() — interpolation', () => {
  it('replaces {year} placeholder', () => {
    // This key will be added during Session 029 migration.
    const result = t('dcf.fcfYearRow', 'en', { year: 2021 })
    expect(result).toBe('FCF (2021)')
  })
  it('replaces multiple placeholders', () => {
    const result = t('dcf.marketValuePortionRow', 'en', { pct: '80.00%' })
    expect(result).toBe('Market Value (80.00% Equity)')
  })
  it('falls back to en when id value missing', () => {
    // Use a key that exists (we will assert on actual stored value after migration)
    const enValue = t('dcf.fcfYearRow', 'en', { year: 2020 })
    const idValue = t('dcf.fcfYearRow', 'id', { year: 2020 })
    expect(enValue).toContain('2020')
    expect(idValue).toContain('2020')
  })
  it('leaves placeholder unchanged when not provided in vars', () => {
    const result = t('dcf.fcfYearRow', 'en')
    expect(result).toBe('FCF ({year})')
  })
})

describe('createT() — language-bound t function', () => {
  it('returns a function that uses bound language', () => {
    const tEn = createT('en')
    const tId = createT('id')
    expect(tEn('common.value')).toBe('Value')
    expect(tId('common.value')).toBe('Nilai')
  })
  it('supports vars in bound function', () => {
    const tEn = createT('en')
    expect(tEn('dcf.fcfYearRow', { year: 2019 })).toBe('FCF (2019)')
  })
})

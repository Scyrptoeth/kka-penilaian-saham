import { describe, expect, it } from 'vitest'

import { isNipValid, whitelistSize } from '@/lib/auth/nip-whitelist'
import whitelist from '../../../data/nip-whitelist.json'

describe('nip-whitelist', () => {
  it('loads a non-empty whitelist at build time', () => {
    expect(whitelistSize()).toBeGreaterThan(0)
    expect(whitelistSize()).toBe(whitelist.nips.length)
  })

  it('accepts a NIP present in the whitelist', () => {
    const first = whitelist.nips[0] as string
    const last = whitelist.nips[whitelist.nips.length - 1] as string
    expect(isNipValid(first)).toBe(true)
    expect(isNipValid(last)).toBe(true)
  })

  it('rejects NIPs not in the whitelist', () => {
    expect(isNipValid('000000000')).toBe(false)
    expect(isNipValid('12345678')).toBe(false)
  })

  it('rejects non-digit and malformed input', () => {
    expect(isNipValid('abc123456')).toBe(false)
    expect(isNipValid('')).toBe(false)
    expect(isNipValid('   ')).toBe(false)
    expect(isNipValid('1234')).toBe(false)
    expect(isNipValid(null)).toBe(false)
    expect(isNipValid(undefined)).toBe(false)
    expect(isNipValid(60096391 as unknown)).toBe(false)
  })

  it('trims surrounding whitespace before matching', () => {
    const first = whitelist.nips[0] as string
    expect(isNipValid(`  ${first}  `)).toBe(true)
  })
})

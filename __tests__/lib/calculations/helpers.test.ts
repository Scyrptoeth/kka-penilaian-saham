import { describe, expect, it } from 'vitest'
import {
  ratioOfBase,
  yoyChange,
  yoyChangeSafe,
  average,
  sumRange,
} from '@/lib/calculations/helpers'

describe('ratioOfBase', () => {
  it('divides value by base', () => {
    expect(ratioOfBase(10, 40)).toBe(0.25)
  })

  it('returns 0 when base is 0 (IFERROR semantics)', () => {
    expect(ratioOfBase(100, 0)).toBe(0)
  })
})

describe('yoyChange', () => {
  it('computes percentage change from prior to current', () => {
    expect(yoyChange(120, 100)).toBeCloseTo(0.2, 12)
    expect(yoyChange(80, 100)).toBeCloseTo(-0.2, 12)
  })

  it('throws when previous is zero', () => {
    expect(() => yoyChange(100, 0)).toThrow(RangeError)
  })
})

describe('yoyChangeSafe', () => {
  it('matches yoyChange for non-zero previous', () => {
    expect(yoyChangeSafe(120, 100)).toBe(0.2)
  })

  it('returns 0 when previous is zero (IFERROR semantics)', () => {
    expect(yoyChangeSafe(100, 0)).toBe(0)
  })
})

describe('average', () => {
  it('computes arithmetic mean', () => {
    expect(average([1, 2, 3])).toBe(2)
    expect(average([-1, 1])).toBe(0)
  })

  it('throws on empty input', () => {
    expect(() => average([])).toThrow(RangeError)
  })
})

describe('sumRange', () => {
  it('sums an array of numbers', () => {
    expect(sumRange([1, 2, 3, 4])).toBe(10)
  })

  it('returns 0 for empty array', () => {
    expect(sumRange([])).toBe(0)
  })
})

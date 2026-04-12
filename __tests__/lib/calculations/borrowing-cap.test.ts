import { describe, expect, it } from 'vitest'
import {
  computeBorrowingCap,
  type BorrowingCapInput,
} from '@/lib/calculations/borrowing-cap'

/**
 * Ground truth from __tests__/fixtures/borrowing-cap.json
 *
 * Section 1 — Borrowing Capacity:
 *   D5=333625997484 (piutangCalk, literal), F5=BS!F10+F11=4382100694
 *   D6=425521174257 (persediaanCalk, literal), F6=BS!F12=1423637783
 *   D7=BS!F22=6264339945, E7=0.7 (literal), F7=D7*E7=4385037961.5
 *   D8=SUM(D5:D7)=765411511686, F8=SUM(F5:F7)=10190776438.5
 *
 * Section 2 — Weighted Average Rate:
 *   D12=DISCOUNT RATE!G7=0.06864 (cost of debt after tax)
 *   E12=F8/D8=0.01331411441154367 (weight debt)
 *   F12=E12*D12=0.0009138808132083575
 *   D13=DISCOUNT RATE!G8=0.12453700000000001 (cost of equity)
 *   E13=1-E12=0.9866858855884564 (weight equity)
 *   F13=E13*D13=0.1228789001335296
 *   F14=F12+F13=0.12379278094673796 (final output)
 */

const PRECISION = 10

const FIXTURE_INPUT: BorrowingCapInput = {
  piutangCalk: 333625997484,
  persediaanCalk: 425521174257,
  bsReceivables: 4382100694, // BS!F10 + F11
  bsInventory: 1423637783, // BS!F12
  bsFixedAssetNet: 6264339945, // BS!F22
  borrowingPercent: 0.7,
  costDebtAfterTax: 0.06864, // DR!G7
  costEquity: 0.12453700000000001, // DR!G8
}

describe('computeBorrowingCap matches Excel fixture', () => {
  const result = computeBorrowingCap(FIXTURE_INPUT)

  it('computes borrowing capacity per asset', () => {
    expect(result.borrowingCapReceivables).toBeCloseTo(4382100694, PRECISION)
    expect(result.borrowingCapInventory).toBeCloseTo(1423637783, PRECISION)
    expect(result.borrowingCapFixedAsset).toBeCloseTo(4385037961.5, PRECISION)
  })

  it('computes total assets and total borrowing capacity', () => {
    expect(result.totalAssets).toBeCloseTo(765411511686, PRECISION)
    expect(result.totalBorrowingCap).toBeCloseTo(10190776438.5, PRECISION)
  })

  it('computes debt and equity weights', () => {
    expect(result.weightDebt).toBeCloseTo(0.01331411441154367, PRECISION)
    expect(result.weightEquity).toBeCloseTo(0.9866858855884564, PRECISION)
  })

  it('computes weighted cost of capital components', () => {
    expect(result.weightedCostDebt).toBeCloseTo(0.0009138808132083575, PRECISION)
    expect(result.weightedCostEquity).toBeCloseTo(0.1228789001335296, PRECISION)
  })

  it('computes final waccTangible (F14)', () => {
    expect(result.waccTangible).toBeCloseTo(0.12379278094673796, PRECISION)
  })

  it('handles zero totalAssets gracefully', () => {
    const zeroInput: BorrowingCapInput = {
      ...FIXTURE_INPUT,
      piutangCalk: 0,
      persediaanCalk: 0,
      bsFixedAssetNet: 0,
    }
    const r = computeBorrowingCap(zeroInput)
    expect(r.totalAssets).toBe(0)
    expect(r.weightDebt).toBe(0)
    expect(r.weightEquity).toBe(0)
    expect(r.waccTangible).toBe(0)
  })
})

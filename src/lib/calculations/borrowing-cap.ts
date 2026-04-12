/**
 * Borrowing Capacity / Rate of Return on Net Tangible Assets.
 *
 * Computes weighted average return on tangible assets for EEM.
 * Source: BORROWING CAP sheet (visible).
 *
 * Section 1: Borrowing capacity per asset type (CALK values are external user input).
 * Section 2: Weighted average return using Discount Rate cost of debt/equity.
 */

export interface BorrowingCapInput {
  /** CALK Piutang (D5) — external data, user input. */
  piutangCalk: number
  /** CALK Persediaan (D6) — external data, user input. */
  persediaanCalk: number
  /** BS!F10 + BS!F11 — Account Receivable + Other Receivable. */
  bsReceivables: number
  /** BS!F12 — Inventory. */
  bsInventory: number
  /** BS!F22 — Fixed Asset Net value. */
  bsFixedAssetNet: number
  /** Borrowing percentage for fixed assets (E7). Default 0.7 = 70%. */
  borrowingPercent: number
  /** DISCOUNT RATE!G7 — cost of debt after tax. */
  costDebtAfterTax: number
  /** DISCOUNT RATE!G8 — cost of equity. */
  costEquity: number
}

export interface BorrowingCapResult {
  // Section 1 — Borrowing Capacity
  borrowingCapReceivables: number // F5 = BS receivables
  borrowingCapInventory: number // F6 = BS inventory
  borrowingCapFixedAsset: number // F7 = D7 * E7
  totalAssets: number // D8 = D5 + D6 + D7
  totalBorrowingCap: number // F8 = F5 + F6 + F7

  // Section 2 — Weighted Average Rate
  weightDebt: number // E12 = F8/D8
  weightEquity: number // E13 = 1 - E12
  weightedCostDebt: number // F12 = E12 * D12
  weightedCostEquity: number // F13 = E13 * D13
  waccTangible: number // F14 = F12 + F13 — THE OUTPUT EEM NEEDS
}

export function computeBorrowingCap(input: BorrowingCapInput): BorrowingCapResult {
  const {
    piutangCalk,
    persediaanCalk,
    bsReceivables,
    bsInventory,
    bsFixedAssetNet,
    borrowingPercent,
    costDebtAfterTax,
    costEquity,
  } = input

  // Section 1 — Borrowing Capacity
  const borrowingCapReceivables = bsReceivables // F5
  const borrowingCapInventory = bsInventory // F6
  const borrowingCapFixedAsset = bsFixedAssetNet * borrowingPercent // F7
  const totalAssets = piutangCalk + persediaanCalk + bsFixedAssetNet // D8
  const totalBorrowingCap =
    borrowingCapReceivables + borrowingCapInventory + borrowingCapFixedAsset // F8

  // Section 2 — Weighted Average Rate
  if (totalAssets === 0) {
    return {
      borrowingCapReceivables,
      borrowingCapInventory,
      borrowingCapFixedAsset,
      totalAssets,
      totalBorrowingCap,
      weightDebt: 0,
      weightEquity: 0,
      weightedCostDebt: 0,
      weightedCostEquity: 0,
      waccTangible: 0,
    }
  }

  const weightDebt = totalBorrowingCap / totalAssets // E12
  const weightEquity = 1 - weightDebt // E13
  const weightedCostDebt = weightDebt * costDebtAfterTax // F12
  const weightedCostEquity = weightEquity * costEquity // F13
  const waccTangible = weightedCostDebt + weightedCostEquity // F14

  return {
    borrowingCapReceivables,
    borrowingCapInventory,
    borrowingCapFixedAsset,
    totalAssets,
    totalBorrowingCap,
    weightDebt,
    weightEquity,
    weightedCostDebt,
    weightedCostEquity,
    waccTangible,
  }
}

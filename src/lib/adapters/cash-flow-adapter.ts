/**
 * Cash Flow Statement adapter.
 *
 * Translates raw positive quantities into the pre-signed `CashFlowInput`
 * shape that the pure `computeCashFlowStatement` expects.
 *
 * Sign conventions observed in the reference workbook's CASH FLOW STATEMENT
 * sheet (see `formula` column of cash-flow-statement.json):
 *
 *   Row 5  EBITDA                       = IS row 18          (positive)
 *   Row 6  Corporate Tax                = IS row 33          (already negative on IS)
 *   Row 8  ΔCurrent Assets              = signed BS deltas    (passed through)
 *   Row 9  ΔCurrent Liabilities         = signed BS deltas    (passed through)
 *   Row 13 Cash Flow from Non-Ops       = IS row 30          (signed)
 *   Row 17 CAPEX                        = 'FIXED ASSET'!row 23 * -1  ← flip
 *   Row 22 Equity Injection             (passed through)
 *   Row 23 New Loan                     = ACC PAYABLES        (positive inflow)
 *   Row 24 Interest Payment             = IS row 27          (already negative)
 *   Row 25 Interest Income              = IS row 26          (positive)
 *   Row 26 Principal Repayment          = ACC PAYABLES        (signed)
 *
 * Only CAPEX requires an explicit sign flip in this adapter. Everything
 * else is already stored with the correct sign at source and is passed
 * through unchanged. We still centralize the flow here so future developers
 * have one place to audit sign conventions instead of searching 11 callsites.
 */

import type { CashFlowInput } from '../calculations/cash-flow'
import type { YearKeyedSeries } from '@/types/financial'
import { mapSeries } from '../calculations/helpers'

export interface RawCashFlowData {
  ebitda: YearKeyedSeries
  /** Corporate tax as stored on IS row 33 (already negative). */
  corporateTaxRawSigned: YearKeyedSeries
  /** ΔCurrent Assets — signed as in Cash Flow Statement row 8. */
  deltaCurrentAssets: YearKeyedSeries
  /** ΔCurrent Liabilities — signed as in Cash Flow Statement row 9. */
  deltaCurrentLiabilities: YearKeyedSeries
  /** Non-operating income as stored on IS row 30 (signed). */
  cashFlowFromNonOperations: YearKeyedSeries
  /** Positive CAPEX from Fixed Asset totals.acquisitionAdditions. */
  capex: YearKeyedSeries
  /** Equity contributions from shareholders (positive inflow). */
  equityInjection: YearKeyedSeries
  /** New loan proceeds from ACC PAYABLES (positive inflow). */
  newLoan: YearKeyedSeries
  /** Interest payment as stored on IS row 27 (already negative). */
  interestPaymentRawSigned: YearKeyedSeries
  /** Interest income as stored on IS row 26 (positive). */
  interestIncomeRawSigned: YearKeyedSeries
  /** Principal repayment from ACC PAYABLES (signed). */
  principalRepayment: YearKeyedSeries
}

/**
 * Builds the pre-signed CashFlowInput. Applies the `capex * -1` flip that
 * the CASH FLOW STATEMENT sheet performs; every other field passes through.
 */
export function toCashFlowInput(raw: RawCashFlowData): CashFlowInput {
  return {
    ebitda: { ...raw.ebitda },
    corporateTax: { ...raw.corporateTaxRawSigned },
    deltaCurrentAssets: { ...raw.deltaCurrentAssets },
    deltaCurrentLiabilities: { ...raw.deltaCurrentLiabilities },
    cashFlowFromNonOperations: { ...raw.cashFlowFromNonOperations },
    capex: mapSeries(raw.capex, (v) => -v),
    equityInjection: { ...raw.equityInjection },
    newLoan: { ...raw.newLoan },
    interestPayment: { ...raw.interestPaymentRawSigned },
    interestIncome: { ...raw.interestIncomeRawSigned },
    principalRepayment: { ...raw.principalRepayment },
  }
}

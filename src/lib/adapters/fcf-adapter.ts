/**
 * FCF adapter — translates raw positive quantities into `FcfInput` with
 * the pre-signed convention the pure calc function expects.
 *
 * The reference workbook's FCF sheet uses these formula patterns:
 *
 *   FCF row 8  "Add: Depreciation"        = 'FIXED ASSET'!row51 * -1
 *   FCF row 16 "Less: Capital Expenditures" = 'FIXED ASSET'!row23 * -1
 *
 * Both pull the POSITIVE totals from the Fixed Asset schedule and negate
 * them, so that the subsequent `+C7+C8` and `+C14+C16` produce the correct
 * accounting result. `computeFcf` mirrors this arithmetic literally.
 *
 * This adapter is the single place where the `*-1` exists in application
 * code. UI callers pass raw positive depreciation and raw positive capex
 * (as the Fixed Asset module produces them), and the adapter hands a
 * properly-signed FcfInput to the pure calculation function.
 */

import type { FcfInput } from '../calculations/fcf'
import type { YearKeyedSeries } from '@/types/financial'
import { mapSeries } from '../calculations/helpers'

export interface RawFcfData {
  /** NOPLAT series as produced by `computeNoplat`. Positive operating profit. */
  noplat: YearKeyedSeries
  /**
   * Positive depreciation expense for the year (as produced by Fixed Asset
   * totals.depreciationAdditions). The adapter will negate it.
   */
  depreciation: YearKeyedSeries
  /**
   * Change in current assets — signed the same way the Cash Flow Statement
   * stores it (typically negative when current assets grow). Pass through
   * unchanged.
   */
  deltaCurrentAssets: YearKeyedSeries
  /**
   * Change in current liabilities — signed the same way the Cash Flow
   * Statement stores it. Pass through unchanged.
   */
  deltaCurrentLiabilities: YearKeyedSeries
  /**
   * Positive CAPEX for the year (as produced by Fixed Asset
   * totals.acquisitionAdditions). The adapter will negate it.
   */
  capex: YearKeyedSeries
}

/**
 * Builds the pre-signed FcfInput. The only sign transformations are:
 *   depreciationAddback = −depreciation
 *   capex (input)       = −capex (raw)
 *
 * Matches the `*-1` pattern in the FCF sheet.
 */
export function toFcfInput(raw: RawFcfData): FcfInput {
  return {
    noplat: { ...raw.noplat },
    depreciationAddback: mapSeries(raw.depreciation, (v) => -v),
    deltaCurrentAssets: { ...raw.deltaCurrentAssets },
    deltaCurrentLiabilities: { ...raw.deltaCurrentLiabilities },
    capex: mapSeries(raw.capex, (v) => -v),
  }
}

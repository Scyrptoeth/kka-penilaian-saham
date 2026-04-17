import type { SheetBuilder } from './types'
import {
  writeScalarsForSheet,
  writeDynamicRowsForSheet,
} from '@/lib/export/export-xlsx'

const SHEET_NAME = 'DISCOUNT RATE'

/**
 * DiscountRateBuilder — state-driven DISCOUNT RATE sheet owner.
 *
 * build() composes:
 *   1. writeScalarsForSheet — 6 scalars at C2..C8 (taxRate, riskFree,
 *      beta, equityRiskPremium, countryDefaultSpread, derIndustry)
 *   2. writeDynamicRowsForSheet — bankRates starting row 6, K/L columns.
 *      Rate column auto-multiplied by 100 via columnTransforms on the
 *      mapping (store stores 0.0825, Excel expects 8.25 for display).
 *
 * Upstream: `['discountRate']`. Orchestrator clears the sheet when
 * state.discountRate is null.
 */
export const DiscountRateBuilder: SheetBuilder = {
  sheetName: SHEET_NAME,
  upstream: ['discountRate'],
  build(workbook, state) {
    writeScalarsForSheet(workbook, state, SHEET_NAME)
    writeDynamicRowsForSheet(workbook, state, SHEET_NAME)
  },
}

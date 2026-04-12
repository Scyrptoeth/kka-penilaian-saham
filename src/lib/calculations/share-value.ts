/**
 * Shared equity → share value computation used by DCF and EEM.
 *
 * Chain: Equity100% → DLOM → DLOC → MV100 → MV portion → ROUNDUP → perShare
 *
 * AAM has a different tail (no ROUNDUP/perShare, has 600M deduction) and
 * should NOT use this function.
 */
import { roundUp } from './helpers'

export interface ShareValueInput {
  /** Total equity value before any discounts. */
  equityValue100: number
  /** DLOM percentage as positive decimal (e.g. 0.4 = 40%). Applied as negative multiplier. */
  dlomPercent: number
  /** DLOC percentage as positive decimal (e.g. 0.54 = 54%). 0 if not applicable. */
  dlocPercent: number
  /** Proportion of shares being valued (e.g. 0.3 = 30%). */
  proporsiSaham: number
  /** Total outstanding shares. */
  jumlahSahamBeredar: number
}

export interface ShareValueResult {
  dlomDiscount: number
  equityLessDlom: number
  dlocDiscount: number
  marketValue100: number
  marketValuePortion: number
  rounded: number
  perShare: number
}

export function computeShareValue(input: ShareValueInput): ShareValueResult {
  const {
    equityValue100,
    dlomPercent,
    dlocPercent,
    proporsiSaham,
    jumlahSahamBeredar,
  } = input

  // DLOM: equity * (-dlomPercent). Normalize -0 → 0.
  const dlomDiscount = equityValue100 * -dlomPercent || 0
  const equityLessDlom = equityValue100 + dlomDiscount

  // DLOC: equityLessDlom * (-dlocPercent). Normalize -0 → 0.
  const dlocDiscount = equityLessDlom * -dlocPercent || 0
  const marketValue100 = equityLessDlom + dlocDiscount

  // Portion and rounding
  const marketValuePortion = marketValue100 * proporsiSaham
  const rounded = roundUp(marketValuePortion, -3)
  const perShare =
    jumlahSahamBeredar !== 0 ? marketValuePortion / jumlahSahamBeredar : 0

  return {
    dlomDiscount,
    equityLessDlom,
    dlocDiscount,
    marketValue100,
    marketValuePortion,
    rounded,
    perShare,
  }
}

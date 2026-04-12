/**
 * Excess Earnings Method (EEM) / Metode Kapitalisasi Kelebihan Pendapatan.
 *
 * Source: EEM sheet. Uses HISTORICAL data only (last year FCF, not projected).
 *
 * Logic:
 * 1. Net Tangible Asset (NTA) from AAM adjusted balance sheet
 * 2. Normal earning return = NTA × Borrowing Cap rate
 * 3. FCF from historical year
 * 4. Excess earning = FCF - normal return
 * 5. Capitalize excess earning = excess / WACC (goodwill proxy)
 * 6. Enterprise Value = NTA + capitalized excess
 * 7. Equity Value = EV + IBD + non-operating asset
 *
 * The equity→share value tail (DLOM/DLOC/ROUNDUP/perShare) is handled by
 * computeShareValue() — this function returns equityValue100.
 */

export interface EemInput {
  // NTA components from AAM adjusted values (E column)
  aamTotalCurrentAssets: number // AAM!E16
  aamTotalNonCurrentAssets: number // AAM!E22
  aamAccountPayable: number // AAM!E29
  aamTaxPayable: number // AAM!E30
  aamOtherCurrentLiabilities: number // AAM!E31
  aamRelatedPartyNCL: number // AAM!E36
  aamCashOnHands: number // AAM!E9 (excluded from NTA — non-operating)
  // Borrowing Cap rate
  waccTangible: number // BORROWING CAP!F14
  // Historical FCF (last year, all pre-signed per Excel)
  historicalNoplat: number // NOPLAT!E19
  historicalDepreciation: number // FA!E51
  historicalTotalWC: number // CFS!E10 (= ChangesCA + ChangesCL)
  historicalCapex: number // FA!E23*-1 (negative)
  // Discount rate (WACC = capitalization rate)
  wacc: number // DISCOUNT RATE!H10
  // Equity adjustments
  interestBearingDebt: number // (BS!F31+F38)*-1 (negative)
  nonOperatingAsset: number // BS!F8 (cash on hands, positive)
}

export interface EemResult {
  netTangibleAsset: number // D7
  earningReturn: number // D9 = NTA × waccTangible
  grossCashFlow: number // D14 = NOPLAT + depreciation
  totalWC: number // D19
  grossInvestment: number // D23 = WC + capex
  fcf: number // D25 = gross CF + gross investment
  excessEarning: number // D27 = FCF - earning return
  capitalizedExcess: number // D29 = excess / WACC
  enterpriseValue: number // D31 = NTA + capitalized excess
  equityValue100: number // D34 = EV + IBD + non-op asset
}

export function computeEem(input: EemInput): EemResult {
  const {
    aamTotalCurrentAssets,
    aamTotalNonCurrentAssets,
    aamAccountPayable,
    aamTaxPayable,
    aamOtherCurrentLiabilities,
    aamRelatedPartyNCL,
    aamCashOnHands,
    waccTangible,
    historicalNoplat,
    historicalDepreciation,
    historicalTotalWC,
    historicalCapex,
    wacc,
    interestBearingDebt,
    nonOperatingAsset,
  } = input

  if (wacc === 0) {
    throw new Error('EEM: WACC cannot be zero (division by zero in capitalization).')
  }

  // D7: NTA = (Current + Non-Current) - (AP + Tax + Others + RelParty) - Cash
  const netTangibleAsset =
    aamTotalCurrentAssets +
    aamTotalNonCurrentAssets -
    (aamAccountPayable + aamTaxPayable + aamOtherCurrentLiabilities + aamRelatedPartyNCL) -
    aamCashOnHands

  // D9: Normal earning return on tangible assets
  const earningReturn = netTangibleAsset * waccTangible

  // Historical FCF (single year)
  const grossCashFlow = historicalNoplat + historicalDepreciation // D14
  const totalWC = historicalTotalWC // D19 (already computed: CA + CL)
  const grossInvestment = totalWC + historicalCapex // D23
  const fcf = grossCashFlow + grossInvestment // D25

  // Excess earning + capitalization
  const excessEarning = fcf - earningReturn // D27
  const capitalizedExcess = excessEarning / wacc // D29 (goodwill proxy)

  // Enterprise value → Equity value
  const enterpriseValue = netTangibleAsset + capitalizedExcess // D31
  const equityValue100 = enterpriseValue + interestBearingDebt + nonOperatingAsset // D34

  return {
    netTangibleAsset,
    earningReturn,
    grossCashFlow,
    totalWC,
    grossInvestment,
    fcf,
    excessEarning,
    capitalizedExcess,
    enterpriseValue,
    equityValue100,
  }
}

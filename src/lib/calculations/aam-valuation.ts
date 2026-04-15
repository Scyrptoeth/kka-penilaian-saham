/**
 * Adjusted Asset Method (AAM) / Metode Penyesuaian Aset Bersih.
 *
 * Source: AAM sheet. 3-column layout: C (historical), D (adjustments), E (adjusted).
 *
 * NAV formula (row 51): Total Assets - (AP + Tax + Others) - Related Party NCL
 * This is NOT total assets minus total liabilities — Bank Loans are excluded
 * from NAV and counted separately as Interest Bearing Debt.
 *
 * AAM does NOT have ROUNDUP or perShare steps (unlike DCF/EEM).
 * AAM ends at Market Value Portion (row 59 = row 57 × proporsiSaham).
 *
 * Row 60 ("Nilai Akhir AAM = E59 − paid-up capital deduction") is NOT modeled:
 * per user decision (revisi-kedua-PENILAIAN-AAM.png), AAM's final output is
 * Market Value Portion. Dashboard perShare divides that portion directly.
 */

export interface AamInput {
  // Current assets (BS last year F column)
  cashOnHands: number // BS!F8
  cashOnBank: number // BS!F9
  accountReceivable: number // BS!F10
  otherReceivable: number // BS!F11
  inventory: number // BS!F12
  otherCurrentAssets: number // BS!F14
  // Non-current assets
  fixedAssetNet: number // BS!F22
  otherNonCurrentAssets: number // BS!F23
  intangibleAssets: number // BS!F24
  totalNonCurrentAssets: number // BS!F25
  // Sum of all per-row adjustments (D column total, for revaluation row)
  totalAdjustments: number
  // Current liabilities
  bankLoanST: number // BS!F31
  accountPayable: number // BS!F32
  taxPayable: number // BS!F33
  otherCurrentLiabilities: number // BS!F34
  // Non-current liabilities
  bankLoanLT: number // BS!F38
  relatedPartyNCL: number // BS!F39
  // Equity
  modalDisetor: number // BS!F43
  agioDisagio: number // BS!F44
  retainedCurrentYear: number // BS!F46
  retainedPriorYears: number // BS!F47
  // Valuation params (positive decimals, function negates)
  dlomPercent: number
  dlocPercent: number
  proporsiSaham: number
}

export interface AamResult {
  // Adjusted balance sheet
  totalCurrentAssets: number // E16
  adjustedFixedAssetNet: number // E20
  totalNonCurrentAssets: number // E22
  totalAssets: number // E24 = E16 + E22 + E23
  totalCurrentLiabilities: number // E32
  totalNonCurrentLiabilities: number // E37
  revaluation: number // E46 = D20 + D21
  totalEquity: number // E47
  totalLiabilitiesAndEquity: number // E49
  // Valuation chain
  netAssetValue: number // E51 = E24 - (E29+E30+E31) - E36
  interestBearingDebt: number // E52 = C28 + C35 (HISTORICAL, not adjusted)
  equityValue: number // E53
  dlomDiscount: number // E54
  equityLessDlom: number // E55
  dlocDiscount: number // E56
  marketValue100: number // E57
  marketValuePortion: number // E59 — AAM final output
}

export function computeAam(input: AamInput): AamResult {
  const {
    cashOnHands,
    cashOnBank,
    accountReceivable,
    otherReceivable,
    inventory,
    otherCurrentAssets,
    fixedAssetNet,
    otherNonCurrentAssets,
    intangibleAssets,
    totalAdjustments,
    bankLoanST,
    accountPayable,
    taxPayable,
    otherCurrentLiabilities,
    bankLoanLT,
    relatedPartyNCL,
    modalDisetor,
    agioDisagio,
    retainedCurrentYear,
    retainedPriorYears,
    dlomPercent,
    dlocPercent,
    proporsiSaham,
  } = input

  // --- Adjusted Balance Sheet ---

  // All current assets: no adjustment in prototype (E = C + 0)
  const totalCurrentAssets =
    cashOnHands + cashOnBank + accountReceivable + otherReceivable + inventory + otherCurrentAssets

  // Non-current assets (all values pre-adjusted by caller)
  const adjustedFixedAssetNet = fixedAssetNet // E20 (already includes adjustment)
  const totalNonCurrentAssets = fixedAssetNet + otherNonCurrentAssets // E22

  // E24: Total Assets = Total Current + Total Non-Current + Intangible
  const totalAssets = totalCurrentAssets + totalNonCurrentAssets + intangibleAssets

  // Current liabilities (no adjustments)
  const totalCurrentLiabilities =
    bankLoanST + accountPayable + taxPayable + otherCurrentLiabilities

  // Non-current liabilities (no adjustments)
  const totalNonCurrentLiabilities = bankLoanLT + relatedPartyNCL

  // Equity
  const revaluation = totalAdjustments // D46 = sum of all D column adjustments
  const retainedTotal = retainedCurrentYear + retainedPriorYears // E45
  const totalEquity = modalDisetor + retainedTotal + agioDisagio + revaluation // E47

  // Total L&E
  const totalLiabilitiesAndEquity =
    totalCurrentLiabilities + totalNonCurrentLiabilities + totalEquity

  // --- Valuation Chain ---

  // E51: NAV = Total Assets - (AP + Tax + Others CL) - Related Party NCL
  // Excludes bank loans (counted as IBD separately)
  const netAssetValue =
    totalAssets - (accountPayable + taxPayable + otherCurrentLiabilities) - relatedPartyNCL

  // E52: Interest Bearing Debt = Bank Loan ST + Bank Loan LT (HISTORICAL, not adjusted)
  const interestBearingDebt = bankLoanST + bankLoanLT

  // E53: Equity Value = NAV - IBD
  const equityValue = netAssetValue - interestBearingDebt

  // E54: DLOM discount
  const dlomDiscount = equityValue * -dlomPercent
  const equityLessDlom = equityValue + dlomDiscount // E55

  // E56: DLOC discount
  const dlocDiscount = equityLessDlom * -dlocPercent
  const marketValue100 = equityLessDlom + dlocDiscount // E57

  // E59: Market Value portion — AAM final output.
  const marketValuePortion = marketValue100 * proporsiSaham

  return {
    totalCurrentAssets,
    adjustedFixedAssetNet,
    totalNonCurrentAssets,
    totalAssets,
    totalCurrentLiabilities,
    totalNonCurrentLiabilities,
    revaluation,
    totalEquity,
    totalLiabilitiesAndEquity,
    netAssetValue,
    interestBearingDebt,
    equityValue,
    dlomDiscount,
    equityLessDlom,
    dlocDiscount,
    marketValue100,
    marketValuePortion,
  }
}

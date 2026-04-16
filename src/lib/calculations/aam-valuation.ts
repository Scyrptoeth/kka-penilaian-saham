/**
 * Adjusted Asset Method (AAM) / Metode Penyesuaian Aset Bersih.
 *
 * Source: AAM sheet. 3-column layout: C (historical), D (adjustments), E (adjusted).
 *
 * NAV formula (row 51): Total Assets - non-IBD Current Liabilities - non-IBD NCL
 * Bank Loans are excluded from NAV and counted separately as Interest Bearing Debt.
 *
 * AAM does NOT have ROUNDUP or perShare steps (unlike DCF/EEM).
 * AAM ends at Market Value Portion (row 59 = row 57 × proporsiSaham).
 *
 * Session 027 redesign: AamInput changed from 20 named BS-row fields
 * to section-based totals. This makes AAM work with dynamic BS accounts
 * (catalog + custom) instead of hardcoded Excel prototype rows.
 */

export interface AamInput {
  // Asset section totals (all adjusted: C + D)
  totalCurrentAssets: number
  totalNonCurrentAssets: number // FA Net + Other NC assets
  intangibleAssets: number
  totalAssets: number // CA + NCA + Intangible

  // Liability section totals, split by IBD classification
  nonIbdCurrentLiabilities: number // AP, Tax, Others (excl bank loans)
  ibdCurrentLiabilities: number // Bank Loan ST
  totalCurrentLiabilities: number // non-IBD + IBD
  nonIbdNonCurrentLiabilities: number // Related Party, etc (excl bank loans)
  ibdNonCurrentLiabilities: number // Bank Loan LT
  totalNonCurrentLiabilities: number // non-IBD + IBD
  interestBearingDebtHistorical: number // Bank Loan ST + LT — HISTORICAL, not adjusted

  // Equity
  totalEquity: number // all equity accounts adjusted
  totalAdjustments: number // sum of all D-column adjustments (for revaluation row)

  // Valuation params (positive decimals, function negates)
  dlomPercent: number
  dlocPercent: number
  proporsiSaham: number
}

export interface AamResult {
  // Adjusted balance sheet
  totalCurrentAssets: number // E16
  totalNonCurrentAssets: number // E22
  totalAssets: number // E24
  totalCurrentLiabilities: number // E32
  totalNonCurrentLiabilities: number // E37
  revaluation: number // E46 = sum of all D column adjustments
  totalEquity: number // E47
  totalLiabilitiesAndEquity: number // E49
  // Valuation chain
  netAssetValue: number // E51 = totalAssets - nonIbdCL - nonIbdNCL
  interestBearingDebt: number // E52 = historical bank loans
  equityValue: number // E53
  dlomDiscount: number // E54
  equityLessDlom: number // E55
  dlocDiscount: number // E56
  marketValue100: number // E57
  marketValuePortion: number // E59 — AAM final output
}

export function computeAam(input: AamInput): AamResult {
  const {
    totalCurrentAssets,
    totalNonCurrentAssets,
    intangibleAssets,
    totalAssets,
    nonIbdCurrentLiabilities,
    totalCurrentLiabilities,
    nonIbdNonCurrentLiabilities,
    totalNonCurrentLiabilities,
    interestBearingDebtHistorical,
    totalEquity,
    totalAdjustments,
    dlomPercent,
    dlocPercent,
    proporsiSaham,
  } = input

  // --- Adjusted Balance Sheet ---

  // Revaluation = sum of all per-row adjustments (D column)
  const revaluation = totalAdjustments

  // Total L&E
  const totalLiabilitiesAndEquity =
    totalCurrentLiabilities + totalNonCurrentLiabilities + totalEquity

  // --- Valuation Chain ---

  // E51: NAV = Total Assets - non-IBD CL - non-IBD NCL
  // Excludes bank loans (counted as IBD separately)
  const netAssetValue =
    totalAssets - nonIbdCurrentLiabilities - nonIbdNonCurrentLiabilities

  // E52: Interest Bearing Debt (HISTORICAL, not adjusted)
  const interestBearingDebt = interestBearingDebtHistorical

  // E53: Equity Value = NAV - IBD
  const equityValue = netAssetValue - interestBearingDebt

  // E54: DLOM discount (function negates)
  const dlomDiscount = equityValue * -dlomPercent
  const equityLessDlom = equityValue + dlomDiscount // E55

  // E56: DLOC discount (function negates)
  const dlocDiscount = equityLessDlom * -dlocPercent
  const marketValue100 = equityLessDlom + dlocDiscount // E57

  // E59: Market Value portion — AAM final output
  const marketValuePortion = marketValue100 * proporsiSaham

  return {
    totalCurrentAssets,
    totalNonCurrentAssets: totalNonCurrentAssets + intangibleAssets,
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

/**
 * SIMULASI POTENSI — PPh kurang bayar dari pengalihan saham.
 *
 * Source: "SIMULASI POTENSI (AAM)" sheet.
 *
 * Takes equity value from any valuation method (DCF/AAM/EEM),
 * applies DLOM + DLOC discounts, computes market value portion,
 * then calculates progressive PPh Pasal 17 on the difference
 * between market value and reported transfer value.
 */

/**
 * PPh Pasal 17 progressive brackets.
 * `width` = bracket width (not cumulative limit).
 * Last bracket has Infinity width = unbounded top bracket.
 */
const PPH_BRACKETS = [
  { rate: 0.05, width: 60_000_000 },
  { rate: 0.15, width: 190_000_000 },
  { rate: 0.25, width: 250_000_000 },
  { rate: 0.30, width: 4_500_000_000 },
  { rate: 0.35, width: Infinity },
] as const

export interface SimulasiPotensiInput {
  /** Equity value (100%) from DCF/AAM/EEM — before DLOM/DLOC. */
  equityValue100: number
  /** DLOM percentage (negative, e.g. -0.30). */
  dlomPercent: number
  /** DLOC/PFC percentage (negative, e.g. -0.50). */
  dlocPercent: number
  /** Proportion of shares being valued (0-1). */
  proporsiKepemilikan: number
  /** Reported share transfer value from taxpayer (user input). */
  nilaiPengalihanDilaporkan: number
}

export interface SimulasiPotensiOutput {
  dlomAmount: number
  equityLessDlom: number
  dlocAmount: number
  marketValueEquity100: number
  marketValuePortion: number
  potensiPengalihan: number
  taxBrackets: Array<{ rate: number; taxableAmount: number; tax: number }>
  totalPPhKurangBayar: number
}

export function computeSimulasiPotensi(input: SimulasiPotensiInput): SimulasiPotensiOutput {
  const {
    equityValue100,
    dlomPercent,
    dlocPercent,
    proporsiKepemilikan,
    nilaiPengalihanDilaporkan,
  } = input

  // DLOM → DLOC chain (same as AAM/share-value but returning intermediates)
  const dlomAmount = equityValue100 * dlomPercent
  const equityLessDlom = equityValue100 + dlomAmount

  const dlocAmount = equityLessDlom * dlocPercent
  const marketValueEquity100 = equityLessDlom + dlocAmount

  const marketValuePortion = marketValueEquity100 * proporsiKepemilikan
  const potensiPengalihan = marketValuePortion - nilaiPengalihanDilaporkan

  // PPh Pasal 17 progressive tax
  const taxBrackets: Array<{ rate: number; taxableAmount: number; tax: number }> = []

  if (potensiPengalihan <= 0) {
    // No tax due — reported value >= market value
    for (const bracket of PPH_BRACKETS) {
      taxBrackets.push({ rate: bracket.rate, taxableAmount: 0, tax: 0 })
    }
    return {
      dlomAmount, equityLessDlom, dlocAmount,
      marketValueEquity100, marketValuePortion, potensiPengalihan,
      taxBrackets, totalPPhKurangBayar: 0,
    }
  }

  // Apply progressive brackets on potensiPengalihan
  let remaining = potensiPengalihan
  for (const bracket of PPH_BRACKETS) {
    const taxableAmount = Math.min(remaining, bracket.width)
    const tax = bracket.rate * taxableAmount
    taxBrackets.push({ rate: bracket.rate, taxableAmount, tax })
    remaining -= taxableAmount
    if (remaining <= 0) break
  }

  // Fill remaining brackets with zero if we exhausted early
  while (taxBrackets.length < PPH_BRACKETS.length) {
    const bracket = PPH_BRACKETS[taxBrackets.length]!
    taxBrackets.push({ rate: bracket.rate, taxableAmount: 0, tax: 0 })
  }

  const totalPPhKurangBayar = taxBrackets.reduce((sum, b) => sum + b.tax, 0)

  return {
    dlomAmount, equityLessDlom, dlocAmount,
    marketValueEquity100, marketValuePortion, potensiPengalihan,
    taxBrackets, totalPPhKurangBayar,
  }
}

/**
 * Resistensi WP — risk category based on DLOM and DLOC risk levels.
 *
 * Derived from the Excel formula's 9-cell matrix:
 *   C7 = IF(AND(C4="Paling Rendah...", C6="Paling Rendah..."), "Resiko Tinggi", ...)
 */
type RiskLevel = 'Paling Rendah (Resiko Tinggi)' | 'Moderat' | 'Paling Tinggi (Resiko Rendah)'

const RESISTENSI_MATRIX: Record<string, Record<string, string>> = {
  'Paling Rendah (Resiko Tinggi)': {
    'Paling Rendah (Resiko Tinggi)': 'Resiko Tinggi',
    'Moderat': 'Resiko Tinggi',
    'Paling Tinggi (Resiko Rendah)': 'Moderat',
  },
  'Moderat': {
    'Paling Rendah (Resiko Tinggi)': 'Resiko Tinggi',
    'Moderat': 'Moderat',
    'Paling Tinggi (Resiko Rendah)': 'Moderat',
  },
  'Paling Tinggi (Resiko Rendah)': {
    'Paling Rendah (Resiko Tinggi)': 'Moderat',
    'Moderat': 'Moderat',
    'Paling Tinggi (Resiko Rendah)': 'Resiko Rendah',
  },
}

export function computeResistensiWp(dlomRisk: RiskLevel | string, dlocRisk: RiskLevel | string): string {
  return RESISTENSI_MATRIX[dlomRisk]?.[dlocRisk] ?? ''
}

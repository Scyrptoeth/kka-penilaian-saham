/**
 * Financial type definitions for KKA Penilaian Saham.
 * Mirrors the data shape extracted from kka-penilaian-saham.xlsx.
 */

/**
 * A time series keyed by calendar year.
 *
 *   const revenue: YearKeyedSeries = { 2019: 52_109_888_424, 2020: 59_340_130_084 }
 *
 * Preferred over anonymous `number[]` for all analysis-layer data because:
 *   - Years are explicit data, not positional axes.
 *   - Cross-sheet merges cannot silently shift due to column offsets
 *     (the Excel workbook uses different columns for the same year across sheets).
 *   - Sparse/irregular year sets are expressible without sentinel values.
 *
 * Use {@link yearsOf} to enumerate keys in ascending order.
 */
export type YearKeyedSeries = Record<number, number>

export type JenisPerusahaan = 'tertutup' | 'terbuka'
export type ObjekPenilaian = 'saham' | 'bisnis'
export type JenisSubjekPajak = 'orang_pribadi' | 'badan'
export type JenisInformasiPeralihan = 'lembar_saham' | 'modal_disetor'

/** HOME sheet — master input dari user */
export interface HomeInputs {
  // Objek Pajak (perusahaan yang dinilai)
  namaPerusahaan: string
  npwp: string
  // Subjek Pajak (pihak yang mengalihkan saham)
  namaSubjekPajak: string
  npwpSubjekPajak: string
  jenisSubjekPajak: JenisSubjekPajak
  // Informasi perusahaan
  jenisPerusahaan: JenisPerusahaan
  objekPenilaian: ObjekPenilaian
  jenisInformasiPeralihan: JenisInformasiPeralihan
  // Data kuantitatif — field names generic (saham OR modal disetor)
  jumlahSahamBeredar: number
  jumlahSahamYangDinilai: number
  /** Par value per share (Rp). Default 1. Used in AAM paidUpCapitalDeduction. */
  nilaiNominalPerSaham: number
  tahunTransaksi: number
  /** Auto-computed summary from DLOM sheet */
  dlomPercent: number
  /** Auto-computed summary from DLOC(PFC) sheet */
  dlocPercent: number
}

/** Computed properties derived from HomeInputs */
export interface HomeDerived {
  proporsiSaham: number
  cutOffDate: Date
  akhirPeriodeProyeksiPertama: Date
}

/** A four-year series of numeric observations (historical financial data) */
export interface FourYearSeries {
  y0: number
  y1: number
  y2: number
  y3: number
}

/** Column labels for the 4 historical years */
export interface YearLabels {
  y0: number
  y1: number
  y2: number
  y3: number
}

/** Result of a vertical (common-size) analysis: each year's ratio of item to base */
export interface CommonSizeResult {
  y0: number
  y1: number
  y2: number
  y3: number
  avg: number
}

/** Result of a horizontal analysis (year-over-year change) */
export interface HorizontalResult {
  /** y0→y1 change (first year is baseline, has no change) */
  y1: number
  y2: number
  y3: number
  avg: number
}

/** Margin snapshot for a given year */
export interface MarginSet {
  gross: number
  operating: number
  net: number
}

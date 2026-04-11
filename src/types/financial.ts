/**
 * Financial type definitions for KKA Penilaian Saham.
 * Mirrors the data shape extracted from kka-penilaian-saham.xlsx.
 */

export type JenisPerusahaan = 'tertutup' | 'terbuka'
export type ObjekPenilaian = 'saham' | 'bisnis'

/** HOME sheet — master input dari user */
export interface HomeInputs {
  namaPerusahaan: string
  npwp: string
  jenisPerusahaan: JenisPerusahaan
  jumlahSahamBeredar: number
  jumlahSahamYangDinilai: number
  tahunTransaksi: number
  objekPenilaian: ObjekPenilaian
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

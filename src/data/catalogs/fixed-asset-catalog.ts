/**
 * Fixed Asset Account Catalog — single source of truth for:
 * 1. Dropdown options in the dynamic FA editor (sorted alphabetically)
 * 2. Backward-compatible excelRow mapping to Excel template
 * 3. Row mirroring across 7 sub-blocks (Acq Begin/Add/End, Dep Begin/Add/End, Net Value)
 *
 * excelRow ranges for the Beginning sub-block:
 *   8-13    : original Excel template rows (6 categories)
 *   100-119 : extended catalog accounts
 *   >= 1000 : user custom accounts ("Isi Manual")
 *
 * Other sub-blocks derive excelRow via multiplier offsets:
 *   Acq Additions : 2000 + base
 *   Acq Ending    : 3000 + base
 *   Dep Beginning : 4000 + base
 *   Dep Additions : 5000 + base
 *   Dep Ending    : 6000 + base
 *   Net Value     : 7000 + base
 */

export type FaSection = 'fixed_asset'

/** A pre-defined account in the catalog */
export interface FaCatalogAccount {
  /** Unique slug ID — immutable after creation */
  id: string
  /** English label */
  labelEn: string
  /** Indonesian label */
  labelId: string
  /** Always 'fixed_asset' */
  section: FaSection
  /** Row number in the Beginning sub-block */
  excelRow: number
}

/** A user-selected account stored in the Zustand store */
export interface FaAccountEntry {
  catalogId: string
  excelRow: number
  section: FaSection
  customLabel?: string
}

// ---------------------------------------------------------------------------
// Catalog data — 20 accounts aligned with PSAK 16 / IAS 16 (PPE)
// ---------------------------------------------------------------------------

/** Original 6 categories matching kka-penilaian-saham.xlsx rows 8-13 */
const ORIGINAL_ACCOUNTS: FaCatalogAccount[] = [
  { id: 'land', labelEn: 'Land', labelId: 'Tanah', section: 'fixed_asset', excelRow: 8 },
  { id: 'building', labelEn: 'Building', labelId: 'Bangunan', section: 'fixed_asset', excelRow: 9 },
  { id: 'equipment_lab_machinery', labelEn: 'Equipment, Laboratory & Machinery', labelId: 'Mesin & Peralatan', section: 'fixed_asset', excelRow: 10 },
  { id: 'vehicle_heavy_equipment', labelEn: 'Vehicle & Heavy Equipment', labelId: 'Kendaraan & Alat Berat', section: 'fixed_asset', excelRow: 11 },
  { id: 'office_inventory', labelEn: 'Office Inventory', labelId: 'Inventaris Kantor', section: 'fixed_asset', excelRow: 12 },
  { id: 'electrical_installation', labelEn: 'Electrical Installation', labelId: 'Instalasi Listrik', section: 'fixed_asset', excelRow: 13 },
]

/** Extended catalog accounts (excelRow 100-119) */
const EXTENDED_ACCOUNTS: FaCatalogAccount[] = [
  { id: 'computer_equipment', labelEn: 'Computer Equipment', labelId: 'Peralatan Komputer', section: 'fixed_asset', excelRow: 100 },
  { id: 'furniture_fixtures', labelEn: 'Furniture & Fixtures', labelId: 'Furnitur & Perlengkapan', section: 'fixed_asset', excelRow: 101 },
  { id: 'construction_in_progress', labelEn: 'Construction in Progress (CIP)', labelId: 'Konstruksi Dalam Pengerjaan', section: 'fixed_asset', excelRow: 102 },
  { id: 'communication_equipment', labelEn: 'Communication Equipment', labelId: 'Peralatan Komunikasi', section: 'fixed_asset', excelRow: 103 },
  { id: 'leasehold_improvements', labelEn: 'Leasehold Improvements', labelId: 'Perbaikan Aset Sewa', section: 'fixed_asset', excelRow: 104 },
  { id: 'tools_instruments', labelEn: 'Tools & Instruments', labelId: 'Peralatan & Instrumen', section: 'fixed_asset', excelRow: 105 },
  { id: 'laboratory_equipment', labelEn: 'Laboratory Equipment', labelId: 'Peralatan Laboratorium', section: 'fixed_asset', excelRow: 106 },
  { id: 'medical_equipment', labelEn: 'Medical Equipment', labelId: 'Peralatan Medis', section: 'fixed_asset', excelRow: 107 },
  { id: 'bearer_plants', labelEn: 'Bearer Plants', labelId: 'Tanaman Produktif', section: 'fixed_asset', excelRow: 108 },
  { id: 'mining_assets', labelEn: 'Mining Assets', labelId: 'Aset Pertambangan', section: 'fixed_asset', excelRow: 109 },
  { id: 'water_system', labelEn: 'Water Supply System', labelId: 'Instalasi Air', section: 'fixed_asset', excelRow: 110 },
  { id: 'road_bridge', labelEn: 'Road & Bridge', labelId: 'Jalan & Jembatan', section: 'fixed_asset', excelRow: 111 },
  { id: 'security_equipment', labelEn: 'Security Equipment', labelId: 'Peralatan Keamanan', section: 'fixed_asset', excelRow: 112 },
  { id: 'production_molds', labelEn: 'Production Molds & Dies', labelId: 'Cetakan & Alat Cetak', section: 'fixed_asset', excelRow: 113 },
]

/** Full sorted catalog */
export const FA_CATALOG: FaCatalogAccount[] = [
  ...ORIGINAL_ACCOUNTS,
  ...EXTENDED_ACCOUNTS,
].sort((a, b) => a.excelRow - b.excelRow)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Look up a catalog account by ID. Returns undefined for custom entries. */
export function getCatalogAccount(id: string): FaCatalogAccount | undefined {
  return FA_CATALOG.find((a) => a.id === id)
}

/** Generate next available excelRow for a custom account (>= 1000). */
export function generateCustomExcelRow(existingAccounts: readonly FaAccountEntry[]): number {
  const customRows = existingAccounts
    .filter((a) => a.excelRow >= 1000)
    .map((a) => a.excelRow)
  if (customRows.length === 0) return 1000
  return Math.max(...customRows) + 1
}

/** Get catalog accounts sorted alphabetically by active language. */
export function getCatalogBySection(language: 'en' | 'id'): FaCatalogAccount[] {
  return [...FA_CATALOG].sort((a, b) => {
    const la = language === 'en' ? a.labelEn : a.labelId
    const lb = language === 'en' ? b.labelEn : b.labelId
    return la.localeCompare(lb)
  })
}

/** Whether excelRow belongs to the original Excel template (rows 8-13). */
export function isOriginalExcelRow(excelRow: number): boolean {
  return excelRow >= 8 && excelRow <= 13
}

// ---------------------------------------------------------------------------
// Multiplier offset constants for row mirroring
// ---------------------------------------------------------------------------

export const FA_OFFSET = {
  ACQ_BEGINNING: 0,     // base excelRow
  ACQ_ADDITIONS: 2000,
  ACQ_ENDING: 3000,
  DEP_BEGINNING: 4000,
  DEP_ADDITIONS: 5000,
  DEP_ENDING: 6000,
  NET_VALUE: 7000,
} as const

/** Subtotal sentinel rows — not tied to any account */
export const FA_SUBTOTAL = {
  TOTAL_ACQ_BEGINNING: 14,
  TOTAL_ACQ_ADDITIONS: 23,
  TOTAL_ACQ_ENDING: 32,
  TOTAL_DEP_BEGINNING: 42,
  TOTAL_DEP_ADDITIONS: 51,
  TOTAL_DEP_ENDING: 60,
  TOTAL_NET_VALUE: 69,
} as const

/** All sentinel row numbers the editor pre-computes for downstream compat */
export const FA_SENTINEL_ROWS: readonly number[] = Object.values(FA_SUBTOTAL)

/**
 * Legacy row offsets for original accounts (excelRow 8-13).
 * The static FA manifest expects leaves at these positions; the dynamic
 * editor stores them at FA_OFFSET-based keys instead. Sentinel mapping
 * copies data from offset keys to legacy keys at persist time so that
 * downstream consumers (upstream-helpers, proy-fixed-assets, cash-flow,
 * fcf, export) find values where they expect them.
 *
 *   Dynamic key         → Legacy key
 *   base + 0    (8-13)  → 8-13   (unchanged — Beginning)
 *   base + 2000         → base + 9  (17-22 — Additions)
 *   base + 4000         → base + 28 (36-41 — Dep Beginning)
 *   base + 5000         → base + 37 (45-50 — Dep Additions)
 */
export const FA_LEGACY_OFFSET: Record<number, number> = {
  [FA_OFFSET.ACQ_ADDITIONS]: 9,   // 2000 → +9 (17 = 8 + 9)
  [FA_OFFSET.DEP_BEGINNING]: 28,  // 4000 → +28 (36 = 8 + 28)
  [FA_OFFSET.DEP_ADDITIONS]: 37,  // 5000 → +37 (45 = 8 + 37)
}

/** Check if an account base excelRow is an original Excel template row (8-13). */
export function isOriginalFaRow(excelRow: number): boolean {
  return excelRow >= 8 && excelRow <= 13
}

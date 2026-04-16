'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { HomeInputs } from '@/types'
import type { KepemilikanType } from '@/types/questionnaire'
import type {
  AccPayablesInputState,
  BalanceSheetInputState,
  IncomeStatementInputState,
  FixedAssetInputState,
} from '@/data/live/types'

/** WACC slice — comparable companies approach. */
export interface WaccComparableCompany {
  name: string
  betaLevered: number
  marketCap: number
  debt: number
}

export interface WaccState {
  marketParams: {
    equityRiskPremium: number
    ratingBasedDefaultSpread: number
    riskFree: number
  }
  comparableCompanies: WaccComparableCompany[]
  /** Tax rate for Hamada equation (may differ from IS effective rate). */
  taxRate: number
  bankRates: { name: string; rate: number }[]
  /** Manual WACC override ("Menurut Wajib Pajak"). Null = use computed. */
  waccOverride: number | null
}

/** Key Drivers slice — projection assumptions for PROY sheets. */
export interface KeyDriversState {
  financialDrivers: {
    interestRateShortTerm: number
    interestRateLongTerm: number
    bankDepositRate: number
    corporateTaxRate: number
  }
  operationalDrivers: {
    salesVolumeBase: number
    salesPriceBase: number
    /** Per-year increments starting from projection year 2 (index 0 = year 2). */
    salesVolumeIncrements: number[]
    salesPriceIncrements: number[]
    /** Stored POSITIVE — negate in compute adapters (LESSON-011). */
    cogsRatio: number
    sellingExpenseRatio: number
    gaExpenseRatio: number
  }
  bsDrivers: {
    accReceivableDays: number[]
    inventoryDays: number[]
    accPayableDays: number[]
  }
  additionalCapex: {
    land: number[]
    building: number[]
    equipment: number[]
    others: number[]
  }
}

/** Discount Rate (CAPM) slice — separate analysis from WACC. */
export interface DiscountRateState {
  taxRate: number
  riskFree: number
  beta: number
  equityRiskPremium: number
  countryDefaultSpread: number
  derIndustry: number
  bankRates: { name: string; rate: number }[]
}

/**
 * DLOM slice — selected option per factor + chosen kepemilikan.
 * `percentage` is the live computed result, mirrored to `home.dlomPercent`
 * for consumers that read from HOME (e.g. RESUME / final valuation).
 */
export interface DlomState {
  /** factor number → selected option label */
  answers: Record<number, string>
  kepemilikan: KepemilikanType
  /** Computed percentage, kept here so the store stays self-contained. */
  percentage: number
}

/**
 * DLOC (PFC) slice — same shape as DLOM, but `kepemilikan` is informational
 * only (not used in the percentage computation per Excel formula B22).
 * Kept in state because the form UI still surfaces it for user context.
 */
export interface DlocState {
  answers: Record<number, string>
  kepemilikan: KepemilikanType
  percentage: number
}

/**
 * Borrowing Cap CALK values — external data from Catatan Atas Laporan
 * Keuangan, not derivable from any other sheet. User-entered, default 0.
 */
export interface BorrowingCapInputState {
  piutangCalk: number
  persediaanCalk: number
}

interface KkaState {
  home: HomeInputs | null
  dlom: DlomState | null
  dloc: DlocState | null
  /** Phase 3 — live data slices. Null until user opens the corresponding input form. */
  balanceSheet: BalanceSheetInputState | null
  incomeStatement: IncomeStatementInputState | null
  fixedAsset: FixedAssetInputState | null
  accPayables: AccPayablesInputState | null
  /** Phase 3 valuation slices */
  wacc: WaccState | null
  discountRate: DiscountRateState | null
  /** Phase 3 projection drivers */
  keyDrivers: KeyDriversState | null
  /** Session 016 — Borrowing Cap CALK values for EEM tangible asset return. */
  borrowingCapInput: BorrowingCapInputState | null
  /** Session 021 — AAM per-row adjustments keyed by BS row number. */
  aamAdjustments: Record<number, number>
  /** Session 017 — SIMULASI POTENSI reported share transfer value (user input). Default 0. */
  nilaiPengalihanDilaporkan: number
  setHome: (home: HomeInputs) => void
  resetHome: () => void
  /**
   * Persist a new DLOM state and mirror its percentage into `home.dlomPercent`
   * so downstream consumers (RESUME, final valuation) read a single source of
   * truth without subscribing to the DLOM slice directly.
   */
  setDlom: (dlom: DlomState) => void
  /** Same shape as setDlom but for DLOC, mirroring to `home.dlocPercent`. */
  setDloc: (dloc: DlocState) => void
  /** Phase 3 — persist user-entered historical data. */
  setBalanceSheet: (bs: BalanceSheetInputState) => void
  setIncomeStatement: (is: IncomeStatementInputState) => void
  setFixedAsset: (fa: FixedAssetInputState) => void
  setAccPayables: (ap: AccPayablesInputState) => void
  setWacc: (wacc: WaccState) => void
  setDiscountRate: (dr: DiscountRateState) => void
  setBorrowingCapInput: (bc: BorrowingCapInputState) => void
  setKeyDrivers: (kd: KeyDriversState) => void
  resetBalanceSheet: () => void
  resetIncomeStatement: () => void
  resetFixedAsset: () => void
  resetAccPayables: () => void
  resetWacc: () => void
  resetDiscountRate: () => void
  resetKeyDrivers: () => void
  resetBorrowingCapInput: () => void
  setAamAdjustments: (adj: Record<number, number>) => void
  /** Toggle global language (EN/ID) — updates balanceSheet, incomeStatement, fixedAsset language. */
  setGlobalLanguage: (lang: 'en' | 'id') => void
  setNilaiPengalihanDilaporkan: (v: number) => void
  /** Reset ALL store slices to initial state (destructive — clears all user data). */
  resetAll: () => void
  _hasHydrated: boolean
  _setHasHydrated: (hydrated: boolean) => void
}

const STORE_KEY = 'kka-penilaian-saham'
const STORE_VERSION = 14

/**
 * Migrate persisted state from older versions to the current schema.
 *
 * Chain is intentional: a v1 payload walks v1 → v2 → v3 in sequence so
 * every session-boundary change is applied in order without branches.
 *
 *   v1 → v2: Session 008 added `dlom` / `dloc` slices
 *   v2 → v3: Session 010 added `balanceSheet` / `incomeStatement` / `fixedAsset`
 *   v3 → v4: Session 012 added `accPayables`
 *   v4 → v5: Session 013 added `wacc` / `discountRate`
 *   v5 → v6: Session 014 added `keyDrivers`
 *   v6 → v7: Session 016 added `borrowingCapInput`
 *   v7 → v8: Session 017 added `nilaiNominalPerSaham` (in home),
 *             `faAdjustment`, `nilaiPengalihanDilaporkan`
 *   v8 → v9: Session 019 added subjek pajak fields + jenisInformasiPeralihan
 *             to HomeInputs + `resetAll` action
 *   v9 → v10: Session 020 extended BalanceSheetInputState with accounts,
 *              yearCount, language for dynamic BS rows
 *   v10 → v11: Session 019-revisi-kedua removed fixed_assets from BS accounts
 *              (FA section now cross-referenced from Fixed Asset store)
 *   v11 → v12: Session 019-fa-dynamic extended FixedAssetInputState with
 *              accounts, yearCount, language for dynamic FA catalog rows
 *   v12 → v13: Session 019-is-dynamic extended IncomeStatementInputState with
 *              accounts, yearCount, language; migrates leaf data from original
 *              rows (6,7,12,13,26,27,30) to extended catalog rows + sentinel
 *
 * Without this function, Zustand persist discards the entire older payload
 * and the user silently loses their HOME (and now DLOM/DLOC) data on the
 * first deploy of the newer schema. See LESSON-028 for context.
 *
 * Exported as a named function so it can be unit-tested in isolation —
 * Zustand persist middleware does not expose a synchronous test path.
 */
export function migratePersistedState(
  persistedState: unknown,
  fromVersion: number,
): unknown {
  if (persistedState === null || typeof persistedState !== 'object') {
    return persistedState
  }

  let state = persistedState as Record<string, unknown>

  if (fromVersion < 2) {
    state = {
      home: state.home ?? null,
      dlom: null,
      dloc: null,
    }
  }

  if (fromVersion < 3) {
    state = {
      ...state,
      balanceSheet: null,
      incomeStatement: null,
      fixedAsset: null,
    }
  }

  if (fromVersion < 4) {
    state = {
      ...state,
      accPayables: null,
    }
  }

  if (fromVersion < 5) {
    state = {
      ...state,
      wacc: null,
      discountRate: null,
    }
  }

  if (fromVersion < 6) {
    state = {
      ...state,
      keyDrivers: null,
    }
  }

  if (fromVersion < 7) {
    state = {
      ...state,
      borrowingCapInput: null,
    }
  }

  if (fromVersion < 8) {
    // Add nilaiNominalPerSaham to existing home (default Rp 1)
    if (state.home && typeof state.home === 'object') {
      const home = state.home as Record<string, unknown>
      if (!('nilaiNominalPerSaham' in home)) {
        state = { ...state, home: { ...home, nilaiNominalPerSaham: 1 } }
      }
    }
    state = {
      ...state,
      aamAdjustments: state.aamAdjustments ?? (state.faAdjustment ? { 22: state.faAdjustment } : {}),
      nilaiPengalihanDilaporkan: state.nilaiPengalihanDilaporkan ?? 0,
    }
  }

  if (fromVersion < 9) {
    // Add subjek pajak + jenis informasi peralihan fields to home
    if (state.home && typeof state.home === 'object') {
      const home = state.home as Record<string, unknown>
      state = {
        ...state,
        home: {
          ...home,
          namaSubjekPajak: home.namaSubjekPajak ?? '',
          npwpSubjekPajak: home.npwpSubjekPajak ?? '',
          jenisSubjekPajak: home.jenisSubjekPajak ?? 'orang_pribadi',
          jenisInformasiPeralihan: home.jenisInformasiPeralihan ?? 'lembar_saham',
        },
      }
    }
  }

  if (fromVersion < 10) {
    // Extend BalanceSheetInputState with accounts, yearCount, language
    if (state.balanceSheet && typeof state.balanceSheet === 'object') {
      const bs = state.balanceSheet as Record<string, unknown>
      state = {
        ...state,
        balanceSheet: {
          accounts: bs.accounts ?? [],
          yearCount: bs.yearCount ?? 1,
          language: bs.language ?? 'en',
          rows: bs.rows ?? {},
        },
      }
    }
  }

  if (fromVersion < 11) {
    // Remove fixed_assets accounts from BS — FA section is now cross-referenced
    if (state.balanceSheet && typeof state.balanceSheet === 'object') {
      const bs = state.balanceSheet as Record<string, unknown>
      const accounts = Array.isArray(bs.accounts) ? bs.accounts : []
      const rows = (bs.rows && typeof bs.rows === 'object' ? bs.rows : {}) as Record<string, unknown>
      // Filter out fixed_assets accounts
      const filteredAccounts = accounts.filter(
        (a: unknown) => typeof a === 'object' && a !== null && (a as Record<string, unknown>).section !== 'fixed_assets',
      )
      // Remove FA-related rows (excelRow 20, 21, and extended 120-139)
      const cleanedRows: Record<string, unknown> = {}
      for (const [key, val] of Object.entries(rows)) {
        const rowNum = Number(key)
        if (rowNum === 20 || rowNum === 21 || (rowNum >= 120 && rowNum <= 139)) continue
        cleanedRows[key] = val
      }
      state = {
        ...state,
        balanceSheet: { ...bs, accounts: filteredAccounts, rows: cleanedRows },
      }
    }
  }

  if (fromVersion < 12) {
    // Extend FixedAssetInputState with accounts, yearCount, language
    // Default accounts: the 6 original categories (backward-compatible)
    if (state.fixedAsset && typeof state.fixedAsset === 'object') {
      const fa = state.fixedAsset as Record<string, unknown>
      if (!('accounts' in fa)) {
        const DEFAULT_FA_ACCOUNTS = [
          { catalogId: 'land', excelRow: 8, section: 'fixed_asset' as const },
          { catalogId: 'building', excelRow: 9, section: 'fixed_asset' as const },
          { catalogId: 'equipment_lab_machinery', excelRow: 10, section: 'fixed_asset' as const },
          { catalogId: 'vehicle_heavy_equipment', excelRow: 11, section: 'fixed_asset' as const },
          { catalogId: 'office_inventory', excelRow: 12, section: 'fixed_asset' as const },
          { catalogId: 'electrical_installation', excelRow: 13, section: 'fixed_asset' as const },
        ]
        state = {
          ...state,
          fixedAsset: {
            accounts: DEFAULT_FA_ACCOUNTS,
            yearCount: 3,
            language: 'id',
            rows: fa.rows ?? {},
          },
        }
      }
    }
  }

  if (fromVersion < 13) {
    // Extend IncomeStatementInputState with accounts, yearCount, language.
    // Migrate leaf data from original rows → extended catalog rows + sentinels.
    if (state.incomeStatement && typeof state.incomeStatement === 'object') {
      const is = state.incomeStatement as Record<string, unknown>
      if (!('accounts' in is)) {
        const oldRows = (is.rows && typeof is.rows === 'object')
          ? is.rows as Record<string, Record<string, number>>
          : {}

        // Map original leaf rows to new catalog positions
        const ROW_MAP: Record<string, number> = {
          '6': 100, '7': 200, '12': 300, '13': 301,
          '26': 500, '27': 501, '30': 400,
        }

        const newRows: Record<string, unknown> = {}

        // Move leaf data to extended positions + keep at original as sentinel
        for (const [oldRow, newRow] of Object.entries(ROW_MAP)) {
          if (oldRows[oldRow]) {
            newRows[String(newRow)] = oldRows[oldRow]  // extended leaf
            newRows[oldRow] = oldRows[oldRow]           // sentinel (same value for single account)
          }
        }

        // Fixed leaves stay at their positions (Depreciation 21, Tax 33)
        if (oldRows['21']) newRows['21'] = oldRows['21']
        if (oldRows['33']) newRows['33'] = oldRows['33']

        // Compute and store OpEx sentinel (row 15 = sum of 12 + 13)
        const r12 = (oldRows['12'] || {}) as Record<string, number>
        const r13 = (oldRows['13'] || {}) as Record<string, number>
        const allYears = new Set([...Object.keys(r12), ...Object.keys(r13)])
        if (allYears.size > 0) {
          const opexTotal: Record<string, number> = {}
          for (const yr of allYears) {
            opexTotal[yr] = (r12[yr] ?? 0) + (r13[yr] ?? 0)
          }
          newRows['15'] = opexTotal
        }

        // Compute higher-level sentinels for downstream compat
        // GP (8) = Rev(6) - COGS(7)
        // EBITDA (18) = GP(8) - OpEx(15)
        // EBIT (22) = EBITDA(18) - Dep(21)
        // NI (28) = II(26) - IE(27)
        // PBT (32) = EBIT(22) + NI(28) + NonOp(30)
        // NP (35) = PBT(32) - Tax(33)
        const yearSet = new Set<string>()
        for (const v of Object.values(oldRows)) {
          if (v && typeof v === 'object') {
            for (const k of Object.keys(v)) yearSet.add(k)
          }
        }
        const read = (row: string, yr: string): number => {
          const src = (newRows[row] ?? oldRows[row]) as Record<string, number> | undefined
          return src?.[yr] ?? 0
        }
        const makeRow = (compute: (yr: string) => number): Record<string, number> => {
          const out: Record<string, number> = {}
          for (const yr of yearSet) out[yr] = compute(yr)
          return out
        }
        if (yearSet.size > 0) {
          newRows['8'] = makeRow((yr) => read('6', yr) - read('7', yr))
          newRows['18'] = makeRow((yr) => {
            const gp = (newRows['8'] as Record<string, number>)?.[yr] ?? 0
            const opex = (newRows['15'] as Record<string, number>)?.[yr] ?? 0
            return gp - opex
          })
          newRows['22'] = makeRow((yr) => {
            const ebitda = (newRows['18'] as Record<string, number>)?.[yr] ?? 0
            return ebitda - read('21', yr)
          })
          newRows['28'] = makeRow((yr) => read('26', yr) - read('27', yr))
          newRows['32'] = makeRow((yr) => {
            const ebit = (newRows['22'] as Record<string, number>)?.[yr] ?? 0
            const ni = (newRows['28'] as Record<string, number>)?.[yr] ?? 0
            return ebit + ni + read('30', yr)
          })
          newRows['35'] = makeRow((yr) => {
            const pbt = (newRows['32'] as Record<string, number>)?.[yr] ?? 0
            return pbt - read('33', yr)
          })
        }

        const DEFAULT_IS_ACCOUNTS = [
          { catalogId: 'revenue', excelRow: 100, section: 'revenue' as const },
          { catalogId: 'cogs', excelRow: 200, section: 'cost' as const },
          { catalogId: 'other_opex', excelRow: 300, section: 'operating_expense' as const },
          { catalogId: 'general_admin', excelRow: 301, section: 'operating_expense' as const },
          { catalogId: 'interest_income', excelRow: 500, section: 'net_interest' as const, interestType: 'income' as const },
          { catalogId: 'interest_expense', excelRow: 501, section: 'net_interest' as const, interestType: 'expense' as const },
          { catalogId: 'other_non_operating', excelRow: 400, section: 'non_operating' as const },
        ]

        state = {
          ...state,
          incomeStatement: {
            accounts: DEFAULT_IS_ACCOUNTS,
            yearCount: 4,
            language: 'id',
            rows: newRows,
          },
        }
      }
    }
  }

  // v13→v14: Replace faAdjustment (scalar) with aamAdjustments (per-row map)
  if (fromVersion < 14) {
    const fa = (state as Record<string, unknown>).faAdjustment
    const adj: Record<number, number> = {}
    if (typeof fa === 'number' && fa !== 0) adj[22] = fa
    state = { ...state, aamAdjustments: adj }
    delete (state as Record<string, unknown>).faAdjustment
  }

  return state
}

export const useKkaStore = create<KkaState>()(
  persist(
    (set) => ({
      home: null,
      dlom: null,
      dloc: null,
      balanceSheet: null,
      incomeStatement: null,
      fixedAsset: null,
      accPayables: null,
      wacc: null,
      discountRate: null,
      keyDrivers: null,
      borrowingCapInput: null,
      aamAdjustments: {},
      nilaiPengalihanDilaporkan: 0,
      setHome: (home) => set({ home }),
      resetHome: () => set({ home: null }),
      setDlom: (dlom) =>
        set((state) => ({
          dlom,
          home: state.home ? { ...state.home, dlomPercent: dlom.percentage } : state.home,
        })),
      setDloc: (dloc) =>
        set((state) => ({
          dloc,
          home: state.home ? { ...state.home, dlocPercent: dloc.percentage } : state.home,
        })),
      setBalanceSheet: (balanceSheet) => set({ balanceSheet }),
      setIncomeStatement: (incomeStatement) => set({ incomeStatement }),
      setFixedAsset: (fixedAsset) => set({ fixedAsset }),
      setAccPayables: (accPayables) => set({ accPayables }),
      setWacc: (wacc) => set({ wacc }),
      setDiscountRate: (discountRate) => set({ discountRate }),
      setBorrowingCapInput: (borrowingCapInput) => set({ borrowingCapInput }),
      setKeyDrivers: (keyDrivers) => set({ keyDrivers }),
      resetBalanceSheet: () => set({ balanceSheet: null }),
      resetIncomeStatement: () => set({ incomeStatement: null }),
      resetFixedAsset: () => set({ fixedAsset: null }),
      resetAccPayables: () => set({ accPayables: null }),
      resetWacc: () => set({ wacc: null }),
      resetDiscountRate: () => set({ discountRate: null }),
      resetKeyDrivers: () => set({ keyDrivers: null }),
      resetBorrowingCapInput: () => set({ borrowingCapInput: null }),
      setAamAdjustments: (adj) => set({ aamAdjustments: adj }),
      setGlobalLanguage: (lang) =>
        set((state) => ({
          balanceSheet: state.balanceSheet ? { ...state.balanceSheet, language: lang } : state.balanceSheet,
          incomeStatement: state.incomeStatement ? { ...state.incomeStatement, language: lang } : state.incomeStatement,
          fixedAsset: state.fixedAsset ? { ...state.fixedAsset, language: lang } : state.fixedAsset,
        })),
      setNilaiPengalihanDilaporkan: (v) => set({ nilaiPengalihanDilaporkan: v }),
      resetAll: () => set({
        home: null,
        dlom: null,
        dloc: null,
        balanceSheet: null,
        incomeStatement: null,
        fixedAsset: null,
        accPayables: null,
        wacc: null,
        discountRate: null,
        keyDrivers: null,
        borrowingCapInput: null,
        aamAdjustments: {},
        nilaiPengalihanDilaporkan: 0,
      }),
      _hasHydrated: false,
      _setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }),
    }),
    {
      name: STORE_KEY,
      version: STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        home: state.home,
        dlom: state.dlom,
        dloc: state.dloc,
        balanceSheet: state.balanceSheet,
        incomeStatement: state.incomeStatement,
        fixedAsset: state.fixedAsset,
        accPayables: state.accPayables,
        wacc: state.wacc,
        discountRate: state.discountRate,
        keyDrivers: state.keyDrivers,
        borrowingCapInput: state.borrowingCapInput,
        aamAdjustments: state.aamAdjustments,
        nilaiPengalihanDilaporkan: state.nilaiPengalihanDilaporkan,
      }),
      migrate: migratePersistedState,
      onRehydrateStorage: () => (state) => {
        state?._setHasHydrated(true)
      },
    }
  )
)

/**
 * HomeInputs derived helpers — pure functions, no store access.
 */
export function computeProporsiSaham(home: Pick<HomeInputs, 'jumlahSahamBeredar' | 'jumlahSahamYangDinilai'>): number {
  if (home.jumlahSahamBeredar <= 0) return 0
  return home.jumlahSahamYangDinilai / home.jumlahSahamBeredar
}

export function computeCutOffDate(home: Pick<HomeInputs, 'tahunTransaksi'>): Date {
  return new Date(Date.UTC(home.tahunTransaksi - 1, 11, 31))
}

export function computeAkhirPeriodeProyeksiPertama(home: Pick<HomeInputs, 'tahunTransaksi'>): Date {
  return new Date(Date.UTC(home.tahunTransaksi, 11, 31))
}

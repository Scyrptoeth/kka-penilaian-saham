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
  _hasHydrated: boolean
  _setHasHydrated: (hydrated: boolean) => void
}

const STORE_KEY = 'kka-penilaian-saham'
const STORE_VERSION = 7

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

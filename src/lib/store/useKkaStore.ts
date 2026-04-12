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

interface KkaState {
  home: HomeInputs | null
  dlom: DlomState | null
  dloc: DlocState | null
  /** Phase 3 — live data slices. Null until user opens the corresponding input form. */
  balanceSheet: BalanceSheetInputState | null
  incomeStatement: IncomeStatementInputState | null
  fixedAsset: FixedAssetInputState | null
  accPayables: AccPayablesInputState | null
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
  resetBalanceSheet: () => void
  resetIncomeStatement: () => void
  resetFixedAsset: () => void
  resetAccPayables: () => void
  _hasHydrated: boolean
  _setHasHydrated: (hydrated: boolean) => void
}

const STORE_KEY = 'kka-penilaian-saham'
const STORE_VERSION = 4

/**
 * Migrate persisted state from older versions to the current schema.
 *
 * Chain is intentional: a v1 payload walks v1 → v2 → v3 in sequence so
 * every session-boundary change is applied in order without branches.
 *
 *   v1 → v2: Session 008 added `dlom` / `dloc` slices
 *   v2 → v3: Session 010 added `balanceSheet` / `incomeStatement` / `fixedAsset`
 *   v3 → v4: Session 012 added `accPayables`
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
      resetBalanceSheet: () => set({ balanceSheet: null }),
      resetIncomeStatement: () => set({ incomeStatement: null }),
      resetFixedAsset: () => set({ fixedAsset: null }),
      resetAccPayables: () => set({ accPayables: null }),
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

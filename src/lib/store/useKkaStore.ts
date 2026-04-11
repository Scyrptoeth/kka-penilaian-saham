'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { HomeInputs } from '@/types'
import type { KepemilikanType } from '@/types/questionnaire'

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
  _hasHydrated: boolean
  _setHasHydrated: (hydrated: boolean) => void
}

const STORE_KEY = 'kka-penilaian-saham:v2'

export const useKkaStore = create<KkaState>()(
  persist(
    (set) => ({
      home: null,
      dlom: null,
      dloc: null,
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
      _hasHydrated: false,
      _setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }),
    }),
    {
      name: STORE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        home: state.home,
        dlom: state.dlom,
        dloc: state.dloc,
      }),
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

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
  /**
   * Session 036: replaces old 4-row `additionalCapex`. Keyed by FA
   * excelRow (see `fixedAsset.accounts[].excelRow`). Value = YearKeyedSeries
   * across projection years.
   */
  additionalCapexByAccount: Record<number, import('@/types/financial').YearKeyedSeries>
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

/**
 * Session 054 — Growth Revenue industry benchmark slice.
 *
 * The Growth Revenue page shows Revenue + NPAT historical (derived from IS)
 * alongside "Industri" benchmark rows (excelRow 40 + 41) that users enter
 * manually as comparison data. These two fields are the user-input layer.
 * Derived rows 8 + 9 stay read-only.
 *
 * `null` at the top level = user has not yet visited the editor. Empty
 * series `{}` after visit = visited but all cleared.
 */
export interface GrowthRevenueState {
  /** Industry Sales (manifest row 40). Year → value. */
  industryRevenue: import('@/types/financial').YearKeyedSeries
  /** Industry Net Profit (manifest row 41). Year → value. */
  industryNetProfit: import('@/types/financial').YearKeyedSeries
}

/**
 * Session 055 — Invested Capital scope reference.
 *
 * `source` distinguishes BS-level account (aggregate via cross-ref for PPE)
 * from FA-level per-item account (fine-grained). `excelRow` is the account's
 * canonical excelRow in its source slice.
 */
export interface SourceRef {
  source: 'bs' | 'fa'
  excelRow: number
}

/**
 * Session 055 — Invested Capital user-curated scope for the 3 ROIC "Less"
 * rows. Each row is a list of SourceRef; a single account (by source+excelRow)
 * can only appear in ONE of the 3 rows at a time (cross-row mutual exclusion
 * enforced by setters). Null = user has not yet confirmed → ROIC + Growth Rate
 * gated via PageEmptyState.
 */
export interface InvestedCapitalState {
  otherNonOperatingAssets: SourceRef[]
  excessCash: SourceRef[]
  marketableSecurities: SourceRef[]
}

/**
 * Session 055 — Cash Balance scope. User picks ONE set of BS current_assets
 * accounts representing cash holdings. System derives CFS Cash Ending[Y] =
 * sum @ year Y and Cash Beginning[Y] = sum @ year Y-1 (shift). For the first
 * historical year Y0, Beginning defaults to `preHistoryBeginning ?? 0`
 * (optional user entry for pre-period balance).
 */
export interface CashBalanceState {
  accounts: number[]
  preHistoryBeginning?: number
}

/**
 * Session 055 — Cash Account split. `bank` + `cashOnHand` are disjoint subsets
 * of BS current_assets (cross-list mutual exclusion enforced by setters).
 * These feed CFS rows 35/36 (Cash Ending in Bank / Cash on Hand).
 */
export interface CashAccountState {
  bank: number[]
  cashOnHand: number[]
}

/**
 * Session 056 — Financing scope. 5 disjoint lists of IS excelRows that the
 * user curates via `/input/financing`. Each list feeds a specific CFS row:
 *
 *   equityInjection       → CFS row 27 (Capital Contributed by Shareholders)
 *   newLoan               → CFS row 28 (New Bank Loan)
 *   interestPayment       → CFS row 29 (Interest Paid to Bank)
 *   interestIncome        → CFS row 30 (Interest Received from Bank)
 *   principalRepayment    → CFS row 31 (Bank Loan Principal Repayment)
 *
 * Cross-row mutual exclusion is enforced by the setters: a single IS
 * excelRow can only appear in ONE of the 5 lists at a time. `null` at
 * the top level = user has not yet confirmed scope; the CFS page
 * surfaces PageEmptyState until the user visits `/input/financing`
 * and clicks "Konfirmasi Cakupan".
 */
export interface FinancingState {
  equityInjection: number[]
  newLoan: number[]
  interestPayment: number[]
  interestIncome: number[]
  principalRepayment: number[]
}

interface KkaState {
  /** Global language preference — EN (default) or ID. Lifted to root level in v15. */
  language: 'en' | 'id'
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
  /**
   * Session 041 Task 5 (was Session 038) — Interest Bearing Debt scope.
   *
   * The legacy `number | null` shape required users to type the IBD total
   * manually, which scaled badly with dynamic catalogs and risked
   * double-counting against AAM per-row adjustments. The new shape mirrors
   * the Working Capital scope page: list every Liabilities account from BS
   * (Current + Non-Current) read-only, with a trash icon to mark accounts
   * that are NOT IBD (e.g. Accounts Payable, Accrued Expenses, Tax
   * Liabilities). The numeric IBD total is then derived from BS data via
   * `computeInterestBearingDebt(state)`.
   *
   * `null` = user has not yet confirmed scope → AAM / DCF / EEM / CFI /
   * Simulasi / Dashboard show PageEmptyState until user visits
   * `/input/interest-bearing-debt` and clicks "Confirm Scope" (which
   * transitions null → empty-exclusion object).
   */
  interestBearingDebt: {
    excludedCurrentLiabilities: number[]
    excludedNonCurrentLiabilities: number[]
  } | null
  /**
   * Session 039 — Working Capital scope control. `excludedCurrentAssets` and
   * `excludedCurrentLiabilities` hold BS excelRow numbers that the user has
   * marked as "not part of Operating Working Capital" (e.g. Cash, short-term
   * investments, IBD). `null` = user has not yet confirmed scope → consumer
   * pages (CFS / FCF / FR / DCF / EEM / CFI / Simulasi / Dashboard / Proy CFS)
   * show PageEmptyState until user visits `/input/changes-in-working-capital`
   * and clicks "Konfirmasi Cakupan" (sets an empty-exclusion object).
   *
   * The live CFS compute (`computeCashFlowLiveRows`) now iterates
   * `balanceSheet.accounts` filtered by `section` and skips accounts whose
   * excelRow appears in the relevant exclusion list — replaces the legacy
   * hardcoded `BS_CA_ROWS=[10,11,12,14]` / `BS_CL_ROWS=[31,32,33,34]` that
   * missed dynamic catalog + custom-manual accounts (user-reported bug
   * resolved 2026-04-18).
   */
  changesInWorkingCapital: {
    excludedCurrentAssets: number[]
    excludedCurrentLiabilities: number[]
  } | null
  /**
   * Session 054 — Growth Revenue industry benchmark rows. Populated via
   * `/input/growth-revenue` editor. `null` until user first visits + saves.
   */
  growthRevenue: GrowthRevenueState | null
  /**
   * Session 055 — Invested Capital scope (ROIC). Null until user confirms at
   * `/input/invested-capital`. ROIC + Growth Rate pages are gated on this.
   */
  investedCapital: InvestedCapitalState | null
  /**
   * Session 055 — Cash Balance scope (CFS Cash rows). Null until user confirms
   * at `/input/cash-balance`. CFS page is gated on this.
   */
  cashBalance: CashBalanceState | null
  /**
   * Session 055 — Cash Account split (CFS Bank / On Hand). Null until user
   * confirms at `/input/cash-account`. CFS page is gated on this.
   */
  cashAccount: CashAccountState | null
  /**
   * Session 056 — Financing scope (CFS financing section — rows 27-31).
   * Null until user confirms at `/input/financing`. CFS page is gated on this.
   */
  financing: FinancingState | null
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
  /**
   * Session 051 — set/clear an equity projection override at a single
   * (excelRow, year) cell. Pass `value = null` to clear (cell reverts to
   * historical default). Per-cell independent: editing 2022 does not touch
   * 2023 or 2024 entries for the same row.
   */
  setEquityProjectionOverride: (excelRow: number, year: number, value: number | null) => void
  resetBalanceSheet: () => void
  resetIncomeStatement: () => void
  resetFixedAsset: () => void
  resetAccPayables: () => void
  resetWacc: () => void
  resetDiscountRate: () => void
  resetKeyDrivers: () => void
  resetBorrowingCapInput: () => void
  setAamAdjustments: (adj: Record<number, number>) => void
  /** Toggle global language (EN/ID) — updates root + balanceSheet, incomeStatement, fixedAsset language. */
  setGlobalLanguage: (lang: 'en' | 'id') => void
  setNilaiPengalihanDilaporkan: (v: number) => void
  /**
   * Session 041 Task 5 — IBD scope setters. Each operates idempotently on
   * the current exclusion list. `confirmIbdScope` is the explicit null → object
   * transition that unlocks the 6 consumer pages
   * (AAM / DCF / EEM / CFI / Simulasi / Dashboard).
   */
  toggleExcludeCurrentLiabIbd: (excelRow: number) => void
  toggleExcludeNonCurrentLiabIbd: (excelRow: number) => void
  confirmIbdScope: () => void
  resetIbdScope: () => void
  /**
   * Session 039 — WC scope setters. Each operates idempotently on the current
   * exclusion list; `confirmWcScope` is the explicit null → object transition
   * that unlocks the 9 consumer pages.
   */
  toggleExcludeCurrentAsset: (excelRow: number) => void
  toggleExcludeCurrentLiability: (excelRow: number) => void
  confirmWcScope: () => void
  resetWcScope: () => void
  /** Session 054 — bulk set/clear growthRevenue. Passing `null` clears it (equivalent to resetGrowthRevenue). */
  setGrowthRevenue: (gr: GrowthRevenueState | null) => void
  resetGrowthRevenue: () => void
  /**
   * Session 055 — Invested Capital scope setters. `assignInvestedCapital` sets
   * an account into one of 3 rows (removes from other rows — mutual exclusion).
   * `removeInvestedCapital` un-assigns. `confirmInvestedCapitalScope` null →
   * empty object to unlock ROIC + Growth Rate. `resetInvestedCapitalScope` →
   * null (re-gates).
   */
  assignInvestedCapital: (
    row: keyof InvestedCapitalState,
    ref: SourceRef,
  ) => void
  removeInvestedCapital: (row: keyof InvestedCapitalState, ref: SourceRef) => void
  confirmInvestedCapitalScope: () => void
  resetInvestedCapitalScope: () => void
  /** Session 055 — Cash Balance scope setters. */
  toggleCashBalanceAccount: (excelRow: number) => void
  setCashBalancePreHistoryBeginning: (value: number | null) => void
  confirmCashBalanceScope: () => void
  resetCashBalanceScope: () => void
  /**
   * Session 055 — Cash Account scope setters. `assignCashAccount` adds account
   * to bank or cashOnHand (removes from the other list — mutual exclusion).
   */
  assignCashAccount: (row: 'bank' | 'cashOnHand', excelRow: number) => void
  removeCashAccount: (row: 'bank' | 'cashOnHand', excelRow: number) => void
  confirmCashAccountScope: () => void
  resetCashAccountScope: () => void
  /**
   * Session 056 — Financing scope setters. `assignFinancing` sets an IS
   * excelRow into one of 5 rows (removes from other rows — mutual exclusion).
   * `removeFinancing` un-assigns. `confirmFinancingScope` null → empty object
   * to unlock CFS. `resetFinancingScope` → null (re-gates).
   */
  assignFinancing: (row: keyof FinancingState, excelRow: number) => void
  removeFinancing: (row: keyof FinancingState, excelRow: number) => void
  confirmFinancingScope: () => void
  resetFinancingScope: () => void
  /** Reset ALL store slices to initial state (destructive — clears all user data). */
  resetAll: () => void
  _hasHydrated: boolean
  _setHasHydrated: (hydrated: boolean) => void
}

const STORE_KEY = 'kka-penilaian-saham'
const STORE_VERSION = 24

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

  // v14→v15: Lift language to root level for global i18n toggle
  if (fromVersion < 15) {
    const bs = state.balanceSheet as Record<string, unknown> | null
    state = {
      ...state,
      language: (bs?.language as string) ?? 'en',
    }
  }

  // v15→v16: Replace hardcoded additionalCapex (4 categories) with dynamic
  // additionalCapexByAccount (keyed by FA excelRow). Old data dropped —
  // no lossless mapping to FA catalog accounts.
  if (fromVersion < 16) {
    const kd = (state as Record<string, unknown>).keyDrivers as
      | Record<string, unknown>
      | null
      | undefined
    if (kd && typeof kd === 'object') {
      const { additionalCapex: _discarded, ...restKd } = kd
      void _discarded
      state = {
        ...state,
        keyDrivers: {
          ...restKd,
          additionalCapexByAccount: {},
        } as unknown as KkaState['keyDrivers'],
      }
    }
  }

  // v16→v17: Session 038 — add root-level `interestBearingDebt: number | null`.
  // IBD promoted to a dedicated valuation input page (required before AAM/DCF/EEM
  // become actionable). null sentinel = user has not filled — pages gate on it.
  // Idempotent: if the field already exists, leave it alone.
  if (fromVersion < 17) {
    const current = (state as Record<string, unknown>).interestBearingDebt
    if (current === undefined) {
      state = { ...state, interestBearingDebt: null }
    }
  }

  // v17→v18: Session 039 — add root-level `changesInWorkingCapital` slice.
  // Required input gate: user must visit /input/changes-in-working-capital
  // and click "Konfirmasi Cakupan" to transition null → empty-exclusion object
  // before CFS/FCF/FR/DCF/EEM/CFI/Simulasi/Dashboard/Proy CFS unlock.
  // Idempotent: if the field already exists, leave it alone.
  if (fromVersion < 18) {
    const current = (state as Record<string, unknown>).changesInWorkingCapital
    if (current === undefined) {
      state = { ...state, changesInWorkingCapital: null }
    }
  }

  // v18→v19: Session 041 — three coordinated schema changes:
  //
  //   Task 1: IS row 21 (Depreciation) is no longer user-editable. It now
  //           mirrors FA row 51 (TOTAL_DEP_ADDITIONS, negated) at persist
  //           time. Strip any pre-existing manually-entered Depreciation
  //           values so the new FA-driven source wins on next render.
  //
  //   Task 3: IS section `net_interest` is split into `interest_income` and
  //           `interest_expense`. Existing accounts are relocated to the new
  //           sections via the legacy `interestType` discriminator (catalog
  //           confidently knows the type for every PSAK-default account; for
  //           custom accounts the user previously chose a default of 'expense'
  //           per DynamicIsEditor.handleAddCustom). The `interestType` field
  //           is then dropped from the entry.
  //
  //   Task 5: `interestBearingDebt` shape changes from `number | null` to
  //           `{excludedCurrentLiabilities: number[], excludedNonCurrentLiabilities: number[]} | null`.
  //           No lossless mapping from the legacy numeric value to an
  //           exclusion list exists, so existing numeric values are dropped
  //           (set null) — user re-confirms via the redesigned page.
  if (fromVersion < 19) {
    // — Task 1: clear IS row 21 (Depreciation) leaf data so FA wins —
    if (state.incomeStatement && typeof state.incomeStatement === 'object') {
      const is = state.incomeStatement as Record<string, unknown>
      if (is.rows && typeof is.rows === 'object') {
        const rows = { ...(is.rows as Record<string, unknown>) }
        delete rows['21']
        state = { ...state, incomeStatement: { ...is, rows } }
      }
    }

    // — Task 3: relocate net_interest accounts via interestType —
    if (state.incomeStatement && typeof state.incomeStatement === 'object') {
      const is = state.incomeStatement as Record<string, unknown>
      if (Array.isArray(is.accounts)) {
        const migratedAccounts = is.accounts.map((acc: unknown) => {
          if (!acc || typeof acc !== 'object') return acc
          const a = acc as Record<string, unknown>
          if (a.section !== 'net_interest') return a
          const interestType = a.interestType
          const newSection = interestType === 'income' ? 'interest_income' : 'interest_expense'
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { interestType: _drop, ...rest } = a
          return { ...rest, section: newSection }
        })
        state = {
          ...state,
          incomeStatement: { ...is, accounts: migratedAccounts },
        }
      }
    }

    // — Task 5: drop numeric IBD, force re-confirm via new page —
    const ibd = (state as Record<string, unknown>).interestBearingDebt
    if (typeof ibd === 'number' || ibd === undefined) {
      state = { ...state, interestBearingDebt: null }
    }
  }

  if (fromVersion < 20) {
    // Session 042 Task 4 — Promote accPayables to dynamic-schedule shape.
    //
    // Old shape: { rows: Record<number, YearKeyedSeries> } with data at
    //            template rows 9/10/11/12/14/18/19/20/21/23
    // New shape: { schedules: ApSchedule[], rows: Record<...> }
    //
    // Migration preserves Addition data by merging legacy Addition +
    // legacy Repayment into a single signed Addition (LESSON-055 plain
    // addition convention). Legacy Interest Payable rows (14/23) are
    // discarded — that data wasn't consumed by any compute module.
    const ap = (state as Record<string, unknown>).accPayables
    if (ap && typeof ap === 'object' && ap !== null && !('schedules' in ap)) {
      const legacyRows = (ap as Record<string, unknown>).rows
      const rows: Record<number, Record<number, number>> = {}
      if (legacyRows && typeof legacyRows === 'object') {
        for (const [key, value] of Object.entries(legacyRows)) {
          const numKey = Number(key)
          if (!Number.isFinite(numKey)) continue
          if (value && typeof value === 'object') {
            rows[numKey] = { ...(value as Record<number, number>) }
          }
        }
      }
      // Fold legacy Repayment (rows 11, 20) into Addition (rows 10, 19).
      // Sign assumption from LESSON-055: Addition positive, Repayment negative.
      // If both exist, Addition becomes Addition + Repayment (signed sum).
      const foldInto = (addRow: number, repayRow: number) => {
        if (!rows[repayRow]) return
        if (!rows[addRow]) rows[addRow] = {}
        for (const [yearStr, repayVal] of Object.entries(rows[repayRow])) {
          const year = Number(yearStr)
          const existing = rows[addRow][year] ?? 0
          rows[addRow][year] = existing + (repayVal as number)
        }
        delete rows[repayRow]
      }
      foldInto(10, 11)
      foldInto(19, 20)
      // Discard Interest Payable rows (14, 23) — not consumed downstream.
      delete rows[14]
      delete rows[23]

      state = {
        ...state,
        accPayables: {
          schedules: [
            { id: 'st_default', section: 'st_bank_loans', slotIndex: 0 },
            { id: 'lt_default', section: 'lt_bank_loans', slotIndex: 0 },
          ],
          rows,
        },
      }
    }
  }

  // v20 → v21: Session 051 added `balanceSheet.equityProjectionOverrides`
  //           for per-(equity row, projection year) user-edited values on
  //           Proy BS. Idempotent — preserves any object already present.
  if (fromVersion < 21) {
    if (state.balanceSheet && typeof state.balanceSheet === 'object') {
      const bs = state.balanceSheet as Record<string, unknown>
      if (!('equityProjectionOverrides' in bs)) {
        state = {
          ...state,
          balanceSheet: { ...bs, equityProjectionOverrides: {} },
        }
      }
    }
  }

  // v21 → v22: Session 054 added root-level `growthRevenue` slice for
  //           industry benchmark rows 40 + 41. Default null until user
  //           first opens the editor. Idempotent.
  if (fromVersion < 22) {
    if (!('growthRevenue' in state)) {
      state = { ...state, growthRevenue: null }
    }
  }

  // v22 → v23: Session 055 added 3 root-level scope slices (all null by
  //           default): `investedCapital`, `cashBalance`, `cashAccount`.
  //           Required-gate: user must visit dedicated pages and click
  //           "Konfirmasi Cakupan" to unlock ROIC + Growth Rate + CFS.
  //           Idempotent.
  if (fromVersion < 23) {
    if (!('investedCapital' in state)) {
      state = { ...state, investedCapital: null }
    }
    if (!('cashBalance' in state)) {
      state = { ...state, cashBalance: null }
    }
    if (!('cashAccount' in state)) {
      state = { ...state, cashAccount: null }
    }
  }

  // v23 → v24: Session 056 added root-level `financing` scope slice (5 disjoint
  //           IS-excelRow lists for CFS financing rows 27-31). Null by default —
  //           user must visit `/input/financing` and click "Konfirmasi Cakupan"
  //           to unlock CFS. Idempotent.
  if (fromVersion < 24) {
    if (!('financing' in state)) {
      state = { ...state, financing: null }
    }
  }

  return state
}

export const useKkaStore = create<KkaState>()(
  persist(
    (set) => ({
      language: 'en' as const,
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
      interestBearingDebt: null,
      changesInWorkingCapital: null,
      growthRevenue: null,
      investedCapital: null,
      cashBalance: null,
      cashAccount: null,
      financing: null,
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
      setEquityProjectionOverride: (excelRow, year, value) =>
        set((state) => {
          if (!state.balanceSheet) return state
          const current = state.balanceSheet.equityProjectionOverrides ?? {}
          const rowOverrides = { ...(current[excelRow] ?? {}) }
          if (value === null) {
            delete rowOverrides[year]
          } else {
            rowOverrides[year] = value
          }
          const next = { ...current }
          if (Object.keys(rowOverrides).length === 0) {
            delete next[excelRow]
          } else {
            next[excelRow] = rowOverrides
          }
          return {
            balanceSheet: {
              ...state.balanceSheet,
              equityProjectionOverrides: next,
            },
          }
        }),
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
          language: lang,
          balanceSheet: state.balanceSheet ? { ...state.balanceSheet, language: lang } : state.balanceSheet,
          incomeStatement: state.incomeStatement ? { ...state.incomeStatement, language: lang } : state.incomeStatement,
          fixedAsset: state.fixedAsset ? { ...state.fixedAsset, language: lang } : state.fixedAsset,
        })),
      setNilaiPengalihanDilaporkan: (v) => set({ nilaiPengalihanDilaporkan: v }),
      toggleExcludeCurrentLiabIbd: (excelRow) =>
        set((state) => {
          const current = state.interestBearingDebt ?? {
            excludedCurrentLiabilities: [],
            excludedNonCurrentLiabilities: [],
          }
          const list = current.excludedCurrentLiabilities
          const next = list.includes(excelRow)
            ? list.filter((r) => r !== excelRow)
            : [...list, excelRow]
          return {
            interestBearingDebt: { ...current, excludedCurrentLiabilities: next },
          }
        }),
      toggleExcludeNonCurrentLiabIbd: (excelRow) =>
        set((state) => {
          const current = state.interestBearingDebt ?? {
            excludedCurrentLiabilities: [],
            excludedNonCurrentLiabilities: [],
          }
          const list = current.excludedNonCurrentLiabilities
          const next = list.includes(excelRow)
            ? list.filter((r) => r !== excelRow)
            : [...list, excelRow]
          return {
            interestBearingDebt: { ...current, excludedNonCurrentLiabilities: next },
          }
        }),
      confirmIbdScope: () =>
        set((state) => ({
          interestBearingDebt: state.interestBearingDebt ?? {
            excludedCurrentLiabilities: [],
            excludedNonCurrentLiabilities: [],
          },
        })),
      resetIbdScope: () => set({ interestBearingDebt: null }),
      toggleExcludeCurrentAsset: (excelRow) =>
        set((state) => {
          const current = state.changesInWorkingCapital ?? {
            excludedCurrentAssets: [],
            excludedCurrentLiabilities: [],
          }
          const list = current.excludedCurrentAssets
          const next = list.includes(excelRow)
            ? list.filter((r) => r !== excelRow)
            : [...list, excelRow]
          return {
            changesInWorkingCapital: { ...current, excludedCurrentAssets: next },
          }
        }),
      toggleExcludeCurrentLiability: (excelRow) =>
        set((state) => {
          const current = state.changesInWorkingCapital ?? {
            excludedCurrentAssets: [],
            excludedCurrentLiabilities: [],
          }
          const list = current.excludedCurrentLiabilities
          const next = list.includes(excelRow)
            ? list.filter((r) => r !== excelRow)
            : [...list, excelRow]
          return {
            changesInWorkingCapital: { ...current, excludedCurrentLiabilities: next },
          }
        }),
      confirmWcScope: () =>
        set((state) => ({
          changesInWorkingCapital: state.changesInWorkingCapital ?? {
            excludedCurrentAssets: [],
            excludedCurrentLiabilities: [],
          },
        })),
      resetWcScope: () => set({ changesInWorkingCapital: null }),
      setGrowthRevenue: (growthRevenue) => set({ growthRevenue }),
      resetGrowthRevenue: () => set({ growthRevenue: null }),
      assignInvestedCapital: (row, ref) =>
        set((state) => {
          const current = state.investedCapital ?? {
            otherNonOperatingAssets: [],
            excessCash: [],
            marketableSecurities: [],
          }
          const refMatches = (r: SourceRef) =>
            r.source === ref.source && r.excelRow === ref.excelRow
          const next: InvestedCapitalState = {
            otherNonOperatingAssets: current.otherNonOperatingAssets.filter((r) => !refMatches(r)),
            excessCash: current.excessCash.filter((r) => !refMatches(r)),
            marketableSecurities: current.marketableSecurities.filter((r) => !refMatches(r)),
          }
          if (!next[row].some(refMatches)) {
            next[row] = [...next[row], ref]
          }
          return { investedCapital: next }
        }),
      removeInvestedCapital: (row, ref) =>
        set((state) => {
          const current = state.investedCapital ?? {
            otherNonOperatingAssets: [],
            excessCash: [],
            marketableSecurities: [],
          }
          const refMatches = (r: SourceRef) =>
            r.source === ref.source && r.excelRow === ref.excelRow
          return {
            investedCapital: {
              ...current,
              [row]: current[row].filter((r) => !refMatches(r)),
            },
          }
        }),
      confirmInvestedCapitalScope: () =>
        set((state) => ({
          investedCapital: state.investedCapital ?? {
            otherNonOperatingAssets: [],
            excessCash: [],
            marketableSecurities: [],
          },
        })),
      resetInvestedCapitalScope: () => set({ investedCapital: null }),
      toggleCashBalanceAccount: (excelRow) =>
        set((state) => {
          const current = state.cashBalance ?? { accounts: [] }
          const list = current.accounts
          const next = list.includes(excelRow)
            ? list.filter((r) => r !== excelRow)
            : [...list, excelRow]
          return { cashBalance: { ...current, accounts: next } }
        }),
      setCashBalancePreHistoryBeginning: (value) =>
        set((state) => {
          const current = state.cashBalance ?? { accounts: [] }
          if (value === null) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { preHistoryBeginning: _drop, ...rest } = current
            return { cashBalance: { ...rest } }
          }
          return { cashBalance: { ...current, preHistoryBeginning: value } }
        }),
      confirmCashBalanceScope: () =>
        set((state) => ({ cashBalance: state.cashBalance ?? { accounts: [] } })),
      resetCashBalanceScope: () => set({ cashBalance: null }),
      assignCashAccount: (row, excelRow) =>
        set((state) => {
          const current = state.cashAccount ?? { bank: [], cashOnHand: [] }
          const next: CashAccountState = {
            bank: current.bank.filter((r) => r !== excelRow),
            cashOnHand: current.cashOnHand.filter((r) => r !== excelRow),
          }
          next[row] = [...next[row], excelRow]
          return { cashAccount: next }
        }),
      removeCashAccount: (row, excelRow) =>
        set((state) => {
          const current = state.cashAccount ?? { bank: [], cashOnHand: [] }
          return {
            cashAccount: { ...current, [row]: current[row].filter((r) => r !== excelRow) },
          }
        }),
      confirmCashAccountScope: () =>
        set((state) => ({
          cashAccount: state.cashAccount ?? { bank: [], cashOnHand: [] },
        })),
      resetCashAccountScope: () => set({ cashAccount: null }),
      assignFinancing: (row, excelRow) =>
        set((state) => {
          const current = state.financing ?? {
            equityInjection: [],
            newLoan: [],
            interestPayment: [],
            interestIncome: [],
            principalRepayment: [],
          }
          // Cross-row mutual exclusion: strip excelRow from every list first,
          // then append to the target list. Guarantees a single excelRow
          // only ever lives in ONE of the 5 rows.
          const next: FinancingState = {
            equityInjection: current.equityInjection.filter((r) => r !== excelRow),
            newLoan: current.newLoan.filter((r) => r !== excelRow),
            interestPayment: current.interestPayment.filter((r) => r !== excelRow),
            interestIncome: current.interestIncome.filter((r) => r !== excelRow),
            principalRepayment: current.principalRepayment.filter((r) => r !== excelRow),
          }
          next[row] = [...next[row], excelRow]
          return { financing: next }
        }),
      removeFinancing: (row, excelRow) =>
        set((state) => {
          const current = state.financing ?? {
            equityInjection: [],
            newLoan: [],
            interestPayment: [],
            interestIncome: [],
            principalRepayment: [],
          }
          return {
            financing: { ...current, [row]: current[row].filter((r) => r !== excelRow) },
          }
        }),
      confirmFinancingScope: () =>
        set((state) => ({
          financing: state.financing ?? {
            equityInjection: [],
            newLoan: [],
            interestPayment: [],
            interestIncome: [],
            principalRepayment: [],
          },
        })),
      resetFinancingScope: () => set({ financing: null }),
      resetAll: () => set({
        language: 'en',
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
        interestBearingDebt: null,
        changesInWorkingCapital: null,
        growthRevenue: null,
        investedCapital: null,
        cashBalance: null,
        cashAccount: null,
        financing: null,
      }),
      _hasHydrated: false,
      _setHasHydrated: (hydrated) => set({ _hasHydrated: hydrated }),
    }),
    {
      name: STORE_KEY,
      version: STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        language: state.language,
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
        interestBearingDebt: state.interestBearingDebt,
        changesInWorkingCapital: state.changesInWorkingCapital,
        growthRevenue: state.growthRevenue,
        investedCapital: state.investedCapital,
        cashBalance: state.cashBalance,
        cashAccount: state.cashAccount,
        financing: state.financing,
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

# Session 055 — Design

## Scope

Cluster AB dari user 7-poin revision: Poin 1-5 (rename + Invested Capital + Growth Rate NFA + CWC multi-year + Cash Balance + Cash Account). Poin 6 Financing di-defer ke Session 056.

## Architectural Decisions

### Decision 1 — Invested Capital: 3-section dropdown-add (bukan flat trash-icon)

Sementara CWC/IBD pakai flat trash-icon (karena binary include/exclude atas pool eksisting), **Invested Capital butuh 4-state assignment per account** (unassigned / row A / row B / row C) dengan **cross-row mutual exclusion**. Pattern yang cocok:

- 3 section masing-masing punya **dropdown "Add account"** dengan opsi **filtered** (exclude yang sudah terpilih di 3 row manapun)
- **Selected accounts list** per section dengan trash icon untuk un-assign
- Opsi dropdown berasal dari pool: **BS asset accounts + FA detail per-item**

Alasan pilih pattern ini: matches user spec "downlist yang bisa dipilih adalah semua nama akun... pengguna akan memilih akun mana saja yang masuk ke baris... 1 akun hanya bisa masuk ke salah 1 baris saja".

Warning soft kalau user pilih BS "Fixed Assets — Net" (PPE aggregate) BERSAMAAN dengan FA detail account (risiko double-count).

### Decision 2 — Cash Balance: 1 unified list, year-shift otomatis

Per user Q2 (A): user pilih 1 set akun cash (dari BS current_assets), sistem derive:
- `CashEnding[Y] = sum(accounts @ year Y)`
- `CashBeginning[Y] = sum(accounts @ year Y-1)` — otomatis identik dengan `CashEnding[Y-1]`
- Untuk tahun pertama historis, `CashBeginning[years[0]]` = `scope.preHistoryBeginning ?? 0` (optional user input)

### Decision 3 — Cash Account: 2 section mutual exclusion, independent pool

Per user Q8 (A): pool = BS current_assets (sama dengan Cash Balance), tapi **independent** — account bisa di Cash Balance tapi tidak di Cash Account atau sebaliknya. Warning soft kalau akun di Cash Account tidak ada di Cash Balance (potensi inconsistency).

Cash Account.bank dan Cash Account.cashOnHand mutual exclusive (1 akun hanya di salah satu).

### Decision 4 — Growth Rate NFA single source of truth

Per user Q5 (B): kedua row (End + Beginning) dari FA row 69 langsung:
- `NetFA_End[Y] = FA[69][Y]`
- `NetFA_Beginning[Y] = FA[69][Y-1]` (pre-signed negative di display)

Fix root cause "End shows `-`": LESSON-057 merge order — page menggunakan `allFa = { ...faComp, ...state.fixedAsset.rows }` supaya store sentinel menang atas static manifest recompute yang tidak melihat dynamic extended accounts.

### Decision 5 — CWC multi-year display

Per user Q4 (AAA): matrix year-column + 1 trash aggregate + Avg column. Reuse `<FinancialTable>` component. Scope editing tetap year-agnostic (trash apply across all years).

### Decision 6 — Store v22 → v23 single migration

Per user Q8 (A): satu bump v23 menambah 3 slice null sentinel:
- `investedCapital: InvestedCapitalState | null`
- `cashBalance: CashBalanceState | null`
- `cashAccount: CashAccountState | null`

### Decision 7 — Required-gate minimal

Per user Q6 (A):
- `investedCapital === null` blocks `/analysis/roic` + `/analysis/growth-rate`
- `cashBalance === null` blocks `/analysis/cash-flow-statement`
- `cashAccount === null` blocks `/analysis/cash-flow-statement`
- **NO cascade** ke FCF/DCF/EEM/CFI/Simulasi/Dashboard (mereka tidak butuh nilai ini)

### Decision 8 — Sidebar placement

Per user Q7 (A): 3 scope editor baru masuk Drivers & Scope alphabetical:
```
DRIVERS & SCOPE
  Cash Account       ← NEW
  Cash Balance       ← NEW
  Changes in Working Capital
  Growth Revenue
  Invested Capital   ← NEW
  Key Drivers
```

## Types

```ts
export type SourceRef = {
  source: 'bs' | 'fa'
  excelRow: number  // for BS: account.excelRow; for FA: account.excelRow (base row)
}

export interface InvestedCapitalState {
  otherNonOperatingAssets: SourceRef[]
  excessCash: SourceRef[]
  marketableSecurities: SourceRef[]
}

export interface CashBalanceState {
  accounts: number[]  // BS current_assets excelRows
  preHistoryBeginning?: number  // optional pre-first-year Beginning
}

export interface CashAccountState {
  bank: number[]         // BS current_assets excelRows
  cashOnHand: number[]   // BS current_assets excelRows (mutex with bank)
}
```

## Non-Negotiables Honored

- **LESSON-108**: Zero hardcoded row numbers in compute — all aggregations iterate user-curated scope
- **LESSON-107**: Required-gate pattern with null sentinel at every consumer page
- **LESSON-057**: Merge order `{ ...recomputed, ...storeRows }` for Growth Rate FA fix
- **LESSON-118**: Phase C fixture helper extended for new schema
- **LESSON-119**: Single source of truth — Invested Capital scope drives both ROIC compute AND downstream DCF
- **LESSON-143/146**: No fabricated defaults — empty scope = 0, not guessed
- **LESSON-029**: Company-agnostic — scope editors work for any company

## Out of Scope

- Financing scope editor (Session 056 Cluster C)
- Upload parser
- Dashboard projected FCF chart
- Extended-catalog smoke test fixture

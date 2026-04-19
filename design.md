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

- Upload parser
- Dashboard projected FCF chart
- Extended-catalog smoke test fixture

---

# Session 056 — Design (Cluster C Financing)

## Scope

Cluster C dari user 7-poin revision (poin 6): `/input/financing` scope editor
yang menggantikan hardcoded references di `compute-cash-flow-live.ts` untuk 5
CFS FINANCING rows (22-26) dengan user-curated scope — konsisten dengan
pattern Session 055 Invested Capital / Cash Balance / Cash Account.

## Architectural Decisions

### Decision 1 — UX: 5 section terpisah (konsisten Invested Capital)

Pattern mirror Invested Capital Session 055 (3 section with dropdown-add +
cross-row mutex + trash-icon remove). Financing extends ke 5 section:

```
/input/financing
  ├── 💰 Equity Injection (Row 22)       pool: BS section='equity'
  ├── 🏦 New Loan (Row 23)                pool: AP schedule Add-band excelRows
  ├── 💸 Interest Payment (Row 24)       pool: IS section='interest_expense'
  ├── 💵 Interest Income (Row 25)         pool: IS section='interest_income'
  └── 🔙 Principal Repayment (Row 26)     pool: AP row space (any band user picks)
```

**Cross-row mutex**: 1 excelRow hanya boleh appear di 1 CFS row (matches
Invested Capital mutex semantic). Pools sources are disjoint by design
(BS vs IS vs AP) except for Row 23 vs Row 26 yang share AP pool — mutex
protects against double-count.

### Decision 2 — Equity Injection semantic: YoY delta

Row 22 (Equity Injection) = `Σ(equity_accounts @ Y) − Σ(equity_accounts @ Y-1)`.

Year 1 prior year = `bsYears[0]` (BS extends 4 years, CFS 3 years — same
pattern as existing CFS row 9 CL delta). Year 2+ prior = `cfsYears[i-1]`.

**Why YoY delta (A2) not raw BS value (A1)**: flow semantic matches 4 other
CFS Financing rows (which are flows). User picks equity accounts that
represent INJECTION FLOWS (paid-up capital, APIC) — NOT retained earnings
(which flow through net profit via CFS Operations) NOR treasury stock
(buyback is also a flow but user's choice whether to include).

### Decision 3 — AP pool granularity: per individual excelRow

User picks specific AP excelRows (catalog band baseline + extended + raw
schedule rows). Label in dropdown: `Schedule <name> · <band> (row N)`.

**New Loan pool**: filter AP rows where the schedule band type is 'add'
(legacy 10, 19 + extended 140-179 ST + 260-299 LT). PT Raja fixture
replication: `newLoan: [10, 19]`.

**Principal Repayment pool**: free AP row space — user can pick any AP row
including legacy prototipe row 20. Fixture replication:
`principalRepayment: [20]` — row 20 is NOT in AP_BANDS but store.rows
Record<number> is generic enough to hold it (legacy prototipe data).

### Decision 4 — IS pool: per account (granular)

**Interest Payment**: filter `isLeaves` keyed by excelRow where the
corresponding IS account has `section: 'interest_expense'` (rows 520-539).
Sum user-picked accounts' values per year.

**Interest Income**: same pattern with `section: 'interest_income'`
(rows 500-519).

Legacy sentinel `isLeaves[27]` / `isLeaves[26]` are section-sum sentinels
pre-computed by DynamicIsEditor at persist time. PT Raja fixture
reconstruction: pick the individual account rows (e.g. [520] for sole
interest_expense account in prototipe) → sum yields same numeric as legacy
section-sentinel read. Phase C parity preserved.

**IS non_operating EXCLUDED** from Financing pool — `non_operating` is
already wired to CFS row 13 "Non Operations" (outside FINANCING section).
Session 055 progress.md notes mentioned it possibly typo — my decision:
exclude (no CFS Financing row slot for it).

### Decision 5 — Store v23 → v24 single migration

```ts
export interface FinancingState {
  equityInjection: number[]      // BS excelRows (equity section)
  newLoan: number[]              // AP excelRows (Add-band)
  interestPayment: number[]      // IS excelRows (interest_expense)
  interestIncome: number[]       // IS excelRows (interest_income)
  principalRepayment: number[]   // AP excelRows (any)
}
```

Root-level `financing: FinancingState | null`. Setter
`assignFinancing(row: keyof FinancingState, excelRow: number)` auto-removes
from the other 4 rows before appending (cross-row mutex enforced in store
layer — matches Session 055 pattern).

`confirmFinancingScope()` transitions null → default empty-list state.
`resetFinancingScope()` reverts to null.

### Decision 6 — Required-gate minimal

`financing === null` blocks `/analysis/cash-flow-statement` only. NO
cascade to DCF/EEM/CFI/Simulasi/Dashboard/FCF (mereka baca dari CFS
sentinel rows at store level, not financing directly).

CFS gate additive: sudah gated on `cashBalance === null || cashAccount === null`
(Session 055). Adds `|| financing === null`. Empty state lists Financing
as required.

### Decision 7 — Sidebar placement

Drivers & Scope subgroup 6 → 7 items alphabetical (adding "Financing"
between "Changes in Working Capital" dan "Growth Revenue"):

```
DRIVERS & SCOPE
  Cash Account
  Cash Balance
  Changes in Working Capital
  Financing            ← NEW
  Growth Revenue
  Invested Capital
  Key Drivers
```

### Decision 8 — Phase C fixture reconstruction

`pt-raja-voltama-state.ts` gains:

```ts
financing: {
  equityInjection: [],             // legacy row 22 = 0 (unwired)
  newLoan: [10, 19],               // legacy: apRows[10] + apRows[19]
  interestPayment: [520],          // legacy: isLeaves[27] (single account)
  interestIncome: [500],           // legacy: isLeaves[26] (single account)
  principalRepayment: [20],        // legacy: apRows[20]
}
```

Numeric parity: PT Raja prototipe has exactly 1 interest_income account
(row 500) and 1 interest_expense account (row 520). Their values are
mirrored to section sentinels at rows 26/27 by DynamicIsEditor. Picking
[500]/[520] at scope layer sums those rows directly — identical numeric.
AP rows 10/19/20 mirror legacy hardcoded refs. Row 22 = 0 preserves
legacy unwired semantic.

## Types

```ts
export interface FinancingState {
  equityInjection: number[]
  newLoan: number[]
  interestPayment: number[]
  interestIncome: number[]
  principalRepayment: number[]
}

export interface FinancingResult {
  equityInjection: YearKeyedSeries  // YoY delta per cfsYear
  newLoan: YearKeyedSeries
  interestPayment: YearKeyedSeries
  interestIncome: YearKeyedSeries
  principalRepayment: YearKeyedSeries
}

export function computeFinancing(input: {
  financing: FinancingState | null
  bsRows: Record<number, YearKeyedSeries>
  isLeaves: Record<number, YearKeyedSeries>
  apRows: Record<number, YearKeyedSeries>
  cfsYears: readonly number[]
  bsYears: readonly number[]
}): FinancingResult
```

Returns zeroed series (all rows) when `financing === null`. When set, for
each of 5 output fields: sum user-picked excelRows' values at each year,
with equityInjection special-cased for YoY delta.

## Non-Negotiables Honored

- **LESSON-108**: zero hardcoded row numbers in compute after refactor
- **LESSON-107**: required-gate with null sentinel at CFS consumer
- **LESSON-150**: triple-wiring atomically (view + compute-helper + builder + Phase C fixture)
- **LESSON-112**: Phase C fixture replicates legacy behavior exactly (numeric parity)
- **LESSON-011**: sign reconciliation at builder boundary (interest_expense passes through negative per Session 041 convention)
- **LESSON-029**: company-agnostic — scope editors work for any company structure
- **LESSON-081**: commit with explicit paths only (no `git add -A`)

## Out of Scope (Session 056)

- Upload parser (carryover backlog)
- Dashboard projected FCF chart
- Extended-catalog smoke test fixture (LESSON-148 follow-up)
- Proy CFS financing rewire — that module uses DIFFERENT AP rows (ST end=12, LT end=21 per compute-proy-acc-payables-live.ts comments) and projection semantic. Keep deferred.

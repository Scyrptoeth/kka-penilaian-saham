# Session 055 — Invested Capital + Cash Balance + Cash Account Scope Editors + ROIC Rename + Growth Rate NFA Single Source + CWC Multi-Year

**Date**: 2026-04-19
**Scope**: Cluster AB of user 7-point revision (Poin 1-5). Cluster C (Poin 6 Financing) deferred to Session 056.
**Branch**: `feat/session-055-invested-capital-cash-scope-nfa-cwc` → main (merged 4c85d45)
**Strategy**: Parallel agents for reconnaissance + independent implementation. Main thread for critical integration + debugging.

## Goals (user-confirmed Q1-Q8)

- [x] Q1: Split 2 sesi — AB (this session) + C (next)
- [x] Q2: Cash Balance 1 unified list + year-shift derive
- [x] Q3: Invested Capital pool = BS + FA detail per-item (warning soft overlap)
- [x] Q4: CWC matrix year-column + 1 trash + Avg column
- [x] Q5: Growth Rate NFA both rows source FA row 69 (single source of truth)
- [x] Q6: Required-gate minimal (IC→ROIC+GR, CB+CA→CFS, no cascade)
- [x] Q7: Sidebar Drivers & Scope alphabetical
- [x] Q8: Single v22→v23 bump + independent Cash Account pool

## Delivered

### Task 1 — Global Rename (commit `feat(store): Session 055 T1+T2`)
- ROIC manifest row 9 label: "Less Non Operating Fixed Assets" → "Less Other Non-Operating Assets"
- Both fixture JSONs updated (`src/data/seed/fixtures/roic.json`, `__tests__/fixtures/roic.json`)
- `compute-roic-live.ts` docstrings + inline comments updated

### Task 2 — Store v22→v23 (same commit)
- 3 new TypeScript interfaces in `useKkaStore.ts`:
  - `SourceRef = { source: 'bs' | 'fa'; excelRow: number }`
  - `InvestedCapitalState = { otherNonOperatingAssets, excessCash, marketableSecurities: SourceRef[] }`
  - `CashBalanceState = { accounts: number[]; preHistoryBeginning?: number }`
  - `CashAccountState = { bank: number[]; cashOnHand: number[] }`
- `STORE_VERSION 22 → 23`; migration adds 3 nulls idempotent
- Setters with built-in mutual exclusion:
  - `assignInvestedCapital(row, ref)` removes from other 2 rows before adding
  - `assignCashAccount(row, excelRow)` removes from bank/cashOnHand counterpart
- `ExportableState` + `UpstreamSlice` + `isPopulated` + `ExportButton` + `resetAll` + `partialize` all wired
- +5 TDD migration cases (initial + idempotent + chain + future-pass-through update)
- ROIC compute gets optional `investedCapitalValues` param (pre-signed negation LESSON-011)

### Tasks 3-5 — Pure Compute Helpers (3 parallel agents, commit `feat(calc): Session 055 T3-T5`)
- `src/lib/calculations/compute-invested-capital.ts` — 8 TDD cases. For each SourceRef: `source='bs'` reads `bsRows[excelRow]`, `source='fa'` reads `faRows[excelRow + FA_OFFSET.NET_VALUE]`. Natural positive sums.
- `src/lib/calculations/compute-cash-balance.ts` — 8 TDD cases incl identity `Ending[Y]=Beginning[Y+1]`. Year-shift via `cfsYears[i-1]` / `bsYears[indexOf(cfsYears[0])-1]` / `scope.preHistoryBeginning ?? 0`.
- `src/lib/calculations/compute-cash-account.ts` — 7 TDD cases. Bank + CashOnHand sums, mutex enforced upstream.

### Tasks 6-8 — 3 New Scope Editor Pages (3 parallel agents, commit `feat(input): Session 055 T6-T8`)
- `/input/invested-capital` (489 LOC): 3 sections × dropdown-add + cross-row mutex + filtered pool (BS assets + FA detail) + trash-icon removal + BS-PPE/FA-detail overlap warning + 3 trivia blocks (from user images 1a/1b/1c). Hydration-gate + PageEmptyState.
- `/input/cash-balance` (350 LOC): single section + dropdown-add + pre-history Beginning optional + trivia 4a. Hydration-gate + PageEmptyState.
- `/input/cash-account` (361 LOC): 2 sections × dropdown-add + cross-list mutex + trivia 5a shared + soft warning when Cash Account entry not in Cash Balance scope. Hydration-gate + PageEmptyState.
- All 3 follow IBD local-draft pattern: `useState<X>(() => store.X ?? default)` + dirty check via `JSON.stringify(sorted)` + commit path `useKkaStore.setState({}) + confirmXxxScope()`.

### Tasks 13-14 — Nav + i18n (commit `feat(i18n,nav): Session 055 T13+T14`)
- Nav-tree Drivers & Scope 3 → 6 items alphabetical: Cash Account · Cash Balance · Changes in Working Capital · Growth Revenue · Invested Capital · Key Drivers
- ~65 new i18n keys bilingual EN/ID: `nav.item.*` (3) + `investedCapital.*` (22 incl 3 trivia bodies) + `cashBalance.*` (15) + `cashAccount.*` (15). Trivia content verbatim from user-provided images.

### Tasks 9-12 — Consumer Rewires (commit `feat(consumers): Session 055 T9-T12`)
**Task 9 — ROIC rewire**:
- `RoicLiveView.tsx`: gate `investedCapital === null`, wire `computeInvestedCapital` + `computeCashBalance` + `computeCashAccount` through chain. PageEmptyState lists Invested Capital as required input.
- `RoicBuilder.ts`: upstream += `'investedCapital'`. Pre-computes IC + Cash Balance + Cash Account results inside `build()`, feeds into `computeRoicLiveRows(..., icValues)`.
- Fixture-parity test updated: mock `investedCapitalValues.excessCash = BS[8]` reproduces legacy PT Raja Voltama behavior. 21/21 + 6/6 passing.

**Task 10 — Growth Rate NFA single source (Q5-B)**:
- `compute-growth-rate-live.ts`: `netFaBeg` now sources from `faRows[69]` prior year (was `bsAllRows[22]`). Single source of truth.
- `src/app/analysis/growth-rate/page.tsx`: LESSON-057 merge order `allFa = { ...faComp, ...state.fixedAsset.rows }` applied. Store sentinels win. `investedCapital` required-gate added.
- `GrowthRateBuilder.ts`: upstream += `'investedCapital'`. Wires IC + Cash computes.

**Task 11 — CWC Multi-year Matrix (agent)**:
- `SectionEditor` refactored: `<ul>` single-year → `<table>` with year columns × Avg column × 1 aggregate trash per row. `averageSeries` from `derivation-helpers` (leading-zero-skip semantic). Added `wc.col.account` i18n key.
- Scope semantics unchanged (include/exclude still aggregate across years).

**Task 12 — CFS Rewire (agent)**:
- `compute-cash-flow-live.ts`: added optional `cashBalanceResult` + `cashAccountResult` params. Deleted hardcoded `BS_CASH_ROWS = [8, 9]`. Rows 32/33/35/36 default 0 when scopes absent.
- `CashFlowLiveView.tsx`: gate `cashBalance === null || cashAccount === null`. PageEmptyState lists both as required.
- `CashFlowStatementBuilder.ts`: upstream += `'cashBalance', 'cashAccount'`. Pre-computes both results before CFS compute call.

### Task 15 — Phase C Fixture (commit `test(phase-c): Session 055 T15`)
- `pt-raja-voltama-state.ts` extended with:
  - `investedCapital.excessCash = [{source: 'bs', excelRow: 8}]` → maintains legacy `row 10 = -BS[8]` parity
  - `cashBalance.accounts = [8, 9]` → CFS rows 32/33 sum Cash on Hand + Cash in Bank
  - `cashAccount.bank = [9], cashOnHand = [8]` → CFS rows 35/36 split preserved
  - `growthRevenue = null` (template default)
- Phase C 5/5 gates green post-update.

### Task 16 — Verification
```
Tests:     1420 / 1420 passing + 1 skipped  (114 test files)
Build:     ✅ 45 static pages (+3 new input routes)
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings
Audit:     ✅ 0 i18n violations
Phase C:   ✅ 5/5 gates
Cascade:   ✅ 3/3 (29/29 MIGRATED_SHEETS)
Live:      https://penilaian-bisnis.vercel.app HTTP 307 (root redirect, server responsive)
Store:     v23
```

### Task 17 — Merge + Deploy
- Feature branch merged to main (no-ff) as commit `4c85d45`
- Pushed to origin/main → Vercel auto-deploy triggered
- Local + remote feature branch deleted

## Stats

- Commits: 7 feature + 1 chore (temp file cleanup)
- Files changed: ~20 production + 8 test + 3 new test files
- New LOC (approx): +2500 / −150 in production code
- New tests: 23 (compute helpers) + 5 (migration) + 2 (fixture wiring) = ~30 new cases
- Store version: v22 → v23
- New routes: 3 (+3 × ~400 LOC scope editor pages)
- New pure compute modules: 3
- New i18n keys: ~65 bilingual

## Deviations from Plan

- Task 1 originally planned to retrofit ROIC manifest labels to i18n keys; deferred because manifest pattern uses hardcoded strings consistently across all sheets (no i18n retrofit precedent). ROIC row 9 label just got the new hardcoded string "Less Other Non-Operating Assets".
- Accidentally committed session screenshot PNGs + prompt MDs + `~$*.xlsx` temp file via `git add -A` (LESSON-081 violation). Temp file cleaned in followup commit. Screenshots kept as session documentation.

## Deferred

- Session 056 Cluster C: Financing scope editor (Poin 6) + final integration cascade for Financing section
- User visual QA for Cluster AB (5 changes) post-Vercel deploy
- Upload parser architecture discussion (carries from Session 054)
- Extended-catalog smoke test fixture (LESSON-148 follow-up)

## Lessons Extracted

- **LESSON-150** (PROMOTED): Cross-sheet scope editor + compute-helper + builder triple-wiring pattern — when a user-curated scope slice drives ANY compute (here ROIC's "Less" rows, CFS's Cash rows), ALL 3 layers must be updated atomically in one session: (a) view PageEmptyState gate + wire compute helper, (b) sheet builder upstream += slice + pre-compute result in build(), (c) Phase C fixture reconstructs legacy behavior via curated scope values. Otherwise Phase C silently diverges or consumer page breaks.
- **LESSON-151** (PROMOTED): Parallel agent delegation scales for independent tracks — Session 055 ran 3 parallel reconnaissance agents (ROIC/GR/CWC/CFS/FA-catalog state maps) + 3 parallel compute-helper agents + 3 parallel page-editor agents + 2 parallel consumer-rewire agents = ~11 parallel tasks across the session, without conflicts. Each agent briefed with specific file paths + signatures + existing patterns + verification steps. Main thread reserved for critical state work (store migration, fixture update, test file mutations) where holistic context matters.
- **LESSON-152** (local): `git add -A` with many untracked session screenshots is a foot-gun — LESSON-081 reinforced. Stage explicit paths via `git add <path1> <path2>` for feature commits, especially at session boundaries with large untracked media.

## Files Added / Modified

### New files (7)
- `src/app/input/invested-capital/page.tsx` (489 LOC)
- `src/app/input/cash-balance/page.tsx` (350 LOC)
- `src/app/input/cash-account/page.tsx` (361 LOC)
- `src/lib/calculations/compute-invested-capital.ts`
- `src/lib/calculations/compute-cash-balance.ts`
- `src/lib/calculations/compute-cash-account.ts`
- 3 new test files

### Modified (~22)
- `src/lib/store/useKkaStore.ts` (+160 LOC — 3 types + setters + migration + state init)
- `src/lib/export/export-xlsx.ts`, `src/lib/export/sheet-builders/{types,populated,roic,growth-rate,cash-flow-statement}.ts`
- `src/components/analysis/{RoicLiveView,CashFlowLiveView}.tsx`
- `src/app/analysis/growth-rate/page.tsx`
- `src/app/input/changes-in-working-capital/page.tsx` (multi-year matrix refactor)
- `src/data/live/{compute-roic-live,compute-growth-rate-live,compute-cash-flow-live}.ts`
- `src/data/manifests/roic.ts` (label + docstring)
- `src/data/seed/fixtures/roic.json` + `__tests__/fixtures/roic.json` (string rename)
- `src/components/layout/{nav-tree,ExportButton}.tsx`
- `src/lib/i18n/translations.ts` (+65 keys)
- `__tests__/helpers/pt-raja-voltama-state.ts` (+24 LOC for 3 slices)
- `__tests__/lib/store/store-migration.test.ts` (+50 LOC for 3 new migration cases)
- `__tests__/data/live/compute-roic-live.test.ts` (mock IC scope)
- `__tests__/lib/export/sheet-builders/{roic,growth-rate}.test.ts` (fixtures updated)

## Next Session Recommendation

**Session 056 — Cluster C (Financing)**:
1. User visual QA on Cluster AB first (5 user-visible changes): sidebar grouping, IC/CB/CA editors accessible + persistent, ROIC/GR/CFS gated correctly when scopes null
2. Build `/input/financing` scope editor — pool = BS equity + IS interest_income + IS interest_expense + IS non_operating. Scope assigns accounts to 5 CFS FINANCING rows (Equity Injection / New Loan / Interest Payment / Interest Income / Principal Repayment). User specified this as 1 unified list — clarify whether 1 list across 5 rows with per-row dropdown OR 5 separate lists.
3. `computeFinancing` helper pure function
4. CFS rewire: replace remaining hardcoded references (IS rows 26/27, AP rows 10/19/20) with financing-scope reads
5. Deploy + wrap-up as usual

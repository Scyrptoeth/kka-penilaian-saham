# Session 039 — Changes in Working Capital Required-Gate + DCF Inline Breakdown

**Date**: 2026-04-18
**Scope**: Fix ΔCA/ΔCL = 0 bug in Cash Flow Statement for dynamic-catalog
users; introduce required-gate `/analysis/changes-in-working-capital`
page with user-controlled exclusion scope; add inline breakdown rows
to DCF page so users can see how FCF, Total PV, and Equity Value (100%)
are derived without formulas exposed.
**Branch**: feat/wc-scope-page-and-dcf-breakdown

## Goals (from Langkah 3 — Design + Plan)
- [x] Task 1: Store v17→v18 migration + WC scope setters
- [x] Task 2: Rewrite computeCashFlowLiveRows to be account-driven
- [x] Task 3: Rewrite computeProyCashFlowLive with same pattern
- [x] Task 4: Thread WC slice through upstream-helpers + all consumers
- [x] Task 5: Create /analysis/changes-in-working-capital page + trivia + i18n
- [x] Task 6: Sidebar nav item above Cash Flow Statement
- [x] Task 7: PageEmptyState required-gate on 9 consumer pages
- [x] Task 8: ExportableState + UpstreamSlice + builder propagation
- [x] Task 9: DCF page inline breakdown rows
- [x] Task 10: Full verification + push

## Delivered

### Task 1 — Store v17→v18
Root-level slice `changesInWorkingCapital: { excludedCurrentAssets:
number[]; excludedCurrentLiabilities: number[] } | null`. Setters
`toggleExcludeCurrentAsset`, `toggleExcludeCurrentLiability`,
`confirmWcScope` (null → empty-exclusion object), `resetWcScope`.
Chain migration v17→v18 defaults to null. +3 TDD cases.

### Task 2 — `computeCashFlowLiveRows` account-driven
Deleted hardcoded `BS_CA_ROWS = [10, 11, 12, 14]` and
`BS_CL_ROWS = [31, 32, 33, 34]`. New signature:
```ts
computeCashFlowLiveRows(bsAccounts, bsRows, isLeaves, faLeaves,
  apRows, cfsYears, bsYears, excludedCA, excludedCL)
```
Filters `bsAccounts` by `section === 'current_assets'` minus
excludedCA set. Same for CL. Cash rows 8/9 no longer hardcoded — user
decides via the WC scope page. Exported helper `resolveWcRows`
(LESSON-110) for shared use. +6 TDD cases for extended-catalog
aggregation, custom-row aggregation, CA exclusion, CL exclusion,
empty-accounts no-op, Cash Balance row independence. 12 callers
migrated (5 sheet-builders, 4 views, 2 pages, 1 upstream helper).

### Task 3 — `computeProyCashFlowLive` mirror
Same account-driven rewrite applied. Also fixed pre-existing bug from
Session 036: PROY CFS hardcoded PROY BS template rows 13/15/17/19 but
`computeProyBsLive` outputs keyed by USER excelRow — so the old
compute was broken for PT Raja-equivalent users all along. Cash
Ending now reads PROY BS rows 8+9 (user standard) not template rows
9+11. Test fixture reconstructs PT Raja scenario with user-keyed
proyBsRows + `excludedCA = [8, 9, 13]` — 15/15 pass.

### Task 4 — Pipeline threading
`computeFullProjectionPipeline` + `computeHistoricalUpstream` accept
optional `changesInWorkingCapital` + `balanceSheetAccounts`. 14
consumer files updated (builders: proy-cfs, proy-lr, proy-noplat,
proy-fa, proy-bs, dcf, cfi, dashboard, eem; pages: projection cash-flow,
dashboard, simulasi-potensi, dcf, cfi).

### Task 5 — `/analysis/changes-in-working-capital` page
New required-gate page mirroring IBD layout. Two sections (CA + CL)
each listing user's BS accounts with trash icon to exclude from Operating
WC scope. Collapsible "Dikecualikan" section per section with restore
icon. Sticky "Konfirmasi Cakupan" / "Perbarui Cakupan" button at bottom
transitions store slice from null → object. Trivia block bilingual
EN/ID with light+dark compliance:
- Intro on Operating Working Capital concept
- Negative list CA: Cash, ST Investments, Non-Trade Recv, Derivatives
- Negative list CL: ST Bank Loans, Current Portion LTD, Interest
  Payable, Dividends Payable
- Positive list CA: AR, Inventory, Prepaid
- Positive list CL: AP, Accrued, Unearned Revenue

~55 new i18n keys (`nav.item.changesInWorkingCapital` + `wc.*` hierarchy).

### Task 6 — Sidebar nav item
Added "Changes in Working Capital" / "Perubahan Modal Kerja" in
ANALYSIS group, positioned immediately above Cash Flow Statement
because WC scope is a prerequisite for correct CFS ΔWC.

### Task 7 — Required-gate 9 pages
Extended `PageEmptyState` input lists + useMemo null guards on:
- `/analysis/cash-flow-statement` — direct ΔCA/ΔCL consumer
- `/analysis/fcf` — FCF = NOPLAT + Dep − ΔWC − CapEx
- `/analysis/financial-ratio` — CFO-based ratios
- `/valuation/dcf` — FCF chain
- `/valuation/eem` — transitive via DCF
- `/valuation/cfi` — CFO-based
- `/valuation/simulasi-potensi` — transitive via DCF share value
- `/dashboard` — charts
- `/projection/cash-flow` — projected ΔWC

All 9 pages now block render until user visits WC scope page and
clicks "Konfirmasi Cakupan".

### Task 8 — Export pipeline
`UpstreamSlice` union + `ExportableState` extended with
`'changesInWorkingCapital'`. `isPopulated` special-cases non-null
check. 9 sheet-builder upstream arrays extended. 8 metadata test
assertions updated. Phase C 5/5 preserved.

### Task 9 — DCF inline breakdown
`/valuation/dcf/page.tsx` exposes `dcfInput` alongside `dcfResult` in
data memo. Three sections get permanent inline breakdown rows (style
`pl-12`, `text-ink-muted`, `text-sm`, monospace):

1. **FCF per year** (4 rows × 5 components):
   NOPLAT + Depreciation + (Inc)/Dec Current Asset +
   Inc/(Dec) Current Liabilities + Capital Expenditures
2. **Total PV of FCF** (3 rows): PV of FCF per projected year
3. **Equity Value (100%)** (4 rows BEFORE headline):
   Enterprise Value + (− IBD) + Surplus Asset Cash + Idle Non-Op Asset

No formula text — labels + read-only values only, per user spec. +10
i18n keys. Zero new calc logic — pure UI addition using `buildDcfInput()`
pre-signed components.

## Verification
```
Tests:     1222 / 1222 passing + 1 skipped (102 files)
Build:     ✅ 41 static pages prerendered (new: /analysis/changes-in-working-capital)
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings (React Compiler + local/no-hardcoded-ui-strings)
Audit:     ✅ zero i18n violations
Phase C:   ✅ 5/5 gates green (state parity + coverage invariant)
Cascade:   ✅ 3/3 (29/29 MIGRATED_SHEETS)
```

## Stats
- Commits: 9 (on feat/wc-scope-page-and-dcf-breakdown)
- Files changed: 53
- Lines: +1482 / −228
- Test cases added: 26 (3 migration + 6 WC CA/CL + 15 PROY CFS + 2 re-use — net after assertions updated)
- New store version: v18
- New i18n keys: ~65 (nav + wc.* + dcf.break.*)

## Deviations from Plan
- **Task 5 LESSON-081 strike**: first commit attempt for Task 5 used
  `git add -A` which accidentally staged screenshots + xlsx lock file.
  Reset soft + re-staged explicit paths, re-committed clean. No
  production impact but reinforces LESSON-081.
- **Pre-existing bug discovered** in `computeProyCfsLive` (Session 036
  leftover) — repaired opportunistically during Task 3. Not in
  original plan but within spirit (account-driven consistency).

## Deferred
- No items deferred. All 10 planned tasks completed in-session.
- Task 10 included push to feature branch only. Merge to `main` is
  user's discretion via PR at
  `https://github.com/Scyrptoeth/kka-penilaian-saham/pull/new/feat/wc-scope-page-and-dcf-breakdown`.

## Lessons Extracted
- [LESSON-108](../lessons-learned.md#lesson-108): Account-driven
  aggregation replaces hardcoded row lists (PROMOTED)
- [LESSON-109](../lessons-learned.md#lesson-109): React Fragment
  inside Array.map() needs explicit `<Fragment key={...}>` (local only)
- [LESSON-110](../lessons-learned.md#lesson-110): Export shared
  row-filter helper when historical + projection compute must share
  semantic (PROMOTED)

Also: durable user preference saved to memory
(`feedback_system_over_prototype.md`) — "prioritize system calculation
correctness over 100% value-match with Excel prototipe workbook".

## Files & Components Added/Modified

```
src/app/analysis/changes-in-working-capital/page.tsx        [NEW]
src/data/live/compute-cash-flow-live.ts                     [REWRITE — account-driven]
src/data/live/compute-proy-cfs-live.ts                      [REWRITE — account-driven]
src/lib/store/useKkaStore.ts                                [v17→v18 migration + slice]
src/lib/export/export-xlsx.ts                               [ExportableState + changesInWorkingCapital]
src/lib/export/sheet-builders/types.ts                      [UpstreamSlice]
src/lib/export/sheet-builders/populated.ts                  [isPopulated special-case]
src/lib/export/sheet-builders/{cfs,fcf,fr,dcf,eem,cfi,simulasi-potensi,dashboard,proy-cfs}.ts  [upstream + WC propagation]
src/lib/calculations/upstream-helpers.ts                    [WC threading]
src/lib/calculations/projection-pipeline.ts                 [WC threading]
src/lib/i18n/translations.ts                                [+65 keys]
src/components/layout/nav-tree.ts                           [nav item]
src/components/layout/ExportButton.tsx                      [ExportableState field]
src/components/analysis/{CashFlow,Fcf,FinancialRatio,Roic}LiveView.tsx  [WC wiring]
src/app/valuation/{dcf,eem,cfi,simulasi-potensi}/page.tsx   [WC gate + wiring]
src/app/dashboard/page.tsx                                  [WC gate + wiring]
src/app/projection/cash-flow/page.tsx                       [WC gate + wiring]
src/app/analysis/growth-rate/page.tsx                       [WC wiring]
src/app/valuation/dcf/page.tsx                              [+inline breakdown rows]
__tests__/data/live/compute-cash-flow-live.test.ts          [+6 new cases + PT Raja scenario]
__tests__/data/live/compute-proy-cfs-live.test.ts           [rewrite — account-driven fixture]
__tests__/data/live/compute-{fcf,roic,financial-ratio}-live.test.ts  [PT Raja scenario injection]
__tests__/lib/export/sheet-builders/*.test.ts               [upstream assertions +changesInWorkingCapital]
__tests__/lib/store/store-migration.test.ts                 [+3 v17→v18 cases]
```

## Next Session Recommendation

Carry-over from Session 039 backlog (unchanged from Session 038 end):
1. **Proy BS extended account injection** (excelRow ≥ 100 + custom
   ≥ 1000) — mirror Session 025 BS extended pattern for PROY BALANCE
   SHEET
2. **Proy FA extended account injection** — mirror Session 028 FA
   7-band slot allocation pattern
3. **KEY DRIVERS dynamic `additionalCapexByAccount` injection** —
   dedicated injector in KeyDriversBuilder (cell-mapping entries
   removed Session 036 T8)
4. **Sign convention reconciliation** — 21 whitelisted KD
   cogsRatio/sellingExpenseRatio/gaExpenseRatio cells (deferred since
   Session 035)
5. **AAM extended-account native injection** (excelRow ≥ 100)
6. **Optional cleanup**: drop `isIbdAccount()` classifier from AAM
   CL/NCL display split (calc-inert since Session 038)
7. **RESUME page** — final side-by-side summary AAM / DCF / EEM per
   share
8. **Merge `feat/wc-scope-page-and-dcf-breakdown` to main** (user
   decision after preview deploy review)

New emergent priority post-Session-039:
9. **Grep audit for other hardcoded row-number lists** (`const *_ROWS =
   [\d, \d, \d]` pattern) in other compute modules — any remaining
   latent LESSON-108 bugs for dynamic-catalog users. Candidates:
   `computeNoplatLiveRows`, `computeFcfLiveRows`, FR ratios, ROIC.

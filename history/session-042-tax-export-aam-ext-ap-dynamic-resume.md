# Session 042 — IS Tax Adjustment Export + AAM Extended Injection + LESSON-108 Audit + AP Dynamic Catalog + RESUME Page

**Date**: 2026-04-18
**Scope**: Close 5 deferred priorities from Session 041 backlog in a single
full-scope agresif session: export synthetic Koreksi Fiskal / TAXABLE
PROFIT rows to IS, extend AAM to host extended BS accounts, audit for
hardcoded row lists in compute modules, promote AccPayables to dynamic
catalog (4th and final), and ship a RESUME summary page.
**Branch**: `feat/session-042-tax-export-aam-ext-ap-dynamic-resume` →
fast-forward merged into `main`.

## Goals (from plan.md, all 5 user tasks delivered)
- [x] Task 1: IS Tax Adjustment export (rows 600/601) via new helper
- [x] Task 2a: AAM template probe — documented existing template rows + unused synthetic slots
- [x] Task 2b: AAM extended-account injection with IBD-aware routing + subtotal append
- [x] Task 3: LESSON-108 grep audit — clean, zero violations
- [x] Task 4a: AP catalog foundation + store v19→v20 migration
- [x] Task 4b: DynamicApEditor UI + page rewrite
- [x] Task 4c: AP extended injection export (band layout)
- [x] Task 5: RESUME page `/dashboard/resume` with 3-way comparison + methodology + recommendation
- [x] Task 6: Final verification — all gates green

## Delivered

### Task 1 — IS Tax Adjustment Export (rows 600/601)
- `injectTaxAdjustmentRows(workbook, state)` in `export-xlsx.ts` writes label + value for KOREKSI_FISKAL (600) and label + formula for TAXABLE_PROFIT (601)
- Row 600: plain static value from `state.incomeStatement.rows[600]`
- Row 601: live Excel formula `=<col>32+<col>600` with `result` cache = pre-computed TAXABLE PROFIT value
- Bilingual labels honor `state.incomeStatement.language` via existing `getIsStrings`
- Wired into `IncomeStatementBuilder.build` after existing extended injection chain
- Tax (33) + NPAT (35) template formulas UNCHANGED per LESSON-116

### Task 2 — AAM Extended Injection
- New module `src/lib/export/aam-extended.ts` with `injectAamExtendedAccounts`
- 7 synthetic row bands per section (20 slots each): CA 100-119, NCA 120-139, CL-IBD 140-159, CL-nIBD 160-179, NCL-IBD 180-199, NCL-nIBD 200-219, Equity 220-239
- Per extended account: label B, BS value C (static, for tahunTransaksi-1), adjustment D (from aamAdjustments), formula E = `C{row}+D{row}`
- IBD vs non-IBD routing via `state.interestBearingDebt.excludedCurrentLiabilities` / `excludedNonCurrentLiabilities` — single source of truth (LESSON-119 applied)
- Subtotal `+SUM(extendedRange)` append across used bands (rows 16/22/32/37/47)
- Row 51 NAV append `-SUM(E{range})` for non-IBD CL + NCL bands
- Row 52 IBD append `+SUM(C{range})` for IBD CL + NCL bands
- AppendedRange separates `cellCol` from `sumCol` — template row 52 formula at E52 references col C, so the SUM range also uses col C even though the formula cell is in col E
- Wired into `AamBuilder.build` after existing label + adjustment writes
- +8 TDD cases covering routing, subtotal append, NAV/IBD append, empty-state, custom labels, equity extension

### Task 3 — LESSON-108 Grep Audit
- Scanned `src/lib/calculations/` and `src/data/live/` for hardcoded `const *_ROWS = [N, N, N]` patterns
- **Zero violations** in NOPLAT/FCF/FR/ROIC — Session 039 + 041 refactors were comprehensive
- Legitimate exceptions documented:
  - `BS_CASH_ROWS = [8, 9]` in `compute-cash-flow-live.ts` — Cash Beginning/Ending is a specific line item (not an aggregation over dynamic accounts). Inline comment explains the intent.
  - `DLOM_ANSWER_ROWS` + `DLOC_ANSWER_ROWS` in `cell-mapping.ts` — questionnaire sheets have fixed structure (not dynamic)
- No code change needed; audit result preserved in this session history

### Task 4 — AccPayables Dynamic Catalog
- **Type refactor** (`src/data/live/types.ts`): `AccPayablesInputState = { rows }` → `{ schedules: ApSchedule[], rows }`. New exports: `ApSection` + `ApSchedule`.
- **New catalog** (`src/data/catalogs/acc-payables-catalog.ts`): `AP_BANDS` 2-section × 3-band encoding, `apRowFor()` helper, `computeApSentinels()` persist-time Beg/End pre-compute, `createDefaultApState()`, `DEFAULT_AP_SCHEDULES`
- **Store migration** v19→v20 (`useKkaStore.ts` + `STORE_VERSION`): promotes old flat `{ rows }` shape to schedule shape; folds old rows 11+20 (Repayment) into 10+19 (Addition) as signed sum; drops rows 14+23 (Interest Payable) — not consumed downstream
- **Page rewrite** (`src/app/input/acc-payables/page.tsx`): DynamicApEditor with +Add schedule per section, inline rename, remove button, 3-row mini-grid (Beg read-only, Addition editable, End read-only with formula representation via sentinel). Deterministic schedule id `${section}_slot${N}` (react-hooks/purity compliant). Debounced 500ms persist with sentinel pre-compute.
- **Export builder** (`src/lib/export/sheet-builders/acc-payables.ts`): full rewrite iterating schedules; writes Beg static + Addition leaf + End live formula `=<col>{beg}+<col>{add}` with cached result. Custom labels at col B across all 3 bands for extended schedules.
- **Cell mapping** (`src/lib/export/cell-mapping.ts`): AP grid `leafRows` narrowed to `[10, 19]` (baseline Addition rows) — extended Addition + all Beg/End writes handled by builder via schedule iteration
- **Phase C fixture** (`__tests__/helpers/pt-raja-voltama-state.ts`): updated to include default 2 schedules (LESSON-118 applied)
- i18n keys added: ~7 (schedule.default template, add ST/LT buttons, remove/rename aria, addition.helper)
- +14 net TDD cases (9 catalog + 3 migration + 12 builder − 10 obsolete removed)

### Task 5 — RESUME Page
- New route `/dashboard/resume` (included in build: 42 static pages)
- Pure display via `useMemo`: composes `buildAamInput`, `buildDcfInput`, `buildBorrowingCapInput`, `buildEemInput` + downstream `compute*` — zero new calc
- 3-column × 3-row comparison table: AAM / DCF / EEM × (Equity Value 100%, Equity Value Proporsi Saham, Per-Share Value)
- 3 Metodologi cards (1 bilingual paragraf each): AAM (Adjusted Asset Method), DCF (Discounted Cash Flow), EEM (Excess Earning Method)
- Rekomendasi Nilai: min/midpoint/max range from per-share values + PMK-79 professional judgment disclaimer
- Required-gates via PageEmptyState on HOME + BS + IS + FA + KD + DR + IBD + WC
- Nav entry added to `nav-tree.ts` under `nav.group.summary`
- ~28 new i18n keys (`resume.*` prefix)

## Verification

```
Tests:     1288 / 1288 passing + 1 skipped  (104 files; +27 net since Session 041 end of 1261)
Build:     ✅ 42 static pages, compiled cleanly
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings (React Compiler + local/no-hardcoded-ui-strings)
Audit:     ✅ 0 i18n violations
Phase C:   ✅ 5/5 gates green
Cascade:   ✅ 29/29 MIGRATED_SHEETS
```

## Stats

- Commits on feature branch: 5 (Task 1, 2, 4 combined, 5) + final docs commit
- Files touched: ~25 across src + tests + docs
- LOC: +3383 / −562 (net +2821)
- Test cases added: +27 net (1261 → 1288)
- New helpers / modules:
  - `injectTaxAdjustmentRows` (export-xlsx)
  - `injectAamExtendedAccounts` (new aam-extended.ts)
  - `AP_BANDS`, `apRowFor`, `computeApSentinels`, `createDefaultApState` (new acc-payables-catalog.ts)
  - Resume page with 3-way summary
- Store version: v19 → v20

## Deviations from Plan

- **Task 1 design**: original plan added `tax_adjustment` to `IS_SECTION_INJECT`. Actual implementation created a standalone `injectTaxAdjustmentRows` helper — cleaner semantic because rows 600/601 don't fit the section-sentinel-replacement pattern (no section-level aggregation behavior).
- **AAM AppendedRange refinement**: initial implementation used a single `col` field for both cell location and SUM range. Discovered during RED-GREEN cycle that row 52 IBD formula at E52 uses col C for references. Split into `cellCol` + `sumCol`.
- **AP Opsi B simplification**: dropped the explicit "Reduction" band per user selection Opsi 5b=A (3 bands: Beg/Add/End). Repayment is implicit as negative Addition. This produced a simpler migration path and keeps downstream CFS consumers unchanged (row 10 + 19 still represents net financing flow).

## Deferred

- Upload parser (.xlsx → store) — out of scope this session
- Dashboard polish with projected FCF chart using NV-growth model
- Multi-case management / cloud sync

## Lessons Extracted

- LESSON-120 (local): AAM subtotal append pattern must decouple formula cell column from SUM range column — row 52 formula at E52 references col C, so `+SUM(C140:C159)` appended to E52's formula. Stored in session history for future multi-column append contexts.
- LESSON-121 (local): Dynamic catalog sentinel pattern is now proven across 4 consumers (BS, IS, FA, AP) with consistent shape: persist-time pre-compute of non-leaf rows, write both leaves + sentinels to store, export formula-band writes live formulas with cached result from sentinel. Template remains source of truth for cross-sheet refs.

## Files Added/Modified

```
src/lib/export/export-xlsx.ts                            [MODIFIED — +injectTaxAdjustmentRows]
src/lib/export/sheet-builders/income-statement.ts        [MODIFIED — wires Task 1 injector]
src/lib/export/sheet-builders/aam.ts                     [MODIFIED — wires Task 2 injector]
src/lib/export/sheet-builders/acc-payables.ts            [REWRITE — schedule-aware writer]
src/lib/export/aam-extended.ts                           [NEW — Task 2 injector module]
src/lib/export/cell-mapping.ts                           [MODIFIED — AP leafRows narrowed]
src/data/catalogs/acc-payables-catalog.ts                [NEW — AP bands + sentinel helper]
src/data/live/types.ts                                   [MODIFIED — ApSchedule + new shape]
src/lib/store/useKkaStore.ts                             [MODIFIED — v19→v20 migration, STORE_VERSION=20]
src/app/input/acc-payables/page.tsx                      [REWRITE — DynamicApEditor]
src/app/dashboard/resume/page.tsx                        [NEW — RESUME summary page]
src/components/layout/nav-tree.ts                        [MODIFIED — resume nav entry]
src/lib/i18n/translations.ts                             [MODIFIED — +~35 keys]

__tests__/lib/export/sheet-builders/income-statement.test.ts  [MODIFIED — +5 TDD Task 1]
__tests__/lib/export/sheet-builders/aam.test.ts               [MODIFIED — +8 TDD Task 2]
__tests__/lib/export/sheet-builders/acc-payables.test.ts      [REWRITE — +12 schedule tests]
__tests__/data/catalogs/acc-payables-catalog.test.ts          [NEW — 9 TDD for catalog]
__tests__/lib/store/store-migration.test.ts                   [MODIFIED — +3 v19→v20 cases]
__tests__/helpers/pt-raja-voltama-state.ts                    [MODIFIED — AP schedule shape]

design.md                                                [MODIFIED — Session 042 scope]
plan.md                                                  [MODIFIED — 9 tasks]
progress.md                                              [REWRITTEN]
history/session-042-tax-export-aam-ext-ap-dynamic-resume.md  [NEW]
```

## Next Session Recommendation

1. **Upload parser (.xlsx → store)** — reverse direction. Needs IBD scope adapter (null-on-upload or trust mode) + AP schedule shape adapter. Discuss with user before starting.
2. **Dashboard polish** — projected FCF chart with Session 036 NV-growth model.
3. **Multi-case management** (multiple companies in one localStorage) — architectural question.

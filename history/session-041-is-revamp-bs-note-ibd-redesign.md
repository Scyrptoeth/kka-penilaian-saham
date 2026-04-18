# Session 041 — IS Revamp + BS Koreksi Fiskal Note + IBD Scope-Page Redesign

**Date**: 2026-04-18
**Scope**: Five coordinated user-facing changes resolving gaps in Income
Statement input UX, Balance Sheet guidance, and Interest Bearing Debt
valuation scope. Single store v18→v19 migration carries three of the
five changes.
**Branch**: `feat/session-041-is-revamp-bs-note-ibd-redesign` →
fast-forward merged into `main` (commit `f680d7b`).

## Goals (from Langkah 3 — Refined Spec, all 5 user tasks delivered)
- [x] Task 1: Depreciation IS row 21 read-only mirror from FA Total Additions
- [x] Task 2: Bilingual "Koreksi Fiskal" tax-impact note at BS page bottom
- [x] Task 3: Split `net_interest` → `interest_income` + `interest_expense` with PSAK-aligned default catalogs
- [x] Task 4: Insert Fiscal Correction (signed leaf) + TAXABLE PROFIT (computed) between PBT and Tax
- [x] Task 5: Redesign IBD page mirroring CWC scope-editor UX; remove `isIbdAccount` classifier

## Delivered

### Task 1 — Depreciation IS read-only mirror from FA
- New helper `computeDepreciationFromFa(faRows)` in
  `src/lib/calculations/derive-depreciation.ts` reads FA row 51
  (TOTAL_DEP_ADDITIONS), negates per LESSON-055, returns `{ 21: YearKeyedSeries }`.
- `DynamicIsEditor.tsx` injects FA cross-ref at persist time + via useEffect
  on FA change. Mirrors LESSON-058 BS-from-FA pattern.
- `buildDynamicIsManifest` row 21 marked `type: 'cross-ref'` →
  RowInputGrid renders read-only.
- `IS_FIXED_LEAF_ROWS` drops 21; only TAX (33) remains user-editable
  fixed leaf. `IS_COMPUTED_SENTINEL_ROWS` automatically includes 21.
- 6 TDD cases for the helper.

### Task 2 — BS page Koreksi Fiskal tax-impact note
- `KoreksiFiskalNote` aside in `DynamicBsEditor.tsx` at the bottom (after
  Reset buttons). Mirror AAM cross-ref note styling
  (`border-l-2 border-accent bg-canvas-raised/40`).
- 4 i18n keys bilingual EN/ID: heading, intro, positive case, negative case.
- Tiny `**phrase**` markdown-bold parser keeps i18n strings declarative —
  no `dangerouslySetInnerHTML`.

### Task 3 — Split Interest Income / Interest Expense
- Catalog refactor (`income-statement-catalog.ts`): `IsSection` drops
  `'net_interest'`, adds `'interest_income' | 'interest_expense'`. Drops
  the `interestType` discriminator field. PSAK-aligned defaults: 6 income
  accounts (rows 500-519, PSAK 71/IFRS 9) + 7 expense accounts (rows
  520-539, IAS 23 borrowing costs).
- Each section gets its own `+Add` dropdown — eliminates the previous
  misclassification trap where income accounts ended up under EXPENSE.
- Manifest builder `buildDynamicIsManifest` rebuilt to use 2 add-buttons.
- `IS_SECTION_INJECT` (export pipeline): both new sections now use
  SUM-formula sentinel replacement (single-sign). LESSON-077 mixed-sign
  exception removed.
- DEFAULT_IS_ACCOUNTS uses new catalog IDs `time_deposit_interest` (income
  default) + `bank_loan_interest` (expense default).

### Task 4 — Koreksi Fiskal + TAXABLE PROFIT between PBT and Tax
- New synthetic sentinel rows: `KOREKSI_FISKAL = 600` (signed
  user-editable leaf, added to `IS_FIXED_LEAF_ROWS`), `TAXABLE_PROFIT = 601`
  (computed `[PBT, KOREKSI_FISKAL]`, in `IS_COMPUTED_SENTINEL_ROWS`).
- Manifest order: `... PBT (32) → Koreksi (600) → TAXABLE PROFIT (601) →
  Tax (33) → NPAT (35)`.
- Tax + NPAT formulas UNCHANGED (Q3 design decision — backward compat
  for KEY DRIVERS / NOPLAT / downstream row-number references).
- 2 i18n strings added to `IsStrings` interface (EN: "Fiscal Correction" /
  "TAXABLE PROFIT"; ID: "Koreksi Fiskal" / "LABA KENA PAJAK").

### Task 5 — IBD page redesign mirroring CWC + isIbdAccount cleanup
- Store schema v18→v19: `interestBearingDebt: number | null` →
  `{excludedCurrentLiabilities: number[], excludedNonCurrentLiabilities: number[]} | null`.
  Migration drops legacy numeric values to null (Q5 default — clean state,
  user re-confirms via redesigned page).
- New page `/valuation/interest-bearing-debt`: lists all CL+NCL accounts
  read-only with trash icon to mark NOT-IBD. Live IBD total preview.
  Mirror UX of `/analysis/changes-in-working-capital` (Confirm/Update
  button, sticky footer, collapsible "Excluded" section, restore icon).
- New helper `computeInterestBearingDebt(input)` in `upstream-helpers.ts`
  derives total from BS data minus exclusion set (POSITIVE per AAM/DCF/EEM
  convention; sign reconciled at builder boundaries per LESSON-011).
- `buildAamInput` extended with `excludedCurrentLiabIbd` + `excludedNonCurrentLiabIbd`
  optional ReadonlySet params. AAM CL/NCL display split now driven by
  these sets — `excludedXxx` accounts → NON-IBD, remaining → IBD.
  Single source of truth for both NAV math and visual subtotals.
- 6 consumer pages updated (AAM/DCF/EEM/CFI/Simulasi/Dashboard) +
  3 sheet-builders (DCF/EEM/CFI) updated to compute `ibdAmount` via the
  new helper.
- **`isIbdAccount` classifier removed from BS catalog** (LESSON-074
  closed). 15 LOC + 1 export deleted.

### Store v18→v19 migration (chained, three coordinated effects)
1. Clear `incomeStatement.rows[21]` → FA wins as authoritative source for
   Depreciation (Task 1).
2. Relocate `net_interest` accounts → `interest_income` /
   `interest_expense` via legacy `interestType` field (Task 3).
3. Drop legacy numeric `interestBearingDebt` → null → force user
   re-confirm via redesigned scope page (Task 5).

## Verification

```
Tests:     1261 / 1261 passing + 1 skipped  (102 files; +11 net since Session 040)
Build:     ✅ 41 static pages, compiled cleanly
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings (React Compiler + local/no-hardcoded-ui-strings)
Audit:     ✅ 0 i18n violations (`npm run audit:i18n`)
Phase C:   ✅ 5/5 gates green (state parity + coverage invariant)
Cascade:   ✅ 3/3 (29/29 MIGRATED_SHEETS)
```

## Stats

- Commits on feature branch: 1 (squashed `f680d7b`)
- Files changed: 27 (10 source pages + 6 source libs + 4 source data/i18n +
  6 test files + 1 fixture helper)
- Lines: +1296 / −360
- Test cases added: +11 net (8 new derive-depreciation + 4 new v18→v19
  migration cases + 2 new IS manifest cases + 6 catalog/test fixture
  updates − 5 obsolete tests adjusted)
- New helpers: `computeDepreciationFromFa`, `computeInterestBearingDebt`
- Store version: v18 → v19
- New i18n keys: ~17 (4 BS Koreksi note + 11 IBD scope page + 2 IS
  Koreksi/TAXABLE labels)

## Deviations from Plan

- **Task 5 schema migration cascaded into 6 consumer pages + 3 sheet-builders**
  rather than a localized page rewrite. Anticipated, but the explicit
  audit (after typecheck flagged 9 errors at once) confirmed every IBD
  consumer was reachable through `state.interestBearingDebt` typed as
  `number | null`. Mass-update via shared `computeInterestBearingDebt`
  helper kept the diff small and centralized.
- **`isIbdAccount` cleanup** delivered same session per Q6 — original
  estimate considered deferring as separate Session 042 task. Inline
  cleanup proved trivial because the AAM display split is the only
  remaining consumer; it now uses the same `excludedXxx` Sets as the
  NAV math.
- **PT Raja Voltama Phase C fixture missed two required fields**
  (interestBearingDebt + changesInWorkingCapital both absent) — caught
  at test runtime, not typecheck. ExportableState fields are typed but
  fixture predates their addition. Added LESSON-118.

## Deferred

- AAM extended-account injection (excelRow ≥ 100) — unchanged from
  Session 040 backlog.
- LESSON-108 grep audit of other compute modules — unchanged.
- AccPayables extended catalog — unchanged.
- Upload parser (.xlsx → store) — unchanged (will need IBD-scope adapter
  reverse-direction logic).
- RESUME page — unchanged.
- Excel export of Koreksi Fiskal + TAXABLE PROFIT to extended IS rows —
  not in scope this session, defer to Session 042.

## Lessons Extracted

- [LESSON-114](../lessons-learned.md#lesson-114): Section split refactor must touch every place that references the old section name atomically (promoted)
- [LESSON-115](../lessons-learned.md#lesson-115): Cross-sheet read-only sentinel pattern — generalize BS-from-FA (LESSON-058) for IS-from-FA (promoted)
- [LESSON-116](../lessons-learned.md#lesson-116): Synthetic sentinel rows ≥ 600 preserve downstream backward compatibility — never renumber existing template rows (promoted)
- [LESSON-117](../lessons-learned.md#lesson-117): Markdown-bold parser for trivia strings — declarative + safe (lessons-learned.md only)
- [LESSON-118](../lessons-learned.md#lesson-118): Store schema migration must also update Phase C fixture helpers — typecheck does not catch missing nullable fields (promoted)
- [LESSON-119](../lessons-learned.md#lesson-119): User-curated exclusion list is the single source of truth for both compute AND display — never retain a heuristic classifier "for display only" (promoted)

## Files Added/Modified

```
src/app/valuation/interest-bearing-debt/page.tsx              [REWRITE — 512 lines net change]
src/app/valuation/aam/page.tsx                                [MODIFIED]
src/app/valuation/dcf/page.tsx                                [MODIFIED]
src/app/valuation/eem/page.tsx                                [MODIFIED]
src/app/valuation/cfi/page.tsx                                [MODIFIED]
src/app/valuation/simulasi-potensi/page.tsx                   [MODIFIED]
src/app/dashboard/page.tsx                                    [MODIFIED]
src/components/forms/DynamicBsEditor.tsx                      [MODIFIED + KoreksiFiskalNote]
src/components/forms/DynamicIsEditor.tsx                      [MODIFIED + dep cross-ref]
src/data/catalogs/balance-sheet-catalog.ts                    [MODIFIED — isIbdAccount removed]
src/data/catalogs/income-statement-catalog.ts                 [MODIFIED — section split + sentinels]
src/data/manifests/build-dynamic-is.ts                        [REWRITE — 2 +Add buttons + Koreksi/TAXABLE]
src/lib/calculations/derive-depreciation.ts                   [NEW]
src/lib/calculations/upstream-helpers.ts                      [MODIFIED + computeInterestBearingDebt]
src/lib/export/export-xlsx.ts                                 [MODIFIED — IBD type + IS_SECTION_INJECT split]
src/lib/export/sheet-builders/dcf.ts                          [MODIFIED — ibdAmount via helper]
src/lib/export/sheet-builders/eem.ts                          [MODIFIED — ibdAmount + exclusion sets]
src/lib/export/sheet-builders/cfi.ts                          [MODIFIED — ibdAmount via helper]
src/lib/i18n/income-statement.ts                              [MODIFIED — koreksiFiskal + taxableProfit + interest_* labels]
src/lib/i18n/translations.ts                                  [MODIFIED — +17 keys]
src/lib/store/useKkaStore.ts                                  [MODIFIED — v18→v19 migration + IBD setters]

__tests__/lib/calculations/derive-depreciation.test.ts        [NEW — 6 cases]
__tests__/data/catalogs/income-statement-catalog.test.ts      [MODIFIED — section split assertions]
__tests__/data/manifests/build-dynamic-is.test.ts             [MODIFIED — 2 +Add buttons + Koreksi]
__tests__/lib/store/store-migration.test.ts                   [MODIFIED — v18→v19 cases]
__tests__/lib/export/export-xlsx.test.ts                      [MODIFIED — interest sections SUM-formula]
__tests__/helpers/pt-raja-voltama-state.ts                    [MODIFIED — IBD + WC fields added]
```

## Next Session Recommendation

Carrying over from Session 040 + 041 backlog (priority order updated):

1. **Excel export of Koreksi Fiskal + TAXABLE PROFIT to extended IS rows** —
   Session 041 added them at synthetic rows 600/601 in the website, but
   export pipeline does not yet write these synthetic rows to the IS
   sheet. Mirror Session 028 IS_SECTION_INJECT pattern with a new
   `tax_adjustment` section (rows 600-619) that writes labels + values
   at the END of the IS template (after row 35 NPAT).
2. **AAM extended-account native injection** (excelRow ≥ 100) — mirror
   Session 031 AAM builder pattern, honoring per-row Penyesuaian.
3. **LESSON-108 grep audit** — scan `computeNoplatLiveRows`,
   `computeFcfLiveRows`, FR ratios, ROIC for hardcoded
   `const *_ROWS = [N, N, N]` patterns.
4. **AccPayables extended catalog** — complete the 4th dynamic catalog.
5. **Upload parser (.xlsx → store)** — reverse direction. Now needs to
   reconstruct IBD exclusion list from a numeric IBD total → not directly
   possible. Two options: (a) leave IBD scope null on upload, force user
   to re-confirm; (b) add a "trust" mode that preserves the upload's
   numeric IBD as a single virtual exclusion entry.
6. **RESUME page** — final side-by-side AAM/DCF/EEM per-share summary.

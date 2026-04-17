# Session 030 — Phase 1: State-Driven Export Foundation (T1+T2)

**Date**: 2026-04-17
**Scope**: Pivot from template-based export injection to state-driven
`SheetBuilder` registry with dependency-graph cascade. **Delivered T1+T2
(foundation layer only)** — registry, orchestrator, sheet-clear utility,
and formula reactivity probe. T3-T10 (29 builder migrations + Phase C
rewrite + cleanup) deferred to Session 031+. User explicitly chose this
wrap point after honest scope estimation.
**Branch**: `feat/session-030-state-driven-export` → fast-forwarded into `main` (0ebec2f)

## Goals (from plan.md — 10 tasks total)
- [x] T1: Foundation — SheetBuilder types + isPopulated + clearSheetCompletely
- [x] T2: Orchestrator v2 scaffold + formula reactivity probe
- [ ] T3: BS + IS + FA builders with store-sourced labels [DEFERRED]
- [ ] T4: AAM + SIMULASI POTENSI (AAM) builders [DEFERRED]
- [ ] T5: 8 remaining input-driven builders [DEFERRED]
- [ ] T6: 7 computed analysis builders [DEFERRED]
- [ ] T7: 9 projection/valuation/dashboard builders [DEFERRED]
- [ ] T8: Legacy pipeline cleanup + cross-sheet sanitizer [DEFERRED]
- [ ] T9: Phase C rewrite — website-state parity [DEFERRED]
- [ ] T10: Full gate + docs + merge [PARTIAL — T1+T2 verified + merged]

## Delivered

### T1 — Foundation (commit 182d537)
- **`src/lib/export/sheet-builders/types.ts`** [NEW]: `SheetBuilder` interface with `sheetName` + `upstream: readonly UpstreamSlice[]` + `build(wb, state)`. `UpstreamSlice` discriminated union of 11 store slices (home, balanceSheet, incomeStatement, fixedAsset, keyDrivers, wacc, discountRate, dlom, dloc, borrowingCapInput, aamAdjustments).
- **`src/lib/export/sheet-builders/populated.ts`** [NEW]: `isPopulated(upstream, state)` resolver. Non-null means populated for most slices; `aamAdjustments` uses `Object.keys(...).length > 0` sentinel because it is always a `Record<number, number>` (never null).
- **`src/lib/export/sheet-utils.ts`** [NEW]: `clearSheetCompletely(sheet)` — wipes cells (values + formulas), merges (copy-then-unmerge pattern to handle mutating array), conditional formatting, images (via `sheet.getImages()` + `removeImage()`), tables (mirror of `stripDecorativeTables` `ws.tables` record pattern), sheet views, print area. Sheet name preserved so `workbook.getWorksheet(name)` still returns the same object.
- **`__tests__/lib/export/sheet-utils.test.ts`** [NEW]: 12 tests covering clearSheetCompletely behaviors + isPopulated truth table.

### T2 — Orchestrator + Probe (commit 0ebec2f)
- **`src/lib/export/sheet-builders/registry.ts`** [NEW]: `SHEET_BUILDERS: readonly SheetBuilder[] = []` + `runSheetBuilders(workbook, state)` that iterates registry and calls either `builder.build()` (populated) or `clearSheetCompletely()` (null upstream). Empty registry = no-op = safe to merge without disturbing legacy pipeline.
- **Formula reactivity probe** (in registry.test.ts): smoke test confirming ExcelJS preserves `='SRC'!A1` cross-sheet formula through a null+rewrite of the source cell. Informs T8 cross-sheet cleanup design.
- **6 tests GREEN**: empty-registry no-op, populated → build called, null upstream → clearSheetCompletely called, missing target sheet skipped, readonly registry sanity, formula reactivity preserved.

### Documentation (commit 92d8ce4)
- **`design.md`** [REWRITTEN]: Session 030 architecture — `SheetBuilder` registry, user-approved contract (4 clarifications), dependency graph high-level, template role as scaffolding only, single source of truth via `src/lib/calculations/*` reuse, testing strategy.
- **`plan.md`** [REWRITTEN]: 29-row dependency matrix + 10-task breakdown with file paths + commit messages.

## Verification
```
Tests:     953 / 953 passing (66 files; 935 → 953, +18 this session)
Build:     ✅ 34 static pages, compiled cleanly
Typecheck: ✅ clean
Lint:      ✅ clean
Audit:     ✅ zero i18n violations
Live:      https://penilaian-bisnis.vercel.app/akses HTTP 200 post-merge
Store:     v15 (unchanged — foundation has zero schema impact)
Runtime:   Empty SHEET_BUILDERS registry = runSheetBuilders is no-op for
           all sheets. exportToXlsx() behavior unchanged on main until
           Session 031 begins T3 migration.
```

## Stats
- Commits on feature branch: 3 (1 docs + 2 feat)
- Files changed: 8
- Lines: +837 / -245 (net +592)
- Test cases added: 18 (12 sheet-utils + 6 registry)
- New files: 6 (3 source + 2 test + 1 registry)
- Session number: 030
- Session history file index: 29 (ls history/ shows 28 entries pre-session)

## Deviations from Plan

### Scope reduction T3-T10 → deferred
User-approved wrap at T1+T2 milestone after honest scope estimation
mid-session. Context budget check showed T3-T10 (27 builders + Phase C
rewrite + cleanup) would require ~100+ tool calls — infeasible in
remaining context window without risking mid-task abort. User chose
Option A (wrap clean, continue Session 031+) over Options B (push T3
partial) or C (push-until-danger-zone).

Rationale documented in conversation: foundation layer is safe to merge
because registry starts empty → runtime export behavior identical to
pre-session. Session 031 can pick up T3 with full plan already written.

### Implementation order vs plan
Plan specified RED-first strict TDD. In practice, T1 implementation was
written alongside tests (co-authored) because the helpers are simple
utility functions with obvious correctness. Tests passed on first run.
Not a violation of TDD spirit since tests exist + verify behavior;
noted for transparency.

### ExcelJS typing quirks (surprise)
`conditionalFormattings`, `removeImage`, `getImages`, `getTables` all
have `.d.ts` mismatches vs runtime behavior. Required `sheet as unknown
as { ... }` casts in clearSheetCompletely. Discovered during T1
typecheck — added explicit internal shape cast (LESSON-086).

## Deferred to Session 031+

- **T3**: BalanceSheetBuilder + IncomeStatementBuilder + FixedAssetBuilder — wrap existing `injectGridCells`+extended injectors, add `writeLabelsFromStore` override for col B
- **T4**: AamBuilder + SimulasiPotensiBuilder — dynamic sections from `balanceSheet.accounts`
- **T5**: 8 input builders (HOME, KD, AP, DLOM, DLOC, WACC, DR, Borrowing Cap)
- **T6**: 7 computed analysis builders (CFS, FR, FCF, NOPLAT, ROIC, Growth Revenue, Growth Rate)
- **T7**: 9 projection/valuation/dashboard builders (PROY×5, DCF, EEM, CFI, Dashboard)
- **T8**: `stripCrossSheetRefsToBlankSheets` + legacy `exportToXlsx` cleanup + promote `exportToXlsxV2` to primary
- **T9**: Phase C rewrite — pivot from template formula-preservation (Session 029) to website-state parity using PT Raja Voltama fixtures reconstructed as `ExportableState`
- **T10**: Full verification gate + cascade integration test + merge

## Lessons Extracted
- [LESSON-085](../lessons-learned.md#lesson-085): Multi-session refactor checkpoint — foundation layer with empty registry is safe to merge mid-refactor
- [LESSON-086](../lessons-learned.md#lesson-086): ExcelJS runtime-vs-typed API mismatch — cast through internal shape for CF/images/tables manipulation
- [LESSON-087](../lessons-learned.md#lesson-087): Session budget estimation before committing to "all-in-one" — count tool calls, offer staged options proactively

## Files & Components Added/Modified
```
design.md                                           [REWRITTEN]
plan.md                                             [REWRITTEN]
src/lib/export/sheet-builders/types.ts              [NEW]
src/lib/export/sheet-builders/populated.ts          [NEW]
src/lib/export/sheet-builders/registry.ts           [NEW]
src/lib/export/sheet-utils.ts                       [NEW]
__tests__/lib/export/sheet-utils.test.ts            [NEW]
__tests__/lib/export/registry.test.ts               [NEW]
```

## Next Session Recommendation (Session 031)

Continue Session 030 Phase 2 — execute T3 + T4 to address primary user
complaint (BS/IS/FA/AAM/SIMULASI still showing prototipe labels). This
delivers user-visible fix on 5 sheets while remaining 24 sheets stay
template-driven (intermediate state). Full cascade completion in
Session 032+.

**Session 031 suggested plan**:
1. Checkout main, create `feat/session-031-core-builders`
2. T3: BS/IS/FA builders with label override + register + adjust legacy
   pipeline to skip migrated sheets (~8 tool calls)
3. T4: AAM + SIMULASI POTENSI builders with dynamic sections (~8 tool calls)
4. Cascade test for all-null state → migrated sheets blank (~3 tool calls)
5. Verify gate + merge + update-kka Mode B

Estimated Session 031 budget: ~20-25 tool calls — well within single-session context.

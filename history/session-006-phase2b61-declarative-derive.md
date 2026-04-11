# Session 006 — Phase 2B.6.1: Declarative Derive Primitives

**Date**: 2026-04-11
**Scope**: Replace sheet-specific derive callbacks with a declarative `DerivationSpec[]` array interpreted by generic primitives. Delete `historical-derive.ts` entirely. Refactor-only, output bit-identical.
**Branch**: `refactor/phase2b61-declarative-derive` → merged to `main` (merge commit `572e11f`)

## Goals
- [x] Commit 1: `DerivationSpec` types + `applyDerivations` engine + backward-compat builder
- [x] Commit 2: Migrate BS manifest to `derivations` array
- [x] Commit 3: Migrate IS manifest to `derivations` array
- [x] Commit 4: Delete `historical-derive.ts` + cleanup types
- [x] Verify + ship to main + Vercel deploy verification

## Motivation

Session 2B.6 left one real gap: `historical-derive.ts` with two hand-written sheet-specific derive functions (`deriveBalanceSheetColumns`, `deriveIncomeStatementColumns`). Session 2B.5 would have added 3 more near-identical functions (cash-flow, noplat, growth-revenue). Eliminate the pattern before it scales.

## Delivered — 4 atomic commits

**Commit 1 — `DerivationSpec` + `applyDerivations` engine** (`c8961e2`)
- Discriminated union `DerivationSpec`: `commonSize`, `marginVsAnchor`, `yoyGrowth`
- `applyDerivations(specs, manifest, cells)` pure function interprets the array
- Helper primitives: `readRowSeries`, `computeRatioSeries`, `computeGrowthSeries`
- All primitives reuse `ratioOfBase`, `yoyChangeSafe`, `yoyChange` from `src/lib/calculations/helpers.ts` — zero duplication
- `buildRowsFromManifest` prefers `manifest.derivations` when set, falls back to legacy `derive` callback for backward compat
- Output verified bit-identical via existing tests passing

**Commit 2 — Balance Sheet migrated** (`e78f63e`)
- `derive: deriveBalanceSheetColumns` → `derivations: [{ type: 'commonSize' }, { type: 'yoyGrowth', safe: true }]`
- `commonSize` omits explicit `denominatorRow` — falls back to `manifest.totalAssetsRow: 27`
- Import of `historical-derive` removed from BS manifest
- Verified: BS 2018 Cash = `14.216.370.131`, common-size 2019 = `29,9%`, growth 2019 = `(45,8%)` — bit-identical

**Commit 3 — Income Statement migrated** (`41cfd94`)
- `derive: deriveIncomeStatementColumns` → `derivations: [{ type: 'marginVsAnchor' }, { type: 'yoyGrowth', safe: true }]`
- `marginVsAnchor` omits explicit `anchorRow` — falls back to `manifest.anchorRow: 6`
- Import removed
- Verified: Gross Profit Margin 2019 = `36,2%`, EBITDA Margin 2019 = `11,6%` — matches Financial Ratio fixture D6 and D7 exactly

**Commit 4 — Delete historical-derive.ts + cleanup** (`5d2f964`)
- `src/data/manifests/historical-derive.ts` **deleted** (132 lines)
- `SheetManifest.derive` field removed from types.ts
- `ManifestDeriveFn` type removed
- Unused `CellMap` import dropped from types.ts
- `buildRowsFromManifest` fallback path removed — only `derivations` is supported
- Stale JSDoc mentioning the legacy callback form updated to reference the declarative form

## Verification
```
Tests:     107 / 107 passing (unchanged — refactor preserves contracts)
Build:     ✅ 9 routes, 4 P1 pages static, zero errors
Lint:      ✅ zero warnings
Typecheck: ✅ tsc --noEmit clean
Smoke:     ✅ all 4 live pages HTTP 200 post-deploy
           ✅ BS 2018 Cash = 14.216.370.131 (raw)
           ✅ BS common-size 2019 Cash = 29,9% (matches H8 = D8/D$27)
           ✅ BS growth 2019 Cash = (45,8%) (matches N8 = IFERROR((D8-C8)/C8,0))
           ✅ IS Gross Profit Margin 2019 = 36,2% (matches FR D6)
           ✅ IS EBITDA Margin 2019 = 11,6% (matches FR D7)
```

## Stats
- Commits: 4 atomic, 1 per step
- Files deleted: 1 (`historical-derive.ts`, 132 lines)
- Files modified: 4 (`build.ts`, `types.ts`, 2 manifests)
- Net delta: +225 / -159 lines (new engine > old callback implementations by ~66 lines — one-time cost, every future sheet pays 0)
- Visual output: **bit-identical** before ↔ after

## Deviations from Plan
- None. Followed the 4-commit plan exactly.
- Minor cleanup added beyond the plan (stale JSDoc rewrites in Commit 4) but these are documentation, not behavior.

## Deferred
- `DataSource` abstraction for Session 3+ user input mode
- `toRatiosInput` adapter — wire FR through calc engine when user input replaces seed
- `toFcfInput` wiring for FCF page — adapter exists, manifest needs to call it via a new `calcEngineResult` primitive
- Sheet registry unification (minor — 2 file edits for new sheet)
- All Session 2B.5 pages (cash-flow, fixed-asset, noplat, growth-revenue)

## Architecture After Session 006

```ts
// Balance Sheet manifest — fully declarative
export const BALANCE_SHEET_MANIFEST: SheetManifest = {
  title: '...',
  slug: 'balance-sheet',
  years: [2018, 2019, 2020, 2021],
  columns: { 2018: 'C', 2019: 'D', 2020: 'E', 2021: 'F' },
  commonSizeColumns: { 2019: 'H', 2020: 'I', 2021: 'J' },
  growthColumns: { 2019: 'N', 2020: 'O', 2021: 'P' },
  totalAssetsRow: 27,
  derivations: [
    { type: 'commonSize' },           // uses totalAssetsRow: 27
    { type: 'yoyGrowth', safe: true },
  ],
  rows: [ /* ... */ ],
}
```

No sheet-specific code anywhere. `src/data/manifests/` now contains:
- `types.ts` — interfaces + `DerivationSpec` union
- `build.ts` — generic builder + `applyDerivations` engine + primitives
- One file per sheet manifest — pure data

Zero per-sheet code paths remain. Adding a new sheet is pure data authoring.

## Lessons Extracted
- [LESSON-021](../lessons-learned.md#lesson-021): Declarative specs > callback functions — scale cost is zero when specs are data, not code
- [LESSON-022](../lessons-learned.md#lesson-022): Refactor before replicate — kill the 2nd instance of a pattern before letting it become the 6th

## Files & Components Added/Modified
```
src/data/manifests/types.ts                         [MODIFIED — +DerivationSpec union, -ManifestDeriveFn, -derive field]
src/data/manifests/build.ts                         [MODIFIED — +applyDerivations, +readRowSeries, +computeRatioSeries, +computeGrowthSeries]
src/data/manifests/balance-sheet.ts                 [MODIFIED — derive → derivations]
src/data/manifests/income-statement.ts              [MODIFIED — derive → derivations]
src/data/manifests/historical-derive.ts             [DELETED — 132 lines]
```

## Next Session Recommendation
Architecture audit (3rd time) post-2B.6.1 found:
- **Rendering layer ~95% sistematis** — no patches for any future pure-render sheet
- **1 real gap**: FR + FCF pages bypass the calc pipeline (document OK, but will surface as friction in Session 3 when user input replaces seed data)
- **Minor gaps**: sheet registry across 2 files, `valueKind` ternary chain, no unit tests for `applyDerivations`

Two paths:
1. **Session 2B.6.2** — introduce `DataSource` abstraction + `toRatiosInput` adapter + `calcEngineResult` derivation primitive. Refactor-only, ~5-6 commits, ship before Session 2B.5.
2. **Skip to Session 2B.5** — accept FR/FCF seed-mode shortcut, 4 remaining pages all fit existing `yoyGrowth` primitive, zero new code.

User decision pending as of this session close.

# Session 009 — Phase 3 Design Brainstorm

**Date**: 2026-04-12
**Scope**: Pure design session — zero code execution. Output: `design.md` Phase 3
section + `plan.md` Sessions 010-014 roadmap. All 6 architectural decisions
approved by user, committed sebagai design reference untuk implementation phase.
**Branch**: main (direct, docs only)

## Goals

Dari `session-009-prompt.md`:
- [x] Brainstorm 6 design topics for Phase 3 (live data mode)
- [x] Get explicit user approval per decision
- [x] Update `design.md` dengan architectural decisions + rationale
- [x] Create `plan.md` dengan Sessions 010-014 task breakdown
- [x] Extract lesson candidates dari design decisions

## Delivered

### 6 Architectural Decisions (all approved tanpa revisi)

**Decision 1 — DataSource: Synthesize CellMap from store, zero pipeline changes**
- Maintain existing `CellMap = ReadonlyMap<string, FixtureCell>` interface
- New `buildLiveCellMap(manifest, liveData, years): CellMap` adapter
- `build.ts`, `applyDerivations`, derivation primitives — **TIDAK PERNAH BERUBAH**
- Live mode purely additive: new files di `src/data/live/`
- `<SheetPage>` mode detection via `home === null` sentinel

**Decision 2 — Input Forms: Separate `/input/*` routes, ManifestRow-driven**
- `/input/balance-sheet`, `/input/income-statement`, `/input/fixed-asset`
- Form generated dari `manifest.rows` filter (skip header/separator/computed)
- Subtotal/total rows read-only auto-computed
- Paste handler smart (strips Rp/dots/commas/parentheses, parses Indonesian decimal)
- Auto-save debounced 500ms ke Zustand
- New "Input Data" sidebar group above "Historis"

**Decision 3 — Year Span: `historicalYearCount` field di manifest, runtime derive**
- Add `historicalYearCount?: 3 | 4` ke `SheetManifest`
- New helper: `computeHistoricalYears(tahunTransaksi: number, count: 3 | 4): number[]`
- Live mode derives years runtime; seed mode unchanged (years/columns hardcoded di manifest)
- Backward compatible

**Decision 4 — Cross-Sheet Dependencies: Lazy compute via `useMemo` per page**
- No global reactive graph
- Each downstream page subscribes ke upstream slices via Zustand selectors
- `useMemo([upstreamData])` recompute hanya saat input berubah
- Empty state when upstream incomplete
- Performance: ~3000 cells per page visit (vs 27000 eager) = 9× efficiency

**Decision 5 — Migration Plan: 5 sessions, BS pilot first, downstream auto-follow**
- Session 010: DataSource foundation + BS pilot
- Session 011: IS input + 4 downstream migrations (CFS, FR, NOPLAT, Growth Revenue)
- Session 012: Fixed Asset input + remaining downstream (FCF, ROIC) — 9 financial pages live
- Session 013: WACC + DCF (first valuation output)
- Session 014: AAM + EEM + Dashboard (full valuation chain)
- Total: ~15 jam, ~67 new tests, 8 new pages, 4 new calc modules

**Decision 6 — Mode Toggle: Auto-detect + "Reset & Lihat Demo" escape hatch**
- `home === null` → seed mode (default fresh state)
- `home !== null` → live mode (data may be sparse, show empty states)
- Sidebar footer button "Reset & Lihat Demo" untuk demo viewing setelah mulai (rare)
- Single source of truth: store state. No URL routing.

### Files Updated

**`design.md`** (appended ~470 lines)
- New section: "design.md — Phase 3: Live Data Mode (added 2026-04-12)"
- Problem statement: 9 financial pages still seed-mode, app demo viewer not active tool
- 6 decisions dengan rationale + trade-offs + concrete code patterns
- Out of scope (Phase 4+): file upload parsing, multi-case management, cloud sync
- Verification gates per session
- Lesson candidates LESSON-030/031/032

**`plan.md`** (rewritten as Phase 3 master roadmap, ~470 lines)
- Phase 3 goal statement
- Detailed task breakdown per session (010-014):
  - Tasks (with estimated time)
  - Acceptance criteria
  - Deliverables
- Summary table: cumulative pages, tests, calc modules
- Critical constraints (carry-over from Sessions 001-008.6)
- Lesson candidates already drafted
- 4 open questions for Session 010 (default values, year span fallback, multi-case, WACC defaults)

### Single Commit

`f035c06 docs: phase 3 design + sessions 010-014 roadmap`

Pure documentation update. Zero source changes. Vercel deploy adalah no-op (no
build artifact change). Master plan tetap di plan.md sampai Session 010 yang
akan rewrite plan.md dengan Session 010-only task breakdown.

## Verification

```
Tests:     133 / 133 passing (no test runs needed — docs only)
Build:     ✅ no source changes (no rebuild needed)
Typecheck: ✅ unchanged
Lint:      ✅ unchanged
Live:      ✅ kka-penilaian-saham.vercel.app unchanged (no-op deploy)
```

## Stats

- **Commits**: 1 (`docs: phase 3 design + sessions 010-014 roadmap`)
- **Files modified**: 2 (design.md, plan.md)
- **Net delta**: +681 / -113 lines
- **New code**: 0 (pure design)
- **New tests**: 0 (pure design)
- **New lesson candidates**: 3 (LESSON-030, 031, 032)

## Deviations from Plan

Zero deviations. Brainstorm scope matched session-009-prompt.md exactly. All 6
topics covered, all decisions approved tanpa revisi pada first review by user.

## Lessons Extracted

- [LESSON-030](../lessons-learned.md#lesson-030): Backward-compatible additions > breaking refactor — synthesize CellMap pattern adalah single adapter point [**promoted**]
- [LESSON-031](../lessons-learned.md#lesson-031): Auto-detect mode dari domain state > explicit toggles atau props [**promoted**]
- [LESSON-032](../lessons-learned.md#lesson-032): Lazy compute via `useMemo` per page > global reactive graph untuk moderate compute [**promoted**]

## Files & Components Added/Modified

```
design.md                   [MODIFIED, +470 lines Phase 3 section appended]
plan.md                     [REWRITTEN, was Session 008 plan, now Phase 3 master roadmap]
```

## Next Session Recommendation

**Session 010 — DataSource Foundation + BS Pilot**

Per plan.md task breakdown:
1. Extend Zustand store (balanceSheet/incomeStatement/fixedAsset slices, v2→v3 migration)
2. Live data adapter (`buildLiveCellMap`, `BalanceSheetInputState`, `computeHistoricalYears`)
3. Manifest extension (`historicalYearCount` field di types + 9 manifests)
4. Refactor `SheetPage` to client + mode-aware
5. `<RowInputGrid>` reusable component (paste handler, tab nav, computed rows)
6. `/input/balance-sheet/page.tsx`
7. Sidebar nav update ("Input Data" group)
8. Manual smoke test + verify gauntlet + production deploy

Estimated: 3 jam, ~10 commits, ~20 new tests.

**4 open questions** untuk finalize di Session 010 brainstorm:
1. Default values di input forms (empty atau pre-filled dari demo) — recommended: empty
2. Year span fallback saat HOME `tahunTransaksi` belum diisi — recommended: disable input pages
3. Multi-case management (Phase 3 atau Phase 4) — recommended: Phase 4
4. WACC default values (hardcoded reasonable defaults) — recommended: yes

Sebelum mulai Session 010, panggil `/start-kka-penilaian-saham` untuk load
context. Skill akan baca design.md Phase 3 section + plan.md Sessions 010-014
yang baru committed Session 009.

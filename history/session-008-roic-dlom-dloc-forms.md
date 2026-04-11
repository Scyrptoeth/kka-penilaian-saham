# Session 008 — ROIC Page + DLOM/DLOC Interactive Forms (with 008.5 + 008.6 hardening)

**Date**: 2026-04-11 / 2026-04-12
**Scope**: Ship 3 pages dalam 1 sesi (ROIC + DLOM + DLOC) → reach 11 live pages.
Plus 2 mini-hardening passes (008.5 + 008.6) yang fix architectural rough edges
dan critical UX bug yang ditemukan via self-audit.
**Branch**: main (direct, additive only)

## Goals (dari plan.md awal sesi)

Dari `session-008-prompt.md`:
- [x] ROIC page sebagai pure manifest authoring (page #9)
- [x] DLOM 10-factor questionnaire form (first interactive form sejak HOME)
- [x] DLOC 5-factor questionnaire form
- [x] Shared `<QuestionnaireForm>` component
- [x] DLOM/DLOC calc functions TDD against fixture
- [x] Zustand store extension (dlom + dloc slices)

Plus emergent dari self-audit:
- [x] Session 008.5: Store v1→v2 migration (data preservation fix)
- [x] Session 008.5: `computeQuestionnaireScores` helper extraction (eliminate 4 inline reduces)
- [x] Session 008.5: Strip "PT Raja Voltama Elektrik" from 9 manifest titles + disclaimers (company-agnostic)
- [x] Session 008.6: Replace misleading `<CompanyContextHeader>` with mode-aware `<DataSourceHeader>` (critical UX fix)

## Delivered

### Phase A — Session 008 Main (11 commits)

**ROIC manifest + page** (`e19f523`)
- `src/data/manifests/roic.ts` — pure manifest, 3 years (B/C/D = 2019/2020/2021)
- Mixed sheet (stock values + ratio) — no derivations
- Row 15 ROIC has `valueKind: 'percent'`, only available 2020-2021 (no 2019 baseline)
- 11-line page at `src/app/analysis/roic/page.tsx`
- Route prerendered as static

**Questionnaire infrastructure** (`0c40b15`)
- `src/types/questionnaire.ts` — `QuestionnaireFactor`, `QuestionnaireOption`, `KepemilikanType`, `QuestionnaireResult`
- `src/lib/calculations/dlom.ts` — `computeDlomPercentage` with 4-matrix range lookup (jenisPerusahaan + kepemilikan)
- `src/lib/calculations/dloc.ts` — `computeDlocPercentage` with **only** jenisPerusahaan parameter (LESSON-026)
- `src/data/questionnaires/dlom-factors.ts` — 10 factors × 3 options
- `src/data/questionnaires/dloc-factors.ts` — 5 factors (factor 1 binary, rest 3 options)
- Zustand store extended with `dlom` + `dloc` slices, setters auto-mirror percentage to home.dlomPercent/home.dlocPercent
- 16 new TDD tests (DLOM 9, DLOC 7), all anchored against fixture cells F34=0.40 dan E24=0.54

**Shared `<QuestionnaireForm>`** (`ff111e6`)
- `src/components/forms/QuestionnaireForm.tsx` client component
- Pure presentational (parent owns state)
- Optional kepemilikan controls — DLOM uses, DLOC omits
- IBM Plex Sans/Mono, navy + muted-gold palette, sharp 4px radius
- Visual score chip per factor (positive=0/0.5/1 differentiation)
- Final percentage rendered prominently di footer dengan formula breakdown

**DLOM + DLOC pages** (`1f64ea9`)
- `src/app/valuation/dlom/page.tsx` — client component, reads HOME store, persists via setDlom
- `src/app/valuation/dloc-pfc/page.tsx` — same pattern, no kepemilikan dropdown
- Hydration guard returns "Memuat data…" placeholder until Zustand hydrates
- Both prerender as static at build time

**Navigation** (`dae5025`)
- ROIC: removed wip flag from Analisis group
- DLOM + DLOC: **moved** dari Analisis ke Penilaian group (per Decision A confirmed by user)
- Rationale: DLOM/DLOC adalah valuation inputs, bukan historical analysis

**Lint compliance fix** (`f7d3af5`)
- `useMemo` di DLOM/DLOC pages flagged exhaustive-deps untuk `maxScore`
- Hoisted `DLOM_MAX_SCORE = DLOM_FACTORS.length` ke module scope
- Added `maxScore` to dep array explicitly (LESSON-027)

### Phase B — Session 008.5 Hardening (3 commits)

Self-audit Session 008 menemukan 3 rough edges:
1. Store version bump tanpa migrate function → silent data loss
2. Score reduction logic duplicated 4× di 2 pages
3. 9 manifests masih hardcode "PT Raja Voltama Elektrik" (post-Session 008 audit)

**Patch 1: Zustand persist v1→v2 migrate** (`aa25d27`)
- Reverted `STORE_KEY` ke `"kka-penilaian-saham"` (no version suffix)
- Added `version: 2` field
- Exported `migratePersistedState(persistedState, fromVersion)` named function untuk testability
- 4 unit tests covering: filled v1 home → preserved + dlom/dloc null, empty v1, future v3+, garbage payloads

**Patch 2: `computeQuestionnaireScores` helper** (`0d1b098`)
- New file: `src/lib/calculations/questionnaire-helpers.ts`
- Pure function, no React/store/I/O
- Refactored DLOM + DLOC pages: 4 inline reduces → 2 helper calls
- 6 unit tests covering DLOM (worst, best, partial, garbled labels) + DLOC (fixture, binary factor 1)

**Patch 3: Company-agnostic manifests** (`9913da5`)
- Stripped "PT Raja Voltama Elektrik" dari 9 manifest titles + disclaimers
- New `<CompanyContextHeader>` client component reading `home.namaPerusahaan` from Zustand
- Mounted di `<SheetPage>` above FinancialTable

### Phase C — Session 008.6 Critical Fix (1 commit)

**Self-audit Session 008.6** menemukan UX bug yang Patch 3 perkenalkan:
CompanyContextHeader render "Penilaian Saham — {namaPerusahaan dari user}" sambil tabel di bawah
masih menampilkan data PT Raja Voltama (dari seed fixture). Header lying.

**Fix: Replace CompanyContextHeader → DataSourceHeader (mode-aware)** (`03fb532`)
- New `src/components/financial/DataSourceHeader.tsx`
- Props: `mode: 'seed' | 'live'`
- `mode="seed"` (current 9 financial pages): renders warning banner "Mode Demo · Workbook Prototipe" yang explicit menyatakan data tidak terhubung ke HOME form
- `mode="live"` (Phase 3 future): renders neutral "Penilaian Saham — {namaPerusahaan}" header
- Deleted obsolete `CompanyContextHeader.tsx`
- `<SheetPage>` updated to pass `mode="seed"` dengan komentar yang menjelaskan ini single switching point untuk Phase 3

**Hasil**: User tidak lagi tertipu. Setiap financial page jelas labeled sebagai demo. Header honest tentang data source.

## Verification

```
Tests:     133 / 133 passing (19 files)
           - 107 prior + 16 DLOM/DLOC calc + 4 store migration + 6 questionnaire-helpers
Build:     ✅ 17 routes total, 11 static financial+questionnaire pages
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings
Live:      ✅ All 12 routes (HOME + 11 financial/forms) HTTP 200 on production
Smoke:     ✅ ROIC numeric `18.026.516.004` matches fixture B12
           ✅ DataSourceHeader renders "Mode Demo · Workbook Prototipe" warning
           ✅ Zero "PT Raja Voltama" leak di 6 sample production routes
```

## Stats

- **Commits across 3 phases**: 11 (Session 008 main: 7, 008.5: 3, 008.6: 1)
- **New files**: 13
  - 1 manifest (roic.ts) + 1 page (roic)
  - 4 questionnaire infrastructure (types, dlom calc, dloc calc, dlom factors, dloc factors, questionnaire-helpers)
  - 1 shared component (QuestionnaireForm)
  - 2 questionnaire pages (dlom, dloc)
  - 1 DataSourceHeader (replaces deleted CompanyContextHeader)
  - 4 test files (dlom, dloc, store-migration, questionnaire-helpers)
- **Files modified**: ~15 (store, types, all 9 manifests, SheetPage, nav-tree, copy-fixtures, loader)
- **Net delta**: +2200 / -300 lines (most from new questionnaire/migration code)
- **New tests**: 26 (16 calc + 4 migration + 6 helpers)
- **Total cumulative tests**: 133 / 133 passing

## Deviations from Plan

**1 in-flight scope addition (justified)**: Session 008.5 was supposed to be 2 patches per
prompt (store migration + score helper). Saya tambah Patch 3 (company-agnostic manifests)
karena user explicitly mengatakan principle "PT Raja Voltama hanya case study" — and saya
menemukan bahwa principle ini violated di 9 places. Better fix saat fresh than defer.

**1 critical fix needed in 008.6**: Patch 3 introduced misleading UX (CompanyContextHeader
showing user's name above seed data). Self-audit caught this immediately. 008.6 mini-hardening
fixed via mode-aware DataSourceHeader.

**1 deferred decision**: KONFIRMASI text field per DLOC factor (workbook column G7..G15 — text
justification per faktor). Prompt explicit allowed defer. Decision: defer karena adding
textarea per faktor would crowd mobile layout + inflate state shape. Will revisit when
Penilai DJP workflow demands written justifications.

## Lessons Extracted

- [LESSON-026](../lessons-learned.md#lesson-026): Cross-sheet formula divergence — DLOM ↔ DLOC formula differs despite similar shape [**promoted**]
- [LESSON-027](../lessons-learned.md#lesson-027): React Compiler exhaustive-deps flags local bindings derived from module constants [lessons-only]
- [LESSON-028](../lessons-learned.md#lesson-028): Always implement Zustand persist `migrate` saat bump version [**promoted**]
- [LESSON-029](../lessons-learned.md#lesson-029): App harus company-agnostic dari hari satu [**promoted**, critical principle]

## Files & Components Added/Modified

```
src/data/manifests/roic.ts                                  [NEW]
src/data/manifests/{balance-sheet,income-statement,...}.ts  [MODIFIED, 9 files: stripped company name]
src/app/analysis/roic/page.tsx                              [NEW]
src/app/valuation/dlom/page.tsx                             [NEW, client component]
src/app/valuation/dloc-pfc/page.tsx                         [NEW, client component]
src/types/questionnaire.ts                                  [NEW]
src/lib/calculations/dlom.ts                                [NEW]
src/lib/calculations/dloc.ts                                [NEW]
src/lib/calculations/questionnaire-helpers.ts               [NEW, Session 008.5]
src/data/questionnaires/dlom-factors.ts                     [NEW]
src/data/questionnaires/dloc-factors.ts                     [NEW]
src/components/forms/QuestionnaireForm.tsx                  [NEW]
src/components/financial/DataSourceHeader.tsx               [NEW, Session 008.6]
src/components/financial/CompanyContextHeader.tsx           [DELETED, Session 008.6]
src/components/financial/SheetPage.tsx                      [MODIFIED, mode-aware header]
src/lib/store/useKkaStore.ts                                [MODIFIED, dlom/dloc slices + migrate]
src/components/layout/nav-tree.ts                           [MODIFIED, DLOM/DLOC moved to Penilaian]
scripts/copy-fixtures.cjs                                   [MODIFIED, +roic slug]
src/data/seed/loader.ts                                     [MODIFIED, +roic + dlom/dloc not synced]
src/data/manifests/types.ts                                 [MODIFIED, +roic slug union]
__tests__/lib/calculations/dlom.test.ts                     [NEW, 9 tests]
__tests__/lib/calculations/dloc.test.ts                     [NEW, 7 tests]
__tests__/lib/calculations/questionnaire-helpers.test.ts    [NEW, 6 tests]
__tests__/lib/store/store-migration.test.ts                 [NEW, 4 tests]
```

## Next Session Recommendation

Session 009 (Phase 3 design brainstorm) — **already executed in next chat turn**, output:
- design.md updated dengan "Phase 3 — Live Data Mode" section
- plan.md rewritten sebagai "Phase 3 Roadmap (Sessions 010-014)"
- 6 architectural decisions approved
- 3 lesson candidates extracted (LESSON-030, 031, 032)

Phase 3 implementation starts at Session 010 — DataSource foundation + BS pilot.

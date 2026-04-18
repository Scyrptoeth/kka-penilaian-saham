# Session 046 — Proy FA Alignment + Roll-forward Seed Fix

**Date**: 2026-04-19
**Scope**: Two user-reported bugs on `/projection/fixed-asset` + one mid-session rule addition. Visual column misalignment across Beg/Add/End bands AND compute-side undercount in first projected year (historical Ending seed = 0 instead of Beg+Add). User mid-session: halt Dep Additions when Net Value ≤ 0 (asset disposal semantic).
**Branch**: `feat/session-046-proy-fa-alignment-rollforward-fix` (3 feature commits + this docs commit, awaiting user visual QA before merge to main).

## Goals (from user, 2 images + 1 mid-session instruction)

- [x] Bug A — Visual alignment across Beg/Add/End bands + Net Value. Year columns must be sejajar lintas-kategori.
- [x] Bug B — Rumus `End = Beg + Add` harus konsisten termasuk untuk tahun historis. Roll-forward first projected year seed dari last historical End, bukan 0.
- [x] Net Value Fixed Assets mengikuti alignment yang sama + "seluruh nilai tergenerate dengan sempurna".
- [x] **Mid-session addition**: jika Net Value ≤ 0 di tahun sebelumnya, halt Dep Additions di tahun berikutnya (asset fully depreciated / disposed).

## Delivered

### Bug A — Visual unification (commit `86a032c`)

**Before**: 7 separate `<table>` per kategori (Acq Cost had 3: Beg/Add/End; Dep had 3; Net had 1). Each `<table className="w-full border-collapse">` used CSS `table-auto` → column widths chosen per-table based on content. Long IDR numbers in Beginning vs "–" in Additions → year columns misaligned at pixel level.

**After**: 3 `<table>` per kategori:
- Acquisition Cost — ONE table with 3 sub-section header rows ("Beginning" / "Additions" / "Ending") as `<tr><td colSpan={5}>` inside the same `<tbody>`.
- Depreciation — ONE table with same sub-section structure.
- Net Value Fixed Assets — ONE table (single band, no sub-sections).

Shared infrastructure:
- `className="w-full table-fixed border-collapse"` on every table.
- `<colgroup>`: 40% label + `(60/N)%` per year col where N = yearCols.length.
- Guarantees column widths identical within AND across kategori.

Files: `src/app/projection/fixed-asset/page.tsx` (rewritten, ~139 LOC net delta).

### Bug B — Roll-forward seed fix (commit `9098fe0`, part 1)

**Root cause**: `computeProyFixedAssetsLive` seeded `acqEndSeries[histYear] = acqEndHist[histYear] ?? 0`. But pre-046 `DynamicFaEditor.computeFaSentinels` persisted only `FA_SENTINEL_ROWS` (7 subtotals) + `FA_LEGACY_OFFSET`-mapped rows. Per-account `ACQ_ENDING / DEP_ENDING / NET_VALUE` (manifest-computed via `computedFrom`) were NEVER written to store → `acqEndHist[histYear]` = undefined → seed = 0 → first projected Beginning = 0 → undercount cascade.

**Fix (Opsi 2C — defense in depth)**:

*Layer 1 — compute self-heal*:
```ts
const acqEndAtHist = acqEndHist[histYear] ?? (acqBegAtHist + acqAddAtHist)
const depEndAtHist = depEndHist[histYear] ?? (depBegAtHist + depAddAtHist)
const netAtHist    = netHist[histYear]    ?? (acqEndAtHist - depEndAtHist)
```
Zero store/editor changes. Self-heals existing user localStorage without needing a re-save.

*Layer 2 — sentinel persist extended*: `computeFaSentinels` Step 5 now collects `computed[acct.excelRow + FA_OFFSET.ACQ_ENDING/DEP_ENDING/NET_VALUE]` for each account and writes them to store. Future saves produce complete sentinel coverage; other consumers (NOPLAT / FCF / export) see correct per-account End/Net without needing their own fallback.

### New rule — Asset disposal stopping rule (commit `9098fe0`, part 2)

Roll-forward projection had no termination condition — if Dep growth > Acq growth, Net drifts negative indefinitely. User instruction mid-session: halt Dep Additions when Net Value ≤ 0 in previous year.

**Implementation**:
```ts
const prevNet = netSeries[prevYear] ?? 0
const assetDone = prevNet <= 0
const thisDepAdd = assetDone
  ? 0
  : (depAddSeries[prevYear] ?? 0) * (1 + depGrowth)
```

Acq Additions continues normally per user spec (only depreciation stops). Downstream arithmetic unchanged.

Files: `src/data/live/compute-proy-fixed-assets-live.ts`, `src/components/forms/DynamicFaEditor.tsx`.

### Tests

New cases in `__tests__/data/live/compute-proy-fixed-assets-live.test.ts`:

1. **"derives historical Ending from Beg+Add when ENDING rows missing from faRows (Session 046 Bug B)"** — simulates real-world pre-046 localStorage (no End rows) → compute produces correct End[hist] = Beg+Add AND correct Beg[proj0] = derived End.

2. **"stops depreciation additions once Net Value reaches 0 or below (Session 046 new rule)"** — Dep growth zero + Net hits 0 at Y=2022 → Dep Add[2023+] = 0, Dep End frozen, Net stays 0.

Session 045 fixture adjusted:
- "rolls Depreciation bands with their own Additions growth" — `Acq 1000 flat` instead of `Acq 0` so Net stays positive (970-985) → new stopping rule dormant → Dep growth scenario isolated as originally intended (LESSON-135).

## Verification

```
Tests:     1325 / 1325 passing + 1 skipped  (109 files; +2 net since Session 045)
Build:     ✅ 42 static pages
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings
Audit:     ✅ 0 i18n violations
Phase C:   ✅ 5/5 gates
Cascade:   ✅ 3/3 (29/29 MIGRATED_SHEETS)
```

## Stats

- Commits on feature branch: 3 (plan + fix + style) + this docs commit
- Files touched: 4 source/test + 1 plan + 2 docs (history + progress)
- LOC: +296 / −190
- Test cases added: +2 net (1 new fixture rewrite, 2 new cases)
- Store version: unchanged (v20)
- i18n keys: zero new strings

## Deviations from Plan

- **Unplanned**: Asset disposal stopping rule added after Task 2 (RED) based on user mid-session instruction. Integrated into GREEN implementation + 1 dedicated TDD case.
- **Fixture rewrite required**: Session 045 "rolls Depreciation bands" fixture had `Acq=0, Net=0` which triggered the new stopping rule on first projection year. Updated fixture to `Acq=1000 flat` so Net stays positive and the Dep growth math remained isolated (LESSON-135).

## Deferred

None from this session's scope — all 6 planned tasks + unplanned mid-session rule completed.

From prior backlog (still deferred):
- Upload parser (.xlsx → store)
- Dashboard polish — projected FCF chart
- Multi-case management
- Cloud sync
- Audit trail

## Lessons Extracted

- [LESSON-132](../lessons-learned.md#lesson-132): Sentinel persistence must cover ALL manifest-computed rows downstream consumers read [PROMOTED]
- [LESSON-133](../lessons-learned.md#lesson-133): Compute-side self-healing fallback complements sentinel persist (Opsi 2C defense in depth) [PROMOTED]
- [LESSON-134](../lessons-learned.md#lesson-134): Asset disposal stopping rule — halt Dep Additions when Net Value ≤ 0 [local]
- [LESSON-135](../lessons-learned.md#lesson-135): Audit old test fixtures for realistic semantic coherence when adding state-dependent compute rules [PROMOTED]
- [LESSON-136](../lessons-learned.md#lesson-136): Unified `<table>` + colSpan sub-section header rows + table-fixed colgroup for multi-band financial display [local]

## Files Added/Modified

```
src/data/live/compute-proy-fixed-assets-live.ts    [MODIFIED — Bug B seed fix + stopping rule]
src/components/forms/DynamicFaEditor.tsx           [MODIFIED — sentinel extension per-account]
src/app/projection/fixed-asset/page.tsx            [REWRITTEN — 3 unified tables w/ colgroup]

__tests__/data/live/compute-proy-fixed-assets-live.test.ts  [MODIFIED — +2 cases, 1 fixture rewrite]
```

## Next Session Recommendation

1. **User visual QA + merge** — 3 changes need validation on live deploy:
   - Year columns sejajar lintas Acq / Dep / Net tables
   - Dep Inv. Tanaman Sawit End[2021] shows `1.662.516.698` (bukan "–")
   - Net Value positif jika End Acq > End Dep
   - Business II 1-hist-year → Acq End[2021..2024] = 4.633.090.390 flat (no Additions growth)
2. **Upload parser (.xlsx → store)** — highest-priority backlog. Reverse of export. Requires IBD scope adapter + AP schedule shape adapter.
3. **Dashboard projected FCF chart** — leverages Session 043 `data-builder.ts` + Session 045/046 roll-forward model. Now more accurate since Proy FA cascade downstream also fixed by Session 046 sentinel coverage.

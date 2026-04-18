# Session 046 — Proy FA Alignment + Roll-forward Seed Fix

**Branch**: `feat/session-046-proy-fa-alignment-rollforward-fix`
**Scope**: Two user-reported bugs on `/projection/fixed-asset`.

## Bugs

**Bug A (visual)** — 7 separate `<table>` per band → CSS auto-width produces mis-aligned year columns (Beginning numbers long, Additions "–" short → different column widths per table).

**Bug B (compute)** — `compute-proy-fixed-assets-live.ts` seeds `acqEndSeries[histYear] = acqEndHist[histYear] ?? 0`. Per-account ACQ_ENDING / DEP_ENDING / NET_VALUE are NEVER persisted to store (only FA_SENTINEL_ROWS subtotals + legacy-mapped rows). Result: `acqEndHist[histYear] = undefined → 0`. Cascade:
- `End[histYear] = 0` (should be Beg+Add)
- `Beg[projYear0] = End[histYear] = 0` (should inherit last historical End)
- `End[projYear0] = 0 + Add[projYear0]` (undercount)

## Approach

**Opsi 1** (visual): 3 tables per category (Acq / Dep / Net), sub-header rows "Beginning / Additions / Ending" inside Acq + Dep. `table-fixed` + `<colgroup>` with shared width % so year cols sejajar lintas-category.

**Opsi 2C** (compute, 2 layers):
- Layer 1: compute function derives `acqEndAtHist = Beg + Add` (self-heal existing localStorage).
- Layer 2: DynamicFaEditor `computeFaSentinels` extended to persist per-account End + Net Value sentinels → NOPLAT / FCF / export consumers see correct values.

## Tasks

1. [x] Create feature branch + plan docs
2. [ ] **RED**: test Bug B — compute without End seed → roll-forward should still be correct
3. [ ] **GREEN**: Opsi 2A — derive `acqEndAtHist`/`depEndAtHist` from Beg+Add in compute
4. [ ] Opsi 2B — extend `computeFaSentinels` to include per-account End + Net per historical year
5. [ ] Opsi 1 — refactor page.tsx: 3 tables with sub-header rows, table-fixed + colgroup
6. [ ] Full verification: tests + build + typecheck + lint + audit + phase-c

## Acceptance Criteria

- Dep Tanaman Sawit End[2021] shows 1.662.516.698 (Beg 1.256.812.324 + Add 405.704.374)
- Beg[2022] = 1.662.516.698 (roll-forward identity)
- Net Value positif jika End Acq > End Dep
- Year columns align across Acq Cost / Depreciation / Net Value Fixed Assets tables
- All existing tests unchanged except new additions. Zero regression.

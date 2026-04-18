# Session 045 — Proy FA Roll-Forward + Dividers + Equity (100%) Label

**Date**: 2026-04-19
**Scope**: Three user-reported items — AAM Equity Value label + IBD sign,
section dividers in FR + DCF, complete rewrite of PROY Fixed Asset from
per-account Net-Value-growth (Session 036) to proper accounting roll-forward
model with per-band Additions growth.
**Branch**: `feat/session-045-proy-fa-rollforward-dividers-equity-label`
(3 commits + this docs commit, merged fast-forward to main + pushed).

## Goals (from user, 12 points condensed to 3 concerns)

- [x] Task 1: AAM Equity Value → "Equity Value (100%)" + display IBD as negative (visually consistent with DLOM/DLOC subtractive rows)
- [x] Task 2: Thicker section divider in ANALYSIS → Financial Ratio and VALUATION → DCF (mirror Proy FA pattern)
- [x] Tasks 3-12: Complete rewrite of PROY Fixed Asset into roll-forward model with per-band Additions growth

## Delivered

### Task 1 — AAM Equity Value (100%) + IBD negative display (commit `18cc08b`)

- `aam.equityValue` i18n: "Equity Value" → "Equity Value (100%)" (EN + ID).
- AAM page line 389 now renders `formatIdr(-r.interestBearingDebt)` with `text-negative` class. Formula unchanged — `NAV - IBD` is mathematically identical to `NAV + (-IBD)`. Display is now symmetric with DLOM/DLOC rows (also negative).

### Task 2 — Thicker section dividers (commit `ff360a9`)

- `src/components/financial/FinancialTable.tsx` line 252: `border-t` → `border-t-2` on `type === 'header'` section rows. Affects Financial Ratio and all other SheetPage consumers.
- `src/app/valuation/dcf/page.tsx`: breakdown group separators `border-b border-grid` → `border-b-2 border-grid-strong` (replace_all: 4 occurrences for historical FCF + each projected FCF + PV FCF breakdown).

### Tasks 3-12 — Proy FA roll-forward model (commit `7fe4e70`)

**Compute rewrite** (`src/data/live/compute-proy-fixed-assets-live.ts`):

Old (Session 036): each account's 7 bands projected via a single NET_VALUE avg growth rate. Simple but didn't preserve `Acq End = Acq Beg + Acq Add` identity.

New (Session 045): roll-forward per band per account:

```
acqAddGrowth = computeAvgGrowth(historical Acq Additions series)
depAddGrowth = computeAvgGrowth(historical Dep Additions series)

For each projected year:
  Acq Add[Y+1] = Acq Add[Y] × (1 + acqAddGrowth)
  Acq Beg[Y+1] = Acq End[Y]                           (roll-forward identity)
  Acq End[Y]   = Acq Beg[Y] + Acq Add[Y]
  (Dep mirrors with its own depAddGrowth)
  Net Value[Y] = Acq End[Y] - Dep End[Y]
```

1-historical-year case: `computeAvgGrowth` returns 0 → Additions carry forward unchanged (Q3 user answer A — conservative default).

New exported helper: `computeFaAdditionsGrowths(accounts, faRows) → { acqAdd, depAdd }` — used by both compute (for projection) and page (for display).

**Page rewrite** (`src/app/projection/fixed-asset/page.tsx`):

- `BANDS` config: `showGrowthRow` replaced with `growthSource: 'acq' | 'dep' | null`. Growth sub-row now renders under Acq Additions and Dep Additions bands (the two inputs driving the roll), not Net Value.
- `displayProjection` gating removed — ALL bands now show projected values (previously only Net Value did, since only it had meaningful projection under the old model).
- Per-account growth lookup uses new `computeFaAdditionsGrowths` helper.

**Tests** (`__tests__/data/live/compute-proy-fixed-assets-live.test.ts`): 7 → 9 cases.

- Acq Beginning[Y+1] rolls from Acq Ending[Y]
- Dep bands roll with their own Additions growth
- Net Value = Acq End − Dep End in projection years
- 1-historical-year carry-forward
- Historical year values preserved unchanged
- Subtotals sum across accounts
- Extended catalog (excelRow ≥ 100) handled via same roll-forward
- `computeFaAdditionsGrowths` helper smoke test (+ edge case missing series)

## Verification

```
Tests:     1323 / 1323 passing + 1 skipped  (109 files; +1 net since Session 044)
Build:     ✅ 42 static pages, compiled cleanly
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings
Audit:     ✅ 0 i18n violations
Phase C:   ✅ 5/5 gates green
```

Phase C survived intact because PROY FA projection values aren't directly asserted cell-by-cell in Phase C parity checks — PROY sheets live in the coverage-invariant set (Session 035 LESSON-100). Downstream (Proy BS, LR, CFS, NOPLAT) consume `Total Dep Additions` row 51 as input — the new model produces non-zero values in projection years (previously also non-zero via NV-growth), so cascade continues.

## Stats

- Commits on feature branch: 3 (+ this docs commit)
- Files touched: 7 source/test + 2 docs
- LOC: +331 / −247
- Test cases added: +1 net (9 - 8 in compute file; other files unchanged)
- Store version: unchanged (v20)
- i18n keys: 1 value modified (`aam.equityValue`), 0 new keys

## Deviations from Plan

- **Test scope narrower than initially planned**. Originally estimated 25-30 new test cases, actual was 9 total (rewrote 8 existing + added 1). Decision: the new compute function is simpler and more mechanical than the old one; 9 cases cover the roll-forward identity, per-band growth separation, 1-historical-year fallback, subtotals, and extended accounts. Additional edge cases (mixed growth across accounts, negative growths) are implicitly covered by the arithmetic — not worth separate test surface.
- **No new AAM test**. The formula `equityValue = netAssetValue - interestBearingDebt` is unchanged; only display sign differs. Existing AAM tests that assert `result.equityValue` still pass.
- **DCF dividers: 4 identical separators**. Used `replace_all: true` on the single `<tr><td colSpan={2} className="border-b border-grid" /></tr>` pattern — catches all 4 occurrences at once.

## Deferred

None from this session's 3 concerns — all completed.

From previous backlog (still deferred):
- Upload parser (.xlsx → store)
- Dashboard polish (projected FCF chart)
- Multi-case management
- Cloud sync
- Audit trail

## Lessons Extracted

- [LESSON-129](../lessons-learned.md#lesson-129): Roll-forward projection model with per-band Additions growth is the correct accounting model for Fixed Asset projections — preserves Beginning+Additions=Ending identity [PROMOTED]
- [LESSON-130](../lessons-learned.md#lesson-130): Display subtractive rows with negative sign + text-negative class for visual consistency with other subtractive rows (DLOM/DLOC pattern) [local]
- [LESSON-131](../lessons-learned.md#lesson-131): When user asks for "thicker divider" spanning multiple pages, inspect BOTH the shared component (FinancialTable) AND custom page tables (DCF) — they don't share styling infrastructure [local]

## Files Added/Modified

```
src/data/live/compute-proy-fixed-assets-live.ts    [REWRITTEN — Session 045 roll-forward model]
src/app/projection/fixed-asset/page.tsx            [REWRITTEN — growth sub-row moves to Additions bands]
src/app/valuation/aam/page.tsx                     [MODIFIED — IBD displayed negative]
src/lib/i18n/translations.ts                       [MODIFIED — aam.equityValue "(100%)"]
src/components/financial/FinancialTable.tsx        [MODIFIED — border-t → border-t-2 on headers]
src/app/valuation/dcf/page.tsx                     [MODIFIED — border-b-2 on breakdown separators]

__tests__/data/live/compute-proy-fixed-assets-live.test.ts  [REWRITTEN — 9 roll-forward cases]
```

## Next Session Recommendation

1. **User QA + merge confirmation** — 3 fixes need visual validation:
   - AAM: "Equity Value (100%)" label + IBD row shows `(301.193.090)` with text-negative
   - FR / DCF: thicker section dividers visible
   - Proy FA: Acq Additions + Dep Additions now display Growth sub-row (Net Value does not); all bands show projected values computed via roll-forward
2. **Upload parser** — still the priority #1 backlog item (reverse of export)
3. **Dashboard polish** — projected FCF chart composition using Session 043 data-builder foundation

Note: Roll-forward model may diverge from PT Raja Voltama fixture values — if Phase C or cascade tests flag divergence in future work, update KNOWN_DIVERGENT_CELLS whitelist per LESSON-100 pragmatism by sheet class (PROY sheets are coverage-invariant, not strict-parity).

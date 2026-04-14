# Session 021 — UX Fixes, Auto-Save, PageEmptyState, AAM Per-Row Adjustments

**Date**: 2026-04-14
**Scope**: 2 batches — (A) BS sentinel fix, PageEmptyState, CFS analysis, AP input; (B) DLOM scroll fix, IS data loss fix, remove FormulaTooltip, auto-save everywhere, AAM per-row adjustments
**Branch**: main (2 direct commits)

## Goals
- [x] BS year button labels standardization (match FA/IS)
- [x] BS sentinel cross-ref bug fix (Financial Ratio live mode)
- [x] Generalize AnalysisEmptyState → PageEmptyState universal
- [x] Deploy ANALISIS — Cash Flow Statement page
- [x] Deploy INPUT DATA — Acc Payables page
- [x] Fix DLOM scroll jump on Faktor 6-10 selection
- [x] Fix IS Depreciation/Tax data lost on navigation
- [x] Remove FormulaTooltip from entire website
- [x] Remove SIMPAN buttons + auto-save everywhere
- [x] AAM per-row Penyesuaian (D) editable + remove top input

## Delivered

### Batch A (commit 8a33b13)

#### BS Year Button Labels
- `src/lib/i18n/balance-sheet.ts` — 6 strings changed to match FA/IS standard
- Unicode minus `−` standardized

#### BS Sentinel Cross-Ref Bug (CRITICAL)
- Root cause: `DynamicBsEditor.tsx` sentinel pre-computation excluded FA cross-ref values (rows 20/21)
- Fix: extracted `computeBsCrossRefValues()` pure function, include via `useKkaStore.getState()` at persist time
- Added `useEffect` to re-persist when FA data changes
- Impact: all Financial Ratios now correct (Debt+Equity ≈ 100%)

#### PageEmptyState Universal
- `src/components/shared/PageEmptyState.tsx` — generalized from AnalysisEmptyState with `section` prop
- 18 pages updated across INPUT DATA, ANALISIS, PROYEKSI, PENILAIAN, RINGKASAN
- `AnalysisEmptyState.tsx` deleted

#### Cash Flow Statement (ANALISIS)
- `src/app/analysis/cash-flow-statement/page.tsx` — new page
- `CashFlowLiveView` updated with PageEmptyState guard
- Added to nav-tree under ANALISIS

#### Acc Payables (INPUT DATA)
- `src/app/input/acc-payables/page.tsx` — custom form for ST/LT Bank Loan Schedules
- 2 sections: ST (rows 9-14) + LT (rows 18-23), computed Beginning/Ending
- Added to nav-tree under INPUT DATA

### Batch B (commit 1a78c72)

#### DLOM Scroll Jump Fix
- Root cause: `<label>` in QuestionnaireForm missing `position: relative`, sr-only input absolute positioning caused scroll jump
- Fix: single class `relative` added to label

#### IS Depreciation/Tax Data Loss Fix
- Root cause: `IS_SENTINEL_ROWS` included rows 21 (Depreciation) and 33 (Tax) — fixed leaf rows incorrectly filtered out during editor remount
- Fix: `IS_COMPUTED_SENTINEL_ROWS` constant excludes rows 21/33

#### FormulaTooltip Removed
- Removed from `FinancialTable.tsx`, deleted `FormulaTooltip.tsx`
- Cleaned unused `formula`/`year` props from NumericCell

#### Auto-Save Everywhere
- Removed SIMPAN buttons from 7 editors (BS, IS, FA, AP, WACC, DR, HOME)
- HomeForm converted from submit-based to onBlur auto-save with beforeunload flush
- All editors show "Otomatis tersimpan" indicator

#### AAM Per-Row Penyesuaian
- Replaced `faAdjustment: number` with `aamAdjustments: Record<number, number>`
- Store v13→v14 migration (converts old faAdjustment → aamAdjustments[22])
- `computeAam`: `faAdjustment` → `totalAdjustments`, all inputs pre-adjusted by caller
- `buildAamInput`: applies per-row adjustments (C + D for each BS row)
- AAM page: editable D column inputs, removed top "Penyesuaian Aset Tetap" card
- Updated: dashboard, EEM, simulasi-potensi, export cell mapping

## Verification
```
Tests:     838/838 passing (57 files)
Build:     ✅ 34 static pages
Typecheck: ✅ clean
Lint:      ✅ clean
Store:     v14
```

## Stats
- Commits: 2
- Files changed: 47
- Lines +844/-597
- Test cases: 837→838 (+1 migration test)
- New pages: 2 (CFS analysis, AP input)
- Deleted: 1 (FormulaTooltip.tsx)

## Lessons Extracted
- [LESSON-058](../lessons-learned.md#lesson-058): BS sentinel must include FA cross-ref at persist time
- [LESSON-059](../lessons-learned.md#lesson-059): IS_SENTINEL_ROWS vs fixed leaf rows — separate constants
- [LESSON-060](../lessons-learned.md#lesson-060): sr-only inputs need positioned parent
- [LESSON-061](../lessons-learned.md#lesson-061): Replace scalar adjustments with per-row Record for AAM

## Next Session Recommendation
1. Upload parser (.xlsx → store) — reuses cell-mapping registry
2. RESUME page — final summary comparing DCF/AAM/EEM
3. Bilingual toggle incremental rollout
4. Export IS/FA RINCIAN detail sheets
5. Dashboard polish

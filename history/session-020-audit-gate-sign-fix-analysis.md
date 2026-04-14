# Session 020 — Audit Gate + IS Sign Fix + Analysis Live Mode

**Date**: 2026-04-14
**Scope**: Full INPUT DATA audit gate, IS sign convention fix, Common Size/Growth YoY columns, ANALISIS pages live-only mode, HISTORIS hidden
**Branch**: main (5 direct commits)

## Goals
- [x] Audit gate: verify 3 INPUT DATA foundations (BS, IS, FA)
- [x] Fix FA sentinel pre-computation (CRITICAL — downstream getting zeros)
- [x] Fix BS sentinel pre-computation (extended accounts invisible)
- [x] Fix IS double-negation (expenses adding instead of subtracting)
- [x] Add Common Size + Growth YoY to BS/IS INPUT DATA
- [x] Key Drivers auto-integration from IS data
- [x] ANALISIS pages: remove seed fallback, add empty state with redirect
- [x] Hide HISTORIS from sidebar
- [x] Remove "PT Raja Voltama Elektrik" from all pages

## Delivered

### Audit Gate (commit a990530)
- 4 parallel audit agents (BS, IS, FA, cross-cutting)
- FA CRITICAL: dynamic editor stored at offset keys (2008/4008/5008), all 12+ downstream got zeros
- `computeFaSentinels()` — maps offset rows to legacy positions + 7 subtotals at persist time
- BS sentinel pre-computation — 10 subtotals include extended catalog accounts
- Downstream merge order flipped: `{ ...recomputed, ...storeRows }` in 10 files
- yearCount capped at 10 for all 3 editors
- Dead code removed from store migration
- Full report: `audit-reports/findings.md`

### IS Sign Convention Fix (commit 2956778)
- Root cause: `buildDynamicIsManifest` used signed computedFrom `[6, -7]` but Excel uses plain SUM (expenses negative)
- User enters COGS as -33B → formula did Revenue - (-33B) = Revenue + 33B (double-negation)
- Fix: 5 computedFrom changed to plain addition matching Excel convention
- NOPLAT adapter: 3 rows add *-1 (matching Excel `IS!D27*-1`)
- CFS adapter: rows 6, 24 remove wrong negation (Excel reads IS directly)
- 4 test files updated: loadIsLeaves reads fixture directly, no sign flip

### Common Size + Growth YoY (commit 9eac134)
- RowInputGrid extended with `commonSize`, `commonSizeYears`, `growth`, `growthYears` props
- BS: Common Size = % of Total Assets (row 27), Growth YoY when ≥2 years
- IS: Common Size = % of Revenue (row 6), Growth YoY when ≥2 years
- Uses existing `ratioOfBase` + `yoyChangeSafe` primitives
- Key Drivers: auto-populate COGS ratio, OpEx ratio, Tax rate from IS store

### ANALISIS Live-Only + HISTORIS Hidden (commit 98c1685)
- New `AnalysisEmptyState` component: checklist of required inputs + redirect buttons
- 6 ANALISIS pages guard: show empty state when INPUT DATA incomplete, live data when complete
- HISTORIS section removed from sidebar navigation
- "PT Raja Voltama Elektrik" removed from DataSourceHeader

## Verification
```
Tests:     837/837 passing (57 files)
Build:     ✅ 32 static pages
Typecheck: ✅ clean
Lint:      ✅ clean
```

## Stats
- Commits: 5
- Files changed: 34
- Lines: +733 / -134
- New components: 2 (AnalysisEmptyState, computeFaSentinels)

## Lessons Extracted
- [LESSON-054](../lessons-learned.md#lesson-054): Excel plain addition convention
- [LESSON-055](../lessons-learned.md#lesson-055): Sentinel pre-computation pattern for all dynamic sheets
- [LESSON-056](../lessons-learned.md#lesson-056): Merge order for sentinel priority

## Next Session Recommendation
1. Upload parser (.xlsx → store)
2. RESUME page
3. Bilingual toggle incremental rollout
4. Export IS/FA RINCIAN detail sheets
5. Dashboard polish

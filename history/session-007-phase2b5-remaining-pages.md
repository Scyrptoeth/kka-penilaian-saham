# Session 007 — Phase 2B.5 Four Remaining P1 Pages

**Date**: 2026-04-11 / 2026-04-12
**Scope**: Ship Cash Flow Statement, Fixed Asset Schedule, NOPLAT, and
Growth Revenue pages — reach 8 live financial tables total. Pure
manifest authoring, zero new code outside `src/data/manifests/` and
`src/data/seed/loader.ts`. Validate that Session 2B.6.1 declarative
pipeline scales from 4 → 8 sheets with no patches.
**Branch**: main (direct — additive only, no refactor, no new tests)

## Goals (dari `plan.md` awal sesi)

- [x] Step 0: Sync `noplat` + `growth-revenue` fixtures + extend `SheetSlug` / `SheetManifest.slug` unions
- [x] Step 1: Cash Flow Statement manifest + 11-line page
- [x] Step 2: Fixed Asset Schedule manifest + 11-line page
- [x] Step 3: NOPLAT manifest + 11-line page
- [x] Step 4: Growth Revenue manifest + 11-line page
- [x] Step 5: Remove `wip: true` from 4 nav-tree entries
- [x] Step 6 (bonus, no commit in plan): plan.md snapshot + verification gauntlet + GitHub push + Vercel production deploy + live smoke test

## Delivered

### Step 0 — Fixture sync + type extension (`c741811`)
- `scripts/copy-fixtures.cjs`: `SHEETS` array grown from 6 → 8
- `node scripts/copy-fixtures.cjs`: 8/8 fixtures copied → `src/data/seed/fixtures/`
- `src/data/seed/loader.ts`: +2 imports, +2 members to `SheetSlug` union, +2 entries in `FIXTURES` record
- `src/data/manifests/types.ts`: `SheetManifest.slug` union extended to accept `'noplat'` + `'growth-revenue'`

### Step 1 — Cash Flow Statement (`d8e1355`)
- `src/data/manifests/cash-flow-statement.ts` (178 lines, data-only)
  - Years 2019-2021, columns C/D/E
  - Row structure: EBITDA/Tax → CFO block → CFNO → CFI → Cash Flow Before Financing → Financing block → Net Cash Flow → Cash beginning/ending balances → cash-in-bank / cash-on-hand breakdown
  - **No derivations** — cash-flow items cross zero, YoY growth unstable (→ LESSON-023)
  - Label fidelity: two workbook typos corrected ("New Lloan" → "New Loan", "Interenst" → "Interest")
  - Formula descriptions embedded per row, sourced from actual workbook cell formulas
- `src/app/historical/cash-flow/page.tsx` — 11 lines, identical `<SheetPage>` pattern

### Step 2 — Fixed Asset Schedule (`6b8e66b`)
- `src/data/manifests/fixed-asset.ts` (153 lines)
  - Three-section roll-forward: A. Acquisition Costs + B. Depreciation + C. Net Value Fixed Assets
  - 6 asset categories × 9 sub-blocks (3 + 3 + 3 × 6 categories) = 54 data rows generated via local `categoryRows(startRow, labels)` helper (→ LESSON-025)
  - Sub-headers `Beginning`, `Additions`, `Ending` rendered as `type: 'header'` (non-data separator rows)
  - Sub-block Totals at rows 14/23/32 (Acq) + 42/51/60 (Dep) + 69 (Net Value) → `type: 'subtotal'` or `total`
  - No derivations (raw schedule, not a flow)
- `src/app/historical/fixed-asset/page.tsx` — 11 lines

### Step 3 — NOPLAT (`0ed612c`)
- `src/data/manifests/noplat.ts` (146 lines)
  - Years 2019-2021, columns C/D/E
  - EBIT chain: PBT → add-back Interest Exp → less Interest Inc → less Non-Op → EBIT subtotal
  - Tax-on-EBIT block: Tax Provision → Tax Shield add → Tax on Int Inc less → Tax on Non-Op → Total Taxes
  - NOPLAT total = EBIT − Total Taxes
  - **Derivations: `[{ type: 'yoyGrowth', safe: true }]`** — single-signed data, meaningful growth
  - **No `growthColumns`** — workbook has no pre-computed growth cells, tooltip shows description only
  - Pre-signed convention (LESSON-011) documented in manifest JSDoc, Phase 3 roadmap linked to `toNoplatInput` adapter
- `src/app/analysis/noplat/page.tsx` — 11 lines

### Step 4 — Growth Revenue (`0529e89`)
- `src/data/manifests/growth-revenue.ts` (75 lines)
  - **First 4-year manifest** in the project (2018-2021)
  - **First manifest to start values from column B**: `columns: { 2018: 'B', 2019: 'C', 2020: 'D', 2021: 'E' }` (→ LESSON-024)
  - Renders 2 sections: DATA PENJUALAN (rows 8-9: Penjualan + Laba Bersih) + DATA PENJUALAN/PENDAPATAN INDUSTRI (rows 40-41: user-input placeholder)
  - Derivations: `[{ type: 'yoyGrowth', safe: true }]`
  - `growthColumns: { 2019: 'H', 2020: 'I', 2021: 'J' }` — primitive generates the numeric value, tooltip surfaces the raw Excel formula from H/I/J cells for verification fidelity
- `src/app/analysis/growth-revenue/page.tsx` — 11 lines

### Step 5 — Nav activation (`f547c62`)
- `src/components/layout/nav-tree.ts` — removed `wip: true` from:
  - Historis → Cash Flow
  - Historis → Fixed Asset
  - Analisis → NOPLAT
  - Analisis → Growth Revenue
- **Preserved** `wip: true` on: Analisis → ROIC, DLOM, DLOC (PFC); all Proyeksi; all Penilaian; Ringkasan → Dashboard

### Bonus — plan.md snapshot (`fb40612`)
- `plan.md` rewritten end-of-session with pre-flight fixture analysis table, per-sheet derivation decisions, final verification evidence (build/test/typecheck/lint + dev-server smoke tests with real numeric values)

## Verification

```
Tests:     107 / 107 passing (15 files) — unchanged, zero new tests added
Build:     ✅ 13 routes, 8 static financial pages (up from 4), 0 errors
Typecheck: ✅ tsc --noEmit exit 0
Lint:      ✅ zero warnings
```

### Dev-server smoke tests (all 4 new pages)

- `/historical/cash-flow` → 200; EBITDA 2019-2021 = `6.048.346.987 · 6.413.419.305 · 7.493.446.732` matches fixture C5/D5/E5 (IS!D18/E18/F18)
- `/historical/fixed-asset` → 200; "Acquisition Costs", "TOTAL NET FIXED ASSETS" labels present
- `/analysis/noplat` → 200; PBT 2019 = `5.874.471.249` (IS!D32), NOPLAT 2019-2021 = `4.405.853.437 · 4.876.619.594 · 5.720.109.965` (C19/D19/E19)
- `/analysis/growth-revenue` → 200; Penjualan 2019-2020 = `52.109.888.424 · 59.340.130.084` (matches IS!D6/E6 via reference)

### Production smoke tests (after GitHub push + Vercel deploy)

- `kka-penilaian-saham-d6dhb2apt-scyrptoeths-projects.vercel.app` → ● Ready, 25s build, Production alias
- All 4 new routes HTTP 200 on `https://kka-penilaian-saham.vercel.app`
- Numeric values identical to dev server — production deploy = local build, no drift

## Stats

- **Commits**: 7 atomic (6 feature/chore per plan + 1 docs plan snapshot)
- **Files added**: 9
  - 4 manifests (cash-flow-statement, fixed-asset, noplat, growth-revenue)
  - 4 page files (11 lines each)
  - 2 fixture JSONs (noplat.json, growth-revenue.json) synced to `src/data/seed/fixtures/`
- **Files modified**: 4 (copy-fixtures.cjs, loader.ts, types.ts, nav-tree.ts) + plan.md
- **Net delta**: +2487 / −95 lines (fixture JSONs dominate bulk; manifest authoring is ~550 lines of TypeScript data)
- **Test cases added**: 0 — builder/derivation engine is untouched, existing 107 tests cover the pipeline
- **New dependencies**: 0

## Deviations from Plan

**Zero.** The plan drafted at the start of the session described exactly 6 commits (Steps 0-5). Delivered 6 + 1 bonus docs commit (`fb40612` for `plan.md` snapshot). No tasks deferred, no tasks added mid-flight, no tasks completed with deviation.

The bonus commit was added because `plan.md` was actively updated during Step 6 (final verification) with real verification evidence, and the wrap-up skill needs the plan snapshot on disk to read at session close — it would have been staged by Mode B regardless, so committing it during the session cleans the working tree before push.

## Deferred

None from this session. The Phase 2B.5 scope as defined in
`PROMPT-CLI-PHASE2B5-REMAINING-PAGES.md` is fully shipped.

Deferred items inherited from Session 006 (unchanged):
- Input forms replacing seed data (Session 3+)
- `toRatiosInput` adapter + FR calc-engine wiring (Session 3+)
- FCF migration to pipeline mode via `toFcfInput` (Session 3+, adapter exists)
- Projection sheets (PROY LR, PROY BS, PROY CF, PROY NOPLAT) — requires KEY DRIVERS form first
- WACC / Discount Rate (CAPM), DCF, AAM, EEM valuation methods
- DLOM / DLOC questionnaire forms (12-factor + 8-factor)
- Dashboard charts with Recharts
- Export to .xlsx via ExcelJS (scaffold exists, `lib/export/` empty)
- Dark mode toggle

## Lessons Extracted

- [LESSON-023](../lessons-learned.md#lesson-023): Cash-flow sheets skip `yoyGrowth` — line items cross zero, derivation becomes numerical noise. [**promoted** to start skill]
- [LESSON-024](../lessons-learned.md#lesson-024): `manifest.columns` is fully year-agnostic — any column letter, any year count works without code changes. [**promoted** to start skill]
- [LESSON-025](../lessons-learned.md#lesson-025): Tactical DRY helpers live inside the manifest file, never promoted to `build.ts`. [**promoted** to start skill]

## Files & Components Added/Modified

```
scripts/copy-fixtures.cjs                       [MODIFIED]  +2 slugs
src/data/seed/loader.ts                         [MODIFIED]  +2 imports, +2 unions, +2 FIXTURES
src/data/manifests/types.ts                     [MODIFIED]  +2 slug union members
src/data/manifests/cash-flow-statement.ts       [NEW]       178 lines
src/data/manifests/fixed-asset.ts               [NEW]       153 lines (w/ local categoryRows helper)
src/data/manifests/noplat.ts                    [NEW]       146 lines
src/data/manifests/growth-revenue.ts            [NEW]       75 lines
src/app/historical/cash-flow/page.tsx           [NEW]       11 lines
src/app/historical/fixed-asset/page.tsx         [NEW]       11 lines
src/app/analysis/noplat/page.tsx                [NEW]       11 lines
src/app/analysis/growth-revenue/page.tsx        [NEW]       11 lines
src/data/seed/fixtures/noplat.json              [NEW]       synced from __tests__/fixtures
src/data/seed/fixtures/growth-revenue.json      [NEW]       synced from __tests__/fixtures
src/components/layout/nav-tree.ts               [MODIFIED]  −4 wip:true flags
plan.md                                         [MODIFIED]  session 007 snapshot for Mode B
```

## Architecture Validation

Session 007 validates the Session 2B.6 + 2B.6.1 bet: the rendering
pipeline scales to new sheets without code changes. Evidence:

| Metric | Before Session 007 | After Session 007 | Δ |
|---|---|---|---|
| Static financial pages | 4 | 8 | +4 |
| Manifest files | 4 | 8 | +4 |
| New `build.ts` functions | 0 | 0 | 0 |
| New primitives in `types.ts` | 0 | 0 | 0 |
| New tests | 0 | 0 | 0 |
| Patch commits (bolt-on fixes) | 0 | 0 | 0 |

The pipeline graduated from "patch mode" (4 patches landed in Session 2B.6) to "pure data authoring" (4 sheets landed in Session 2B.5 with zero patches). Confidence is now high that any future historical/analysis sheet — and likely most projection sheets — will also land as pure manifest authoring.

Cost per future sheet estimate: **~20 minutes** of manifest authoring (fixture inspect → row structure transcription → derivation choice → 11-line page). Sheets with unusual structure (like Growth Revenue's 4-year-column-B layout) cost marginally more only for the up-front decision work, not for any code changes.

## Next Session Recommendation

**Remaining P2 analysis sheets** (straightforward manifest authoring):
1. `/analysis/roic` — ROIC breakdown. Uses NOPLAT + Invested Capital. Small sheet (~28 rows). Can wire through existing calc engine or ship as seed-mode like FR/FCF/NOPLAT did.

**Questionnaire forms** (first truly new UI — not manifest authoring):
2. `/analysis/dlom` — 12-factor Discount for Lack of Marketability form. Needs: input-form component (likely client component), weighted-sum output, live score display.
3. `/analysis/dloc-pfc` — 8-factor Discount for Lack of Control form. Same pattern as DLOM.

**Phase 3 — KEY DRIVERS form + projection chain** (blocks all downstream projection work):
4. KEY DRIVERS input form (COGS ratio, expense ratios, tax rate) — user-input replacing seed data. This unlocks PROY L/R → PROY BS → PROY CF → PROY NOPLAT.

**Valuation methods** (Phase 4 — requires projections):
5. WACC (CAPM with Beta/Ke/Kd) → DCF (FCFF model)
6. AAM (Adjusted Asset Method) + EEM (Excess Earnings Method)
7. Dashboard summary with Recharts + .xlsx export via ExcelJS

**Proposed next session (Session 008)**: ROIC page + DLOM questionnaire form.
The ROIC page is pure manifest authoring (≤30 min per current estimate), making it a natural warm-up. DLOM is the first non-manifest work in months — a good point to exercise the form + client component + weighted-computation path without also bringing in projection/valuation complexity.

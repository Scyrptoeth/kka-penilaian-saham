# Session 007 Plan — Phase 2B.5: Four Remaining P1 Pages

**Date**: 2026-04-11
**Branch**: main (direct — pure additive manifest authoring, no refactor)
**Scope**: Ship Cash Flow Statement, Fixed Asset Schedule, NOPLAT, and
Growth Revenue pages to reach 8 live financial tables total. No new
components, no new helpers in `build.ts`, no new tests — pure data
authoring against the existing 2B.6.1 declarative pipeline.

Prompt source: `../PROMPT-CLI-PHASE2B5-REMAINING-PAGES.md`

---

## Pre-flight Evidence Gathered Before Writing Any Code

| Sheet                 | Years      | Columns    | Key rows (confirmed from fixture) | Derivations                                   |
|-----------------------|------------|------------|------------------------------------|-----------------------------------------------|
| cash-flow-statement   | 2019-2021  | C/D/E      | 5,6 (EBITDA,Tax) · 7-11 (CFO block) · 13 · 17 · 19 · 21-28 (Financing) · 30 · 32-36 | none (YoY/common-size not meaningful on CF items) |
| fixed-asset           | 2019-2021  | C/D/E      | A: 8-14,17-23,26-32 · B: 36-42,45-51,54-60 · Net: 63-69 | none (raw schedule)                           |
| noplat                | 2019-2021  | C/D/E      | 7-11 (EBIT chain) · 13-17 (taxes) · 19 (NOPLAT) | `yoyGrowth` only                              |
| growth-revenue        | **2018-2021** | **B/C/D/E** (4 years from column B) | 8 (Penjualan), 9 (Laba Bersih), 40-41 (Industri placeholder) | `yoyGrowth` + `growthColumns: H/I/J` for tooltip fidelity |

Key decisions made from this evidence:
- CFS drops derivations — cash-flow lines routinely cross zero, YoY %
  growth explodes meaninglessly around those transitions.
- Fixed Asset drops derivations — it's a roll-forward schedule, not a
  flow. Category lines stay static year-to-year by design.
- NOPLAT uses `yoyGrowth` but no `growthColumns` because the workbook
  has no pre-computed growth cells — the tooltip shows description only.
- Growth Revenue uniquely starts at column B (first 4-year manifest in
  the project) and carries `growthColumns: H/I/J` so the Excel formula
  surfaces in the tooltip while the primitive still produces the value.
- Fixed Asset renders a tiny local `categoryRows()` helper **inside
  the manifest file** to collapse 18 near-identical category rows —
  still pure data authoring, still zero imports outside the manifest.

## Tasks (6 commits, atomic)

1. **Step 0** — `chore: sync noplat + growth-revenue fixtures and extend SheetSlug`
   - `scripts/copy-fixtures.cjs`: add 2 slugs
   - `node scripts/copy-fixtures.cjs`: 8/8 copied
   - `src/data/seed/loader.ts`: imports + `SheetSlug` union + `FIXTURES` map
   - `src/data/manifests/types.ts`: extend `SheetManifest.slug` union
   - Verify: `npx tsc --noEmit` clean

2. **Step 1** — `feat: add Cash Flow Statement page`
   - `src/data/manifests/cash-flow-statement.ts` (raw CFS layout, no derivations)
   - `src/app/historical/cash-flow/page.tsx` (11-line `<SheetPage>`)
   - Verify: build lists `/historical/cash-flow` as static

3. **Step 2** — `feat: add Fixed Asset Schedule page`
   - `src/data/manifests/fixed-asset.ts` (A acquisition → B depreciation → Net, local `categoryRows()` helper)
   - `src/app/historical/fixed-asset/page.tsx`
   - Verify: build lists `/historical/fixed-asset` as static

4. **Step 3** — `feat: add NOPLAT page`
   - `src/data/manifests/noplat.ts` (EBIT chain → Tax block → NOPLAT total, yoyGrowth)
   - `src/app/analysis/noplat/page.tsx`
   - Verify: build lists `/analysis/noplat` as static

5. **Step 4** — `feat: add Growth Revenue page`
   - `src/data/manifests/growth-revenue.ts` (4 years B-E, yoyGrowth + growthColumns H/I/J)
   - `src/app/analysis/growth-revenue/page.tsx`
   - Verify: build lists `/analysis/growth-revenue` as static

6. **Step 5** — `chore: activate 4 new pages in navigation`
   - `src/components/layout/nav-tree.ts`: remove `wip: true` from 4 entries
     (Cash Flow, Fixed Asset, NOPLAT, Growth Revenue only — not ROIC/DLOM/DLOC)

**Step 6 (no commit) — Final verification** that writes this plan.md
snapshot for the Mode B wrap-up skill to read when the user runs
`/update-kka-penilaian-saham` at session close.

## Non-negotiables (all met per LESSON-019)

- Every page file is 11 lines, identical shape, only the manifest import and metadata title differ.
- Every sheet-specific knob lives in the manifest: column letters, anchor rows, derivation specs, label text, formula descriptions.
- Zero new code in `components/`, `lib/`, or `build.ts` — only additive data in `data/manifests/` and `data/seed/loader.ts`.
- Zero new tests added — existing 107 tests continue to pass because the builder/derivation engine is untouched.
- `[[...slug]]` catch-all routes in `historical/` and `analysis/` remain untouched — Next.js' static-segment priority takes precedence automatically.

## Final Verification Evidence (captured 2026-04-11)

```
Build:      ✅ 13 routes total, 8 static financial pages (up from 4)
Tests:      ✅ 107/107 passing (15 files) — unchanged
Typecheck:  ✅ tsc --noEmit exit 0
Lint:       ✅ zero warnings
Commits:    6 (Steps 0-5, all atomic conventional-commits)
Net delta:  +9 files, ~600 lines of manifest data
```

### Smoke test — real numeric data on all 4 new pages (dev server)

- `/historical/cash-flow` → 200
  - EBITDA 2019-2021: `6.048.346.987 · 6.413.419.305 · 7.493.446.732` (matches fixture C5/D5/E5, i.e. IS!D18/E18/F18)
- `/historical/fixed-asset` → 200
  - Renders "Acquisition Costs" and "TOTAL NET FIXED ASSETS" markers
- `/analysis/noplat` → 200
  - Profit Before Tax 2019 = `5.874.471.249` (matches IS!D32)
  - NOPLAT 2019-2021 = `4.405.853.437 · 4.876.619.594 · 5.720.109.965` (matches C19/D19/E19)
- `/analysis/growth-revenue` → 200
  - Penjualan 2019-2020 = `52.109.888.424 · 59.340.130.084` (matches IS!D6/E6)

Every boundary from `kka-penilaian-saham.xlsx` → Python extraction →
fixture JSON → seed loader → manifest builder → `applyDerivations` →
`<SheetPage>` → `<FinancialTable>` → HTML response is green.

## Architecture holdfast

This session validates the Session 2B.6 + 2B.6.1 bet: the entire
rendering pipeline scales to new sheets without code changes. The
pipeline graduated from "patch mode" (4 patches landed in Session 5)
to "pure data authoring" (4 sheets landed in Session 7, zero patches).

Next sheet added will be the same shape: create manifest, create
11-line page, optionally add fixture slug, flip `wip:true` to absent.
Predicted cost per future P2/P3 sheet: ~20 min of manifest authoring.

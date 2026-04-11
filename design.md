# Design — KKA Penilaian Saham (Session 2A: Calc Engines)

## Problem

Phase 1 delivers HOME + Balance Sheet + Income Statement calculation engines. Phase 2 must add 6 calculation modules covering the analysis layer of the valuation workbook: Fixed Asset Schedule, NOPLAT, FCF, Cash Flow Statement, Financial Ratios, Growth Revenue. These are pure TypeScript functions validated against Excel ground truth via Vitest fixtures.

Phase 2 total scope (6 calc modules + `<FinancialTable>` + 8 pages + sidebar) exceeds 10-task-per-plan limit, so it is split: **Session 2A = calc engines only**, Session 2B = UI layer.

## Approach

Implement 6 pure-function modules under `src/lib/calculations/` in dependency order:

1. `fixed-asset.ts` — no dependency (reads raw acquisition/depreciation data)
2. `noplat.ts` — depends on Income Statement primitives
3. `fcf.ts` — depends on `noplat.ts` + `fixed-asset.ts`
4. `cash-flow.ts` — depends on IS + BS + `acc-payables.json` hidden fixture
5. `ratios.ts` — depends on IS + BS (already available)
6. `growth-revenue.ts` — depends on IS

Per module: inspect specific fixture rows, write RED test asserting expected Excel values at **12-decimal precision**, implement GREEN with minimal code, commit.

## Key Decisions

1. **Precision 12 decimal digits** (`toBeCloseTo(expected, 12)`) — continues Session 1 convention.
2. **Sample 3–5 representative rows per module** — consistent with Session 1 (BS row 8, IS rows 8/22/35). Prioritize totals + critical derived rows over full coverage.
3. **Shared types live in `helpers.ts`**. Calculation modules import them, never re-export. Barrel `index.ts` only re-exports *functions*, never *types*, to avoid TS duplicate-symbol errors (lesson from Session 1).
4. **Fixture-driven, not label-driven**. Session 1 lesson: IS columns labeled "COMMON SIZE" actually contain YoY growth for revenue rows. Always read the formula from the fixture and replicate that exact formula in TypeScript.
5. **Ratios: implement all 19 in-sheet ratios** across 4 sections (Profitability 6, Liquidity 3, Leverage 5, Cash-Flow Indicator 5). Test 5 representative: GPM, NPM, ROE, DER, Current Ratio.
6. **Fixed Asset schedule**: model the full matrix (Beginning × Additions × Disposals × Ending) per category; expose both the per-category schedule and the depreciation totals that FCF and Cash Flow consume.
7. **Cash Flow Statement**: read `ACC PAYABLES` hidden sheet from `__tests__/fixtures/acc-payables.json` as input, do not hardcode numbers.
8. **Growth Revenue**: implement YoY only for Company data (rows 8 Penjualan + 9 Laba Bersih). Industry and NSK comparison tables are Session 2B/UI concerns.

## Success Criteria

- `npm test -- --run` — at least 40 tests passing (21 existing + ~20 new). Zero failures.
- `npm run build 2>&1 | tail -25` — zero errors, zero warnings.
- `npm run lint` — clean.
- `npx tsc --noEmit` — clean.
- 6 new modules committed with conventional commit messages (one module per commit).
- `progress.md` updated with Session 2A summary.
- Merged to `main` and pushed (Vercel deploy triggered).

## Out of Scope (deferred to Session 2B+)

- `<FinancialTable>` reusable component
- Historical pages (`/historical/{balance-sheet,income-statement,cash-flow,fixed-asset}`)
- Analysis pages (`/analysis/{ratios,fcf,noplat,growth}`)
- Sidebar navigation update with new routes
- Projection sheets (`PROY LR`, `PROY BS`, `PROY CF`, `PROY NOPLAT`, `KEY DRIVERS` form)
- WACC / Discount Rate
- DCF / AAM / EEM valuation methods
- DLOM / DLOC questionnaire forms
- Dashboard charts (Recharts)
- `.xlsx` export via ExcelJS
- Dark mode toggle

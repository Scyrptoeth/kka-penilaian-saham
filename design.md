# Design — Session 050: Key Drivers Auto Read-Only

**Date**: 2026-04-19
**Branch**: `feat/session-050-kd-auto-readonly`
**Scope**: Revamp INPUT DATA → Key Drivers so that (A) Cost & Expense Ratios (COGS/Selling/G&A) become auto-populated read-only from IS average common size, and (B) Additional Capex section becomes auto-populated read-only from Proy Fixed Asset ADDITIONS band extended to 7 projection years.

## Problem Statement

After Session 049 made `cogsRatio` / `sellingExpenseRatio` / `gaExpenseRatio` dead fields (compute doesn't read them), the KD form still accepts manual user input for these ratios — silent UX debt. Similarly Additional Capex is currently user-editable 7-year grid with all-zero defaults that ignore upstream Proy FA projections. User wants both groups fully auto-derived and read-only, aligned with existing LESSON-115 cross-sheet mirror pattern (Session 041 depreciation from FA).

## Chosen Approach

1. **Introduce pure helper `buildKdAutoValues(input): KdAutoValues`** (new module `src/lib/calculations/kd-auto-values.ts`) that:
   - Computes `cogsRatio = avg common size of IS row 7 (Total COGS) vs IS row 6 (Revenue) across histYears`
   - Computes `totalOpExRatio = avg common size of IS row 15 (Total Operating Expenses excl. Depreciation) vs row 6`
   - Returns `{ cogsRatio, sellingExpenseRatio: totalOpExRatio / 2, gaExpenseRatio: totalOpExRatio / 2, additionalCapexByAccount }`
   - Additional Capex derived by calling `computeProyFixedAssetsLive({ accounts, faRows, historicalYears }, projYears_7)` and extracting per-account ADDITIONS band (FA_OFFSET.ACQ_ADDITIONS) as `YearKeyedSeries`
2. **`computeProjectionYears(tahunTransaksi, count?)` accepts optional count** (default `PROJECTION_YEAR_COUNT`). KeyDriversForm calls with `count = 7` to widen Proy FA compute to cover full KD horizon.
3. **KeyDriversPage** computes via `buildKdAutoValues` → passes `kdAuto` prop to KeyDriversForm.
4. **KeyDriversForm** useMemo combines store state + kdAuto (auto values take precedence for the 3 ratios + additionalCapexByAccount). useEffect fires on `kdAuto` change to persist values back to store (LESSON-115 mirror-pattern, matching Session 041 depreciation).
5. **UI input fields** for cogsRatio / sellingExpenseRatio / gaExpenseRatio + Additional Capex cells become `readOnly` + `aria-readonly="true"`, visually muted (`text-ink-muted cursor-not-allowed`), with bilingual tooltip "Auto-populated dari INPUT DATA → Income Statement" / "PROJECTION → Proy. Fixed Asset".
6. **Bilingual section notes** above Cost & Expense Ratios + Additional Capex: "Nilai dihitung otomatis dari …" (ID) / "Values auto-computed from …" (EN).

## Sign Convention

- Store writes **positive** `cogsRatio/sellingExpenseRatio/gaExpenseRatio` (user-expected sign, consistent with existing `isAutoRatios.cogsRatio = Math.abs(...)`)
- KeyDriversBuilder export boundary continues to negate via `reconcileRatioSigns` (LESSON-112 Session 040 preserved)
- `additionalCapexByAccount` stored as **positive** magnitudes (FA ACQ_ADDITIONS band is positive)

## Out of Scope

- Proy Fixed Asset **page display** stays at 3 projection years (unchanged `PROJECTION_YEAR_COUNT = 3`). Only KD internal compute widens to 7.
- Proy LR / Proy BS / Proy NOPLAT / Proy CFS / DCF / downstream — unchanged scope.
- Store schema migration — `KeyDriversState` shape unchanged. No v20 → v21 bump.
- KeyDriversBuilder export logic — unchanged (still reads `cogsRatio` etc from store).
- Upload parser + Dashboard chart + Multi-case — deferred to future sessions.

## Key Technical Decisions

| Decision | Rationale |
|---|---|
| **Helper module `kd-auto-values.ts` (not inline in KeyDriversForm)** | Pure function unit-testable; KeyDriversPage can call server-side-safe (no hooks) |
| **Call `computeProyFixedAssetsLive` with `projYears.length = 7`** | Compute already accepts `projYears` — no signature change needed |
| **Mirror pattern (useEffect persist on kdAuto change)** | Matches Session 041 depreciation from FA (LESSON-115). Store stays the single source of truth for export. |
| **Selling = G&A = totalOpEx / 2** | Per user Q1 clarification. IS catalog does not split Selling vs G&A. |
| **`PROJECTION_YEAR_COUNT` stays 3** | Widening globally breaks Proy FA page + Proy LR/BS/NOPLAT/CFS/DCF — LESSON-098 scope discipline. Use optional `count` param. |
| **Values stored unsigned positive** | Preserves existing sign reconciliation at export boundary (Session 040 LESSON-112). |

## Integration Points Audit

- **KeyDriversBuilder export** — reads from store. No change. `reconcileRatioSigns` already negates at export (Session 040).
- **Phase C state-parity** — fixture doesn't populate KD auto state; export still writes whatever is in store. Strict parity sheets unaffected. Coverage invariant sheets (computed/projected) unaffected.
- **Cascade integration** — tests all-null → migrated sheets blanked. KeyDriversBuilder upstream = `['keyDrivers']`. Still clears properly when keyDrivers is null.
- **Projection compute pipeline** — `computeFullProjectionPipeline` unchanged (still uses `projYears.length = 3`). Only KD internal compute extends.

## Risk Register

| Risk | Mitigation |
|---|---|
| Store contains user's prior manual values that no longer match auto values | Mirror useEffect overwrites on mount — acceptable per user "auto + read-only" spec |
| Test fixture `STATE_WITH_KEY_DRIVERS` may diverge from new auto values | No — fixture bypasses page wiring, writes to store directly. Export pipeline reads store verbatim. |
| Proy FA compute with 7-year projections may produce stopping-rule halts for KD 7th year when FA is small | Acceptable: ADDITIONS = 0 at that slot. KD still renders cell cleanly (read-only 0). |
| Phase C snapshot may shift if `STATE_WITH_KEY_DRIVERS` fixture exists | Fixture writes store directly; mirror useEffect doesn't run in headless export path. Phase C stable. |

## Verification Strategy

- Unit tests: `buildKdAutoValues` — 6+ cases (avg multi-year, edge: revenue=0, IS rows missing, FA accounts empty, FA accounts with extended-catalog excelRow ≥ 100, Selling = G&A = half)
- Unit test: `computeProjectionYears` with explicit count
- Component/rendering tests for KeyDriversForm readOnly + useEffect persist behavior (not adding — existing integration test covers store shape; component UI tested via manual visual QA per spec)
- Full gate: typecheck, vitest, eslint, audit:i18n, build, Phase C, cascade — all green
- Live deploy: HTTP 200 on `/input/key-drivers` route

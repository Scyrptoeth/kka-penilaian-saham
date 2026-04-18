# Session 040 — Extended Injection (Proy BS / Proy FA / KEY DRIVERS) + Sign Reconciliation

**Date**: 2026-04-18
**Scope**: Close multi-session deferral backlog: merge Session 039 to main, ship extended-account injection for PROY BS / PROY FA / KEY DRIVERS Additional Capex, reconcile KD ratio sign convention at export boundary to eliminate 21-entry Phase C whitelist.
**Branch**: `feat/session-040-extended-proy-kd-injection` (Task #1 merged Session 039 to main as prerequisite)

## Goals (from plan.md)
- [x] Task #1: Merge `feat/wc-scope-page-and-dcf-breakdown` to main (mechanical)
- [x] Task #2: Proy BS extended injection — leaf-only at synthetic excelRows
- [x] Task #3: Proy FA extended injection — 7-band slot layout, all-static values
- [x] Task #4: KEY DRIVERS dynamic `additionalCapexByAccount` injection with per-account row layout
- [x] Task #5: Sign convention reconciliation — negate KD ratios at export boundary, remove 21 whitelist entries

## Delivered

### Task #1 — Merge Session 039 to main
Fast-forward merge of `feat/wc-scope-page-and-dcf-breakdown` into main (56 files, +1976/-249). Pushed origin/main (Vercel production deploy triggered). Deleted feature branch local + remote. New Session 040 branch created.

### Task #2 — Proy BS Extended Injection
`ProyBsBuilder.build()` gains a second pass that iterates `state.balanceSheet.accounts` filtered by `excelRow ≥ 100`. Each extended/custom account:
- Label written at col B of that row (via `resolveLabel(acc, BS_CATALOG_ALL, language)`)
- Projected values from `proyBsRows[excelRow]` written at C/D/E/F (lastHistYear + 3 projYears)

**Critical design decision**: diverges from Session 025 BS pattern. BS historical template has LIVE Excel formulas at subtotals (e.g. `=SUM(D8:D14)`) so appending `+SUM(extendedRange)` extends them. PROY BS writes STATIC computed values (`proyBsRows[16]` already includes extended via `deriveComputedRows + dynamicManifest.computedFrom`). Appending `+SUM(range)` to a static cell would double-count. Therefore: **leaf-only injection, zero subtotal modification.**

+5 TDD cases. Tests 1222 → 1227.

### Task #3 — Proy FA Extended Injection
`ProyFaBuilder.build()` gains a 7-band slot-allocation pass. Layout mirrors Session 028 FA historical:
```
ACQ_BEGINNING rows 100-139
ACQ_ADDITIONS rows 140-179
ACQ_ENDING    rows 180-219
DEP_BEGINNING rows 220-259
DEP_ADDITIONS rows 260-299
DEP_ENDING    rows 300-339
NET_VALUE     rows 340-379
```
Slot index = order in `accounts.filter(a => a.excelRow >= 100)`. 40 slots per band.

**Diverges from Session 028 FA pattern**: Session 028 uses LIVE formulas (`=+<col>{rowA}+<col>{rowB}`) for computed bands ACQ_END/DEP_END/NET_VALUE. PROY FA writes STATIC values for ALL 7 bands (consistent with ProyFaBuilder baseline). Same double-count argument as Task #2: subtotals 14/23/32/42/51/60/69 already sum extended via `computeProyFixedAssetsLive`.

+7 TDD cases. Tests 1227 → 1234.

### Task #4 — KEY DRIVERS Dynamic additionalCapex Injection
New `injectAdditionalCapexByAccount` helper in `KeyDriversBuilder`. Closes the silent data-loss gap from Session 036 T8 (cell-mapping entries removed, no injector built).

Per-account row layout:
- Row 33 + slotIndex = nth FA account (order = `fixedAsset.accounts`)
- Label at col B (via `resolveLabel(acc, FA_CATALOG, language)`)
- Values at cols D-J (up to 7 projection years; system uses 3 → D/E/F active)

**Clear-before-write**: when `accounts.length > 0`, clears rows 33..max(36, 32+N) cols B+D..J before writing so prototipe residue (Tanah/Bangunan/Peralatan/Lainnya at B33-B36) doesn't bleed through when user has fewer than 4 accounts.

**Fixture edge case**: when `accounts.length === 0` (PT Raja Voltama fixture has empty accounts array but populated rows), the injector is a no-op. Preserves template parity for Phase C and avoids surprising mid-population users with a blanked Additional Capex section.

Upstream unchanged at `['keyDrivers']` (LESSON-097 narrowness); the injector internally gates on `state.home && state.fixedAsset && state.keyDrivers`, keeping KD export resilient when user hasn't filled FA yet.

+8 TDD cases. Tests 1234 → 1242.

### Task #5 — KD Ratio Sign Reconciliation
`reconcileRatioSigns` helper runs after `writeScalars + writeArrays` and overwrites D20/D23/D24 scalars + E-J projected expansions with `value === 0 ? 0 : -Math.abs(value)`.

Store keeps ratios POSITIVE per LESSON-011 convention. Excel template + live PROY LR formulas expect NEGATIVE so that:
- `PROY LR!D9  = ROUNDUP('KEY DRIVERS'!D20 * D8, 3)` — projected COGS
- `PROY LR!D12 = D8 * 'KEY DRIVERS'!D23` — projected selling
- `PROY LR!D13 = D8 * 'KEY DRIVERS'!D24` — projected G&A
yield NEGATIVE projected expenses matching LESSON-055 IS convention when the user reopens the exported workbook.

**Functional bug (not merely cosmetic)**: previous whitelist hid the fact that Excel would recompute ratios × Revenue with wrong signs after file reopen. Phase C compared cached values only (template + export had same cached, so no drift).

21 entries removed from `KNOWN_DIVERGENT_CELLS`. 2 pre-existing tests updated to assert negative export values. 8 new TDD cases.

Tests 1242 → 1250.

## Verification

```
Tests:     1250 / 1251 passing + 1 skipped  (102 files)
Build:     ✅ 41 static pages, compiled cleanly
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings
Audit:     ✅ 0 i18n violations (`npm run audit:i18n`)
Phase C:   ✅ 5/5 gates green (`verify:phase-c`)
Cascade:   ✅ 3/3 (29/29 MIGRATED_SHEETS)
```

## Stats

- Commits on feature branch: 4 (plus Task #1 which merged Session 039 to main directly)
- Files changed (delta vs origin/main pre-Task-1): 7 production/test files + 3 doc files (design/plan/progress)
- Lines +619 / -19 (code)
- Test cases added: +28 (1222 → 1250)
- New fixtures: 0
- Store migrations: 0 (no schema change in Session 040)

## Deviations from Plan

None material. Task #4 had one discovered edge case during Phase C run: PT Raja Voltama fixture has `fixedAsset.accounts: []` with populated `rows`. Initial implementation cleared template rows 33-36 unconditionally → Phase C regressed on 18 cells. Fix: skip clearing when `accounts.length === 0` (preserves template residue for fixture edge case). Documented in LESSON-113.

Task #5 had one discovered upgrade from "cosmetic sign convention gap" to "functional runtime bug" during design analysis. PROY LR template formulas directly reference `'KEY DRIVERS'!D20` etc., so wrong-signed export would propagate to wrong projected expenses when user reopens the file. Elevated reconciliation priority from "nice-to-have whitelist cleanup" to "real bug fix". Documented in LESSON-112.

## Deferred

- AAM extended-account native injection (excelRow ≥ 100) — unchanged
- AccPayables extended catalog — unchanged
- Upload parser (.xlsx → store) — unchanged
- RESUME page — unchanged
- LESSON-108 grep audit of other compute modules — deferred to Session 041+
- Cleanup of `isIbdAccount` classifier from AAM CL/NCL display split — deferred

## Lessons Extracted

- [LESSON-111](../lessons-learned.md#lesson-111): Historical-vs-projection arithmetic contract divergence — injection patterns don't transplant between LIVE-formula subtotals (append SUM) and STATIC-value subtotals (leaf-only) [promoted to start skill section 8]
- [LESSON-112](../lessons-learned.md#lesson-112): Phase C whitelist can hide FUNCTIONAL bugs when template has live formulas referencing the whitelisted cell [promoted to start skill section 8]
- [LESSON-113](../lessons-learned.md#lesson-113): Per-account export injectors must decide explicitly whether `accounts.length === 0` clears template residue or preserves it (lessons-learned.md only)

## Files Added/Modified

```
src/lib/export/sheet-builders/proy-bs.ts           [MODIFIED +25 lines]
src/lib/export/sheet-builders/proy-fa.ts           [MODIFIED +55 lines]
src/lib/export/sheet-builders/key-drivers.ts       [MODIFIED +131 lines]
__tests__/lib/export/sheet-builders/proy-bs.test.ts    [MODIFIED +75 lines / 5 new tests]
__tests__/lib/export/sheet-builders/proy-fa.test.ts    [MODIFIED +98 lines / 7 new tests]
__tests__/lib/export/sheet-builders/key-drivers.test.ts [MODIFIED +235 lines / 16 new tests, 2 updated]
__tests__/integration/phase-c-verification.test.ts     [MODIFIED -12 lines (21 whitelist entries removed)]
design.md   [REWRITTEN for Session 040]
plan.md     [REWRITTEN for Session 040]
progress.md [UPDATED with Session 040 state]
lessons-learned.md  [APPENDED LESSON-111/112/113]
history/session-040-extended-injection-sign-reconciliation.md  [NEW]
```

## Next Session Recommendation

Based on what was delivered + what remains deferred:

1. **AAM extended-account native injection** — mirror Session 031 AAM builder with extended row range, honoring per-row Penyesuaian (`aamAdjustments`)
2. **LESSON-108 grep audit** — scan `computeNoplatLiveRows`, `computeFcfLiveRows`, FR ratios, ROIC for remaining hardcoded `const *_ROWS = [N, N, N]` patterns
3. **AccPayables extended catalog** — complete the 4th dynamic catalog (BS/IS/FA done; AP is last)
4. **Upload parser (.xlsx → store)** — reverse direction for data portability. Reuse cell-mapping + sign reconciliation (will need `Math.abs` for KD ratios on read-back)
5. **RESUME page** — side-by-side AAM / DCF / EEM per-share summary
6. **Dashboard polish** — verify projected FCF chart with Session 036 NV growth model
7. **Cleanup `isIbdAccount` classifier** from AAM CL/NCL display split (now calc-inert after Session 038)

# Session 050 — Key Drivers Auto Read-Only

**Date**: 2026-04-19
**Scope**: Revamp INPUT DATA → Key Drivers per user 2-point spec — (1) Cost & Expense Ratios (COGS/Selling/G&A) become auto-populated read-only from IS average common size, (2) Additional Capex section becomes auto-populated read-only from Proy Fixed Asset ADDITIONS band extended to 7 projection years. Closes UX debt from Session 049 (dead cogsRatio/sellingExpenseRatio/gaExpenseRatio fields).
**Branch**: `feat/session-050-kd-auto-readonly` (1 feature commit, merged fast-forward to main + pushed, Vercel production deploy live — commit `788fb42`).

## Goals (from plan.md)

- [x] Task 1 — Extend `computeProjectionYears` with optional count param (default `PROJECTION_YEAR_COUNT`)
- [x] Task 2 — TDD new pure helper `buildKdAutoValues` (10 cases)
- [x] Task 3 — Wire `buildKdAutoValues` into `KeyDriversPage`
- [x] Task 4 — Refactor `KeyDriversForm` to read-only + mirror persist (React Compiler compliant)
- [x] Task 5 — Add bilingual i18n keys (autoNote + readonly tooltip × 2 sections)
- [x] Task 6 — Full verification gates green
- [x] Task 7 — Merge + push + verify live deploy
- [x] Task 8 — Session wrap-up docs (this file + progress.md + lessons-learned.md)

## Delivered (commit `788fb42`)

### Pure helper — `src/lib/calculations/kd-auto-values.ts` (NEW, ~125 LOC)

```ts
export interface KdAutoValuesInput {
  isRows: Readonly<Record<number, YearKeyedSeries>>
  isHistYears: readonly number[]   // IS slice yearCount (default 4)
  faAccounts: readonly FaAccountEntry[]
  faRows: Readonly<Record<number, YearKeyedSeries>>
  faHistYears: readonly number[]   // FA slice yearCount (default 3)
  projYears: readonly number[]
}
export interface KdAutoValues {
  cogsRatio: number
  sellingExpenseRatio: number
  gaExpenseRatio: number
  additionalCapexByAccount: Record<number, YearKeyedSeries>
}
export function buildKdAutoValues(input: KdAutoValuesInput): KdAutoValues
```

- **Ratios**: avg |IS line / IS revenue| via `averageSeries` (leading-zero-skip semantics per Session 037). Selling = G&A = `totalOpExRatio / 2` per user Q1.
- **Additional Capex**: delegates to existing `computeProyFixedAssetsLive` with 7 projection years, extracts ACQ_ADDITIONS band per account. Roll-forward + stopping rule (LESSON-134) + clamp (LESSON-137) inherited automatically.
- **Sign**: values stored POSITIVE. Export boundary `reconcileRatioSigns` continues to negate at write (Session 040 LESSON-112 preserved).
- **Separate histYears params**: `isHistYears` + `faHistYears` because IS slice and FA slice have independent `yearCount` (4 vs 3 default). Copy-paste of single `histYears` would miscompute.

### Page wiring — `src/app/input/key-drivers/page.tsx` (REWRITTEN, +55/-22 LOC)

```ts
const kdAuto = useMemo(() => {
  if (!home || !incomeStatement || !fixedAsset) return null
  return buildKdAutoValues({
    isRows: incomeStatement.rows,
    isHistYears: computeHistoricalYears(home.tahunTransaksi, incomeStatement.yearCount),
    faAccounts: fixedAsset.accounts,
    faRows: fixedAsset.rows,
    faHistYears: computeHistoricalYears(home.tahunTransaksi, fixedAsset.yearCount),
    projYears: computeProjectionYears(home.tahunTransaksi, 7),
  })
}, [home, incomeStatement, fixedAsset])
```

`isAutoRatios` seed path retained for **Financial Drivers.corporateTaxRate** only (derivation = `|Tax / PBT|`, different base → stays page-level, not helper-level).

### Form refactor — `src/components/forms/KeyDriversForm.tsx` (REWRITTEN, +126 LOC / -71 LOC)

- Added `kdAuto?: KdAutoValues | null` prop.
- **Display layer** reads from `kdAuto ?? state.X` (auto wins when present).
- **Persist layer** merges `kdAuto` overrides into payload via `useMemo` at save time — NOT via setState-in-effect. React Compiler rejects the latter (LESSON-016). Flow: `state + kdAuto → mergedForPersist (useMemo) → debounced onSave(merged)`.
- Input fields for cogsRatio / sellingExpenseRatio / gaExpenseRatio → `readOnly`, `aria-readonly="true"`, `tabIndex={-1}`, muted styling (`cursor-not-allowed italic text-ink-muted bg-canvas-raised`), bilingual tooltip.
- Additional Capex cells → same readOnly treatment, same tooltip.
- Handlers `updateOpRatio` + `updateCapex` removed (no longer wired; changes routed through upstream IS / FA forms).
- Bilingual notes displayed above Cost & Expense Ratios + Additional Capex sections.

### Year helper — `src/lib/calculations/year-helpers.ts` (MODIFIED)

```ts
export function computeProjectionYears(
  tahunTransaksi: number,
  count: number = PROJECTION_YEAR_COUNT,
): number[]
```

Default `PROJECTION_YEAR_COUNT = 3` preserved for Proy FA page + Proy LR / BS / NOPLAT / CFS. KD passes `count = 7` to widen its own horizon without touching the global constant (LESSON-098 scope discipline).

### i18n — 4 new bilingual keys

- `keyDrivers.autoNote.costRatios` — "Values are auto-computed from INPUT DATA → Income Statement …" (EN) / "Nilai dihitung otomatis dari rata-rata common size INPUT DATA → Laba Rugi …" (ID)
- `keyDrivers.autoNote.additionalCapex` — "Values are auto-computed from PROJECTION → Proy. Fixed Asset ADDITIONS band (7-year horizon) …" (EN) / "Nilai dihitung otomatis dari band PENAMBAHAN PROJECTION → Proy. Aset Tetap (horizon 7 tahun) …" (ID)
- `keyDrivers.readonly.tooltip.costRatios` — "Auto-populated from Income Statement — read only" / "Otomatis dari Laba Rugi — hanya baca"
- `keyDrivers.readonly.tooltip.capex` — "Auto-populated from Proy. Fixed Asset — read only" / "Otomatis dari Proy. Aset Tetap — hanya baca"

## Verification

```
Tests:     1358 / 1358 passing + 1 skipped  (+14 net since Session 049)
Build:     ✅ 42 static pages
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings (React Compiler compliant — no setState-in-effect)
Audit:     ✅ 0 i18n violations
Phase C:   ✅ 5/5 gates green
Cascade:   ✅ 3/3 (29/29 MIGRATED_SHEETS)
Live:      HTTP 200 after auth-gate redirect — penilaian-bisnis.vercel.app/input/key-drivers
```

## Stats

- Commits on feature branch: 1
- Files touched: 9 (2 new + 7 modified)
- LOC: +667 / −434
- Test cases: 1344 → 1358 (+14 net)
  - `year-helpers.test.ts`: +4 (`computeProjectionYears` count param)
  - `kd-auto-values.test.ts` (NEW): +10 (avg common-size + 7-yr Additional Capex + sign + edge cases)
- Store version: unchanged (v20) — zero migration
- i18n keys added: 4

## Deviations from Plan

- **Plan Task 2 initial signature** used single `histYears`. Revised mid-implementation to `isHistYears` + `faHistYears` separately after discovering IS slice has `yearCount = 4` and FA slice has `yearCount = 3`. Single year set would silently miscompute one side. Test fixtures updated via `replace_all` across 10 callsites.
- **Plan Task 4 mirror-persist via `useEffect + setState`** rejected by React Compiler lint (LESSON-016). Refactored to `useMemo(() => merged, [state, kdAuto])` + persist-effect watches merged. One-way flow preserved; setState-in-effect avoided. This promotes LESSON-141 (below).

## Deferred

None from this session.

## Lessons Extracted

- [LESSON-141](../lessons-learned.md#lesson-141): Upstream → store mirror without setState-in-effect — merge at persist time, not state time [PROMOTED]
- [LESSON-142](../lessons-learned.md#lesson-142): Per-slice `yearCount` demands per-slice histYears in multi-slice calc helpers [local]

## Files Added/Modified

```
src/lib/calculations/kd-auto-values.ts           [NEW — 125 LOC, pure helper]
__tests__/lib/calculations/kd-auto-values.test.ts [NEW — 10 TDD cases]
src/lib/calculations/year-helpers.ts             [MODIFIED — optional count param]
__tests__/lib/calculations/year-helpers.test.ts  [MODIFIED — +4 cases]
src/components/forms/KeyDriversForm.tsx          [REWRITTEN — readOnly UI + merge-at-persist mirror]
src/app/input/key-drivers/page.tsx               [REWRITTEN — buildKdAutoValues wiring]
src/lib/i18n/translations.ts                     [MODIFIED — +4 bilingual keys]
design.md                                         [REWRITTEN — Session 050 architecture]
plan.md                                           [REWRITTEN — Session 050 8 tasks]
```

## Next Session Recommendation

1. **User visual QA on Session 050** — verify at `/input/key-drivers`:
   (a) COGS/Selling/G&A fields show percentage values (not 0), render italic muted read-only with border styling;
   (b) Selling = G&A exactly;
   (c) Hover tooltip appears ("Auto-populated from Income Statement — read only");
   (d) Additional Capex cells populated with nonzero growth-based projections across 2022–2028;
   (e) Edit to IS Revenue at INPUT DATA → Income Statement reflects in KD COGS ratio after 500ms debounce;
   (f) Edit to FA account Additions at INPUT DATA → Fixed Asset reflects in KD Additional Capex.
2. **Upload parser (.xlsx → store)** — highest-priority backlog item. Reverse of export. Needs architecture discussion on null-on-upload force re-confirm vs trust mode preserving uploaded structure.
3. **Dashboard projected FCF chart** — leverages Session 045-047 Proy FA improvements + Session 049 uniform Proy LR compute.

# Plan — Session 050: Key Drivers Auto Read-Only

**Branch**: `feat/session-050-kd-auto-readonly`
**Target commit count**: 1 feature commit + 1 docs commit.

## Tasks

### Task 1 — Extend `computeProjectionYears` with optional count param
- **File**: `src/lib/calculations/year-helpers.ts`
- **Test**: `__tests__/lib/calculations/year-helpers.test.ts` (new file)
- **Change**: signature `computeProjectionYears(tahunTransaksi: number, count?: number): number[]` — default `PROJECTION_YEAR_COUNT`.
- **RED**: test `computeProjectionYears(2022, 7)` returns `[2022,…,2028]`; existing `computeProjectionYears(2022)` still returns 3-year `[2022, 2023, 2024]`.
- **GREEN**: add optional param.

### Task 2 — TDD `buildKdAutoValues` helper
- **File**: `src/lib/calculations/kd-auto-values.ts` (new)
- **Test**: `__tests__/lib/calculations/kd-auto-values.test.ts` (new)
- **Shape**:
  ```ts
  export interface KdAutoValuesInput {
    isRows: Readonly<Record<number, YearKeyedSeries>>
    histYears: readonly number[]
    faAccounts: readonly FaAccountEntry[]
    faRows: Readonly<Record<number, YearKeyedSeries>>
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

### Task 3 — Wire `buildKdAutoValues` into `KeyDriversPage`
- Replace existing `isAutoRatios` useMemo with `kdAuto = useMemo(() => buildKdAutoValues(…))`.
- Pass `kdAuto` prop to KeyDriversForm.

### Task 4 — Refactor `KeyDriversForm`: read-only UI + mirror persist
- Add `kdAuto?: KdAutoValues | null` prop.
- Override displayed values for the 3 ratios + additionalCapexByAccount from `kdAuto` when present.
- useEffect watching `kdAuto` → setState → triggers debounced persist.
- Inputs for cogsRatio/sellingExpenseRatio/gaExpenseRatio → `readOnly` + muted + tooltip.
- Additional Capex `<input>` cells → `readOnly` + muted + tooltip.
- Remove `updateOpRatio` / `updateCapex` handlers or leave them dormant (not wired).
- Add bilingual notes above Cost & Expense Ratios + Additional Capex sections.

### Task 5 — Add bilingual i18n keys
- `keyDrivers.autoNote.costRatios` / `keyDrivers.autoNote.additionalCapex`
- `keyDrivers.readonly.tooltip.costRatios` / `keyDrivers.readonly.tooltip.capex`

### Task 6 — Full verification
- `npm run typecheck`
- `npx vitest run` (full suite)
- `npm run lint`
- `npm run audit:i18n`
- `npm run build 2>&1 | tail -25`
- `npm run verify:phase-c`
- Cascade test

### Task 7 — Commit + merge + live verify
- Commit: `feat(key-drivers): auto-populate read-only ratios + 7-yr Proy FA capex`
- Merge fast-forward to main; push
- `curl -s -o /dev/null -w "%{http_code}" https://penilaian-bisnis.vercel.app/input/key-drivers` → 200

### Task 8 — Session wrap-up docs
- `history/session-050-kd-auto-readonly.md`
- Update `progress.md`
- Append new LESSON(s) to `lessons-learned.md`
- Commit: `docs: session 050 wrap-up — KD auto read-only + N lessons`

## Definition of Done

- [ ] All 8 tasks verified with evidence
- [ ] Full test suite green (expected: +10 or more tests net)
- [ ] Phase C 5/5 + cascade green
- [ ] Live deploy HTTP 200
- [ ] docs committed + pushed

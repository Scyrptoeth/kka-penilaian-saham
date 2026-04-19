# Session 053 — AP Beginning Editable + FCF FA Required-Gate + LESSON-057 Merge Fix + FCF CWC Inline Breakdown

**Date**: 2026-04-19
**Scope**: 3-part revision — AP schedule Beginning row becomes user-overrideable with roll-forward fallback; FCF promotes FA to required-gate + fixes LESSON-057 store-sentinel merge bug (Depreciation + CapEx were silently 0 for extended-catalog users); FCF gets inline CWC breakdown section for per-account transparency
**Branch**: `feat/ap-beg-editable-fcf-gate-cwc-breakdown` → main

## Goals (user Q1=C, Q2=A1, Q3=Z)

- [x] Task 1: AP Beginning editable for both ST + LT schedules with user-override / roll-forward fallback / explicit 0 semantic
- [x] Task 2.1+2.2: FCF Depreciation + CapEx auto-populate from FA (fix LESSON-057 merge + promote FA to required-gate)
- [x] Task 2.3: FCF inline CWC breakdown — per-account transparency with trivia (no editor, scope edits at dedicated page)
- [x] Cascade audit + docs + commit + push + deploy

## Delivered

### Task 1 — AP Beginning user override + roll-forward fallback (Q1=C)

**Semantic** (`src/data/catalogs/acc-payables-catalog.ts` → `computeApSentinels`):
```ts
// Before (Session 042):
const begValue = i === 0 ? 0 : (end[years[i - 1]] ?? 0)

// After (Session 053):
const begUser = rows[begRow]?.[year]
const begFallback = i === 0 ? 0 : (end[years[i - 1]] ?? 0)
const begValue = begUser != null ? begUser : begFallback
```

Distinguishes 3 states: user typed value (use it), user typed 0 (use 0 — explicit intent), user left blank (fall back to roll-forward).

**Form** (`src/app/input/acc-payables/page.tsx`):
- `RowEditable` extended with `placeholders?: YearKeyedSeries` prop
- Beginning row migrated from `RowDisplay` → `RowEditable` (passes `sentinels[begRow]` as placeholders)
- Display semantic: typed value renders in input, blank cells show fallback as placeholder (grayed), explicit 0 renders "0"
- `setRowCell(row, year, raw)` replaces `setAdditionCell` — generic handler; clearing cell removes override (reverts to fallback)

**Tests** (`__tests__/data/catalogs/acc-payables-catalog.test.ts` — 4 new cases):
1. `uses user Beginning when present; End = Beg + Add`
2. `user can override Beginning mid-stream; roll-forward resumes on next year`
3. `respects explicit zero at Beginning (user typed 0, not blank)`
4. `backward compat: no Beginning entries → pure roll-forward (Session 042 behavior)`

### Task 2.1+2.2 — FCF FA required-gate + LESSON-057 merge fix (Q2=A1)

**Gate**: `!fixedAsset` added to required-gate conditional in `FcfLiveView.tsx`:
```tsx
if (!home || !balanceSheet || !incomeStatement || !fixedAsset || changesInWorkingCapital === null) {
  return <PageEmptyState .../>
}
```
Empty state already listed FA as an input; now it's enforced.

**LESSON-057 merge fix** (`FcfLiveView.tsx`):
```ts
// Before:
const faComputed = faRows
  ? deriveComputedRows(FIXED_ASSET_MANIFEST.rows, faRows, years)
  : null

// After:
const faRows = fixedAsset.rows  // non-null after gate
const faComputed = deriveComputedRows(FIXED_ASSET_MANIFEST.rows, faRows, years)
const faAll = { ...faComputed, ...faRows }  // store sentinel WINS
```

Passing `faAll` (not `faComputed`) to `computeFcfLiveRows` ensures row 51 (Total Dep Additions) + row 23 (Total Acq Additions) sum ALL accounts including extended catalog (excelRow ≥ 100) via DynamicFaEditor's pre-persisted sentinels (LESSON-132). Previous code only summed original catalog accounts (rows 17-22, 45-50 via FIXED_ASSET_MANIFEST.computedFrom).

### Task 2.3 — FCF inline CWC breakdown (Q3=Z)

**New pure helper** `src/lib/calculations/wc-breakdown.ts`:
- `computeWcBreakdown(bsAccounts, bsRows, cfsYears, bsYears, excludedCA, excludedCL)` returning `{ caIncluded, clIncluded, caExcluded, clExcluded }`
- Per-account sign convention mirrors `computeCashFlowLiveRows` (LESSON-110 `resolveWcRows` shared):
  - CA[year][acct]: year 1 → `-curr`; year 2+ → `-(curr - prev)`
  - CL[year][acct]: `curr - prev` (year 1 prev = bsYears[0])
- Sum across included accounts per year = FCF row 12 / row 13 exactly (LESSON-139 driver-display sync applied)

**Tests** (`__tests__/lib/calculations/wc-breakdown.test.ts` — 7 new cases):
- Sign convention cases (CA year 1 absolute, year 2+ delta; CL delta with bsYears[0] for year 1)
- Exclusion routing (CA accounts excluded → land in `caExcluded`, not `caIncluded`)
- Sum-equals-aggregate invariants for both CA and CL
- Empty exclusion case (all accounts included)

**New component** `src/components/analysis/FcfCwcBreakdown.tsx`:
- Section heading "Changes in Working Capital — Per-Account Breakdown" + subtitle
- "Edit Scope" button linking to `/analysis/changes-in-working-capital` (scope editor unchanged)
- CA table: per-account contribution rows + total row (matches FCF row 12)
- CL table: per-account contribution rows + total row (matches FCF row 13)
- Excluded accounts collapsible group per section (pure display, no restore button — scope edits at dedicated page)
- Trivia panel at bottom (reuses `wc.trivia.heading` + `wc.trivia.intro1` + `wc.trivia.intro2` keys + new `fcf.cwcBreakdown.triviaFooter` pointer to Edit Scope)

**Rendering** (`FcfLiveView.tsx`):
- Returns `<><SheetPage .../><FcfCwcBreakdown /></>` — breakdown rendered below aggregate FCF table

**i18n** (`src/lib/i18n/translations.ts`): 11 new keys under `fcf.cwcBreakdown.*` prefix. Interpolation used for `{count}` in `includedCount` + `excludedLabel`.

## Verification

```
Tests:     1393 / 1393 passing + 1 skipped  (112 files; +11 net — 7 wc-breakdown + 4 AP override)
Build:     ✅ 42 static pages
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings (React Compiler compliant)
Audit:     ✅ 0 i18n violations
Phase C:   ✅ 5/5 gates green
Cascade:   ✅ 3/3 (29/29 MIGRATED_SHEETS)
```

## Stats

- Commits: 1 feature + 1 docs (pending at wrap-up)
- Files changed: 8 (2 new + 6 modified)
  - NEW: `src/lib/calculations/wc-breakdown.ts`, `src/components/analysis/FcfCwcBreakdown.tsx`, `__tests__/lib/calculations/wc-breakdown.test.ts`
  - MODIFIED: `src/data/catalogs/acc-payables-catalog.ts`, `src/app/input/acc-payables/page.tsx`, `src/components/analysis/FcfLiveView.tsx`, `src/lib/i18n/translations.ts`, `__tests__/data/catalogs/acc-payables-catalog.test.ts`
- Test count: 1393 (+11 net)
- Docs: LESSON-147 + LESSON-148 appended + promoted block updated

## Deviations from Plan

None. User Q1=C / Q2=A1 / Q3=Z confirmed pre-execution; plan executed as presented.

## Deferred

- Session 051 + 052 QA (deferred from earlier wrap-ups — carries forward)
- Upload parser architecture discussion
- Dashboard projected FCF chart
- Extended-catalog smoke test (LESSON-148 follow-up recommendation)

## Lessons Extracted

- **[LESSON-147](../lessons-learned.md#lesson-147)** (PROMOTED): Derived-with-fallback-override pattern — user input wins, roll-forward derivation fills blanks, explicit 0 respected via `value != null` check. Generalizes LESSON-146 to cases where derivation IS a legitimate default.
- **[LESSON-148](../lessons-learned.md#lesson-148)** (PROMOTED): Audit ALL downstream wrappers for LESSON-057 store-sentinel merge pattern — bug invisible with static-only catalog data (Phase C doesn't cover extended accounts). Grep pattern provided; checklist for dynamic-catalog consumers.

## Files Modified

```
src/data/catalogs/acc-payables-catalog.ts         [MODIFIED]  Beg = user override ?? fallback
src/app/input/acc-payables/page.tsx               [MODIFIED]  Beginning editable with placeholder
src/components/analysis/FcfLiveView.tsx           [MODIFIED]  FA required-gate + LESSON-057 merge + mount breakdown
src/lib/i18n/translations.ts                      [MODIFIED]  11 new fcf.cwcBreakdown.* keys
src/lib/calculations/wc-breakdown.ts              [NEW]       computeWcBreakdown helper
src/components/analysis/FcfCwcBreakdown.tsx       [NEW]       inline breakdown component
__tests__/data/catalogs/acc-payables-catalog.test.ts [MODIFIED]  +4 cases
__tests__/lib/calculations/wc-breakdown.test.ts   [NEW]       7 cases
lessons-learned.md                                [APPENDED]  LESSON-147 + LESSON-148
progress.md                                       [REWRITTEN]
history/session-053-*.md                          [NEW]
```

## Next Session Recommendation

Session 054 should start with user visual QA of Session 053 across 3 verification points (AP Beginning editable behavior, FCF FA gate + Dep/CapEx populate, FCF CWC breakdown). Then tackle Upload Parser architecture — now made incrementally harder by Beginning being a user field too. Consider extended-catalog smoke test as medium-priority follow-up (LESSON-148).

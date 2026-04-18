# Session 043 — Sidebar Toggles Redesign + Depreciation Bug Fix + AAM IBD Auto-Negate + Dashboard Account-Driven

**Date**: 2026-04-18
**Scope**: Four user-reported issues resolved in a single cohesive session.
Mix of UI polish (Task 1), bug fix (Task 2), new feature (Task 3),
and architectural audit-fix (Task 4). All delivered via TDD.
**Branch**: `feat/session-043-toggles-depreciation-aam-ibd-dashboard` (4 commits, unpushed at session close)

## Goals (from user prompt, 4 tasks)
- [x] Task 1: Redesign 3 sidebar toggles (theme, language, logout) to icon-dominant pill switches visible in both light/dark × EN/ID modes
- [x] Task 2: Fix bug where IS "Penyusutan" row displays "-" despite FA data being populated (Session 041 wiring regression)
- [x] Task 3: AAM Penyesuaian col D auto-negate = −Historis for retained IBD accounts (CL+NCL), col E = 0, cell locked
- [x] Task 4: Dashboard KOMPOSISI NERACA chart empty despite BS being filled — audit ALL hardcoded row accesses + switch to account-driven system

## Delivered

### Task 2 — Depreciation read-only display bug (commit `3729a50`)
- Root cause: `deriveComputedRows` (line 38) skips any row without `computedFrom`. IS row 21 (Depreciation) is `type: 'cross-ref'` without `computedFrom`, so its value was never in the output map. `RowInputGrid` reads `computedValues[21]` for non-editable cells → always undefined → "-".
- Fix #1 (display): `DynamicIsEditor` `computedValues` useMemo now merges `depCrossRef` into output — `{ ...depCrossRef, ...bare }` so base gets row 21 while computed subtotals still win.
- Fix #2 (persist): `schedulePersist` now explicitly injects row 21 from the `dep` object into the `sentinels` Record. Downstream consumers (NOPLAT, FR, export) see row 21 in store.
- Verified pattern matches DynamicBsEditor (line 317) which was already correct.
- TDD: 4 cases in `__tests__/components/forms/dynamic-is-editor-cross-ref-display.test.ts`
  - BUG regression guard: `deriveComputedRows` alone omits cross-ref row 21
  - FIX display: merge pattern surfaces depCrossRef
  - FIX chain: EBIT = EBITDA + DEPRECIATION still correct
  - FIX persist: sentinels explicitly include row 21

### Task 3 — AAM IBD retained auto-negate (commit `5aa315a`)
- New pure helper `computeIbdAutoAdjustments` in `src/lib/calculations/upstream-helpers.ts` — iterates BS accounts, returns `Record<excelRow, -bsValue>` for every CL/NCL row NOT in exclusion sets. Zero-historical stays zero (avoid JS `-0` sentinel).
- `buildAamInput` merges auto-map AFTER `userAdj` so auto wins for retained IBD rows (UI locks those cells so user can't override anyway). Equity section is untouched (fully user-driven).
- `buildAamInput` `totalAdjustments` return now includes auto-applied adjustments.
- AAM page changes (`src/app/valuation/aam/page.tsx`):
  - Computes `autoAdj` in the `data` useMemo, returns alongside `result`
  - `effectiveAdj(row)` helper picks auto-map value if present, else user value
  - `sumAdj(rows)` uses effectiveAdj so display subtotal matches builder's totalAdjustments
  - `AccountRow` extended with `locked + lockedTitle` props; renders plain `<td>` with tooltip for auto rows, `AdjustmentCell` for editable rows
- i18n key `aam.ibdRetainedLockTitle` added (EN + ID)
- TDD: 10 cases in `__tests__/lib/calculations/aam-ibd-auto-adjust.test.ts`
  - Helper: empty/asset-only skip, CL retained → -value, CL excluded → nothing, NCL section, equity untouched, zero historical
  - Builder: retained IBD zeros ibdCurrentLiabilities, excluded CL preserved, equity user-adj preserved, end-to-end NAV unchanged when retained IBD present

### Task 4 — Dashboard account-driven aggregation (commit `ce23c06`)
- Diagnosed 3 stacked bugs in `src/app/dashboard/page.tsx`:
  - `allBs[26]/[40]/[48]` were WRONG sentinel positions. Correct after Session 020 dynamic-catalog refactor: `[27]/[41]/[49]` via `BS_SUBTOTAL.TOTAL_ASSETS/_LIABILITIES/_EQUITY`
  - Even with correct positions, user's extended catalog may not have persisted those sentinels
  - `proyLrRows[6]` for projection Revenue was wrong — PROY LR stores at row 8 (LESSON-103 template row divergence)
- New module `src/lib/dashboard/data-builder.ts`:
  - `aggregateBsBySection` — account-driven sum by section + FA Net cross-ref pickup
  - `buildBsCompositionSeries` — primary source for KOMPOSISI NERACA (account-driven, NEVER trusts magic rows)
  - `buildRevenueNetIncomeSeries` — uses `IS_SENTINEL.REVENUE/NET_PROFIT` for historical, `PROY_LR_ROW.REVENUE/NET_PROFIT` for projection (rows 8+39, not 6+35)
  - `buildFcfSeries` — uses `FCF_ROW.FREE_CASH_FLOW` constant
- Semantic constants exported:
  - `BS_SUBTOTAL` in `balance-sheet-catalog.ts` (named positions: TOTAL_ASSETS=27, TOTAL_LIABILITIES=41, TOTAL_EQUITY=49, etc.)
  - `PROY_LR_ROW` in `compute-proy-lr-live.ts` (REVENUE=8, NET_PROFIT=39, etc.)
  - `FCF_ROW` in `fcf.ts` (FREE_CASH_FLOW=20, etc.)
- Dashboard page reduced from 8 magic-number sites to 3 thin builder calls
- TDD: 14 cases in `__tests__/lib/dashboard/data-builder.test.ts`
  - Aggregate with extended catalog accounts (excelRow 105/135/170)
  - KOMPOSISI NERACA works without sentinel rows written
  - FA Net picked up via BS_SUBTOTAL.FIXED_ASSETS_NET even with empty accounts
  - PROY LR regression guard: doesn't accidentally read stale `proyLrRows[6]`
  - Named-constant contract lock (`expect(BS_SUBTOTAL.TOTAL_ASSETS).toBe(27)` style)

### Task 1 — Icon-dominant sidebar toggles (commit `747abaa`)
- **ThemeToggle** (56×28 pill switch): sun+moon icons with sliding thumb circle (`bg-ink`). Active icon sits on thumb (inverse color), inactive on track (muted). `role="switch" aria-checked`.
- **LanguageToggle** (56×28 pill switch): inline SVG flags (UK Union Jack + Indonesia) as thumb. Flank labels "EN"/"ID" dimmed-active-lit. Inline SVG chosen over emoji (cross-platform consistency: Windows + Chrome Linux render emoji flags as 2-letter codes).
- **LogoutButton** (pill with icon): person-with-arrow-right SVG + bilingual "LOG OUT"/"KELUAR". Outlined-default → inverse-hover (`bg-ink text-canvas`). `tracking-[0.18em]` institutional tone.
- **SidebarHeader**: toggles now sit side-by-side (flex row gap-2) beneath privacy badge — compact control cluster.
- 6 new i18n keys (adaptive aria-labels describing current state + next action):
  - `theme.ariaLoading/ariaCurrentLight/ariaCurrentDark`
  - `lang.ariaLoading/ariaCurrentEn/ariaCurrentId`

## Verification

```
Tests:     1316 / 1316 passing + 1 skipped  (107 files; +28 net since Session 042 end of 1288)
Build:     ✅ 42 static pages, compiled cleanly
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings (React Compiler + local/no-hardcoded-ui-strings + jsx-a11y)
Audit:     ✅ 0 i18n violations
Phase C:   ✅ 5/5 gates green
Cascade:   ✅ 29/29 MIGRATED_SHEETS (implied; full test suite green)
```

## Stats

- Commits on feature branch: 4 (+ this docs commit)
- Files touched: 16 source/test + 3 docs
- LOC: +1157 / −139 (code) + ~150 (docs)
- Test cases added: +28 net (1288 → 1316)
- New modules: `src/lib/dashboard/data-builder.ts`
- New semantic constants: `BS_SUBTOTAL`, `PROY_LR_ROW`, `FCF_ROW`
- New i18n keys: 7 (6 aria labels + 1 lock tooltip)
- Store version: unchanged (v20)

## Deviations from Plan

- **Task 2 scope widened**: original plan was "fix DynamicIsEditor wiring". Actual scope required fixing BOTH the memo merge (display) AND the persist sentinel injection (downstream) — the second would have bit us later if only the first was fixed.
- **Task 4 produced more infrastructure than planned**: user asked for "system development" audit; delivered not just fixed rows but an entire `data-builder.ts` module with pure functions + TDD. This is the right level of abstraction — page becomes thin, future dashboard additions compose builders.
- **Task 1 added SidebarHeader layout change**: toggles previously stacked vertical; moved to horizontal row because the new pill shape (56×28) benefits from side-by-side.
- **LESSON-125 (ARIA switch pattern) added during Task 1 lint catch**: not pre-planned but needed recording so future toggle additions avoid the same mistake.

## Deferred

None from this session's 4 tasks — all completed.

From previous backlog (still deferred):
- Upload parser (.xlsx → store) — reverse direction
- Dashboard polish — projected FCF chart with Session 036 NV-growth model (now easier post-Task 4 thanks to `buildFcfSeries` foundation)
- Multi-case management
- Cloud sync
- Audit trail

## Lessons Extracted

- [LESSON-122](../lessons-learned.md#lesson-122): deriveComputedRows drops cross-ref rows from output — merge cross-ref into display AND persist sentinels [PROMOTED]
- [LESSON-123](../lessons-learned.md#lesson-123): Auto-adjustment map at builder boundary — business logic wins over user input for specific rows [PROMOTED]
- [LESSON-124](../lessons-learned.md#lesson-124): Semantic row constants + account-driven aggregation for display layer — extends LESSON-108 from compute to display [PROMOTED]
- [LESSON-125](../lessons-learned.md#lesson-125): `role="switch"` requires `aria-checked`, not `aria-pressed` [local]

## Files Added/Modified

```
src/components/forms/DynamicIsEditor.tsx                             [MODIFIED — Task 2 fix]
src/components/layout/ThemeToggle.tsx                                [REWRITTEN — Task 1 pill switch]
src/components/layout/LanguageToggle.tsx                             [REWRITTEN — Task 1 pill switch w/ flags]
src/components/layout/LogoutButton.tsx                               [REWRITTEN — Task 1 pill button w/ icon]
src/components/layout/SidebarHeader.tsx                              [MODIFIED — Task 1 layout row]
src/app/valuation/aam/page.tsx                                       [MODIFIED — Task 3 locked cells + effectiveAdj]
src/app/dashboard/page.tsx                                           [MODIFIED — Task 4 builder composition]

src/lib/calculations/upstream-helpers.ts                             [MODIFIED — Task 3 computeIbdAutoAdjustments + merge]
src/lib/dashboard/data-builder.ts                                    [NEW — Task 4 builder module]
src/data/catalogs/balance-sheet-catalog.ts                           [MODIFIED — Task 4 BS_SUBTOTAL const]
src/data/live/compute-proy-lr-live.ts                                [MODIFIED — Task 4 PROY_LR_ROW const]
src/data/manifests/fcf.ts                                            [MODIFIED — Task 4 FCF_ROW const]

src/lib/i18n/translations.ts                                         [MODIFIED — 7 keys (6 aria + 1 lock)]

__tests__/components/forms/dynamic-is-editor-cross-ref-display.test.ts  [NEW — 4 cases]
__tests__/lib/calculations/aam-ibd-auto-adjust.test.ts                  [NEW — 10 cases]
__tests__/lib/dashboard/data-builder.test.ts                            [NEW — 14 cases]
```

## Next Session Recommendation

Based on this session's deliverables + remaining backlog:

1. **User QA pass** — visit dev server, validate 4 fixes visually:
   - 3 toggles in light/dark × EN/ID combinations
   - IS Penyusutan auto-populated with −FA.TotalDepAdditions
   - AAM page: retained IBD rows show locked grey cell with −C adjustment + E=0
   - Dashboard KOMPOSISI NERACA chart renders with BS data
2. **Merge feature branch to main** after user signs off → Vercel prod deploy
3. **Upload parser (.xlsx → store)** — reverse direction, highest-priority backlog item. Needs IBD scope + AP schedule shape adapters. Discuss with user: null-on-upload vs trust mode.
4. **Dashboard polish** — now that `data-builder.ts` foundation exists, adding projected FCF chart with Session 036 NV-growth model is a matter of composing one more builder.

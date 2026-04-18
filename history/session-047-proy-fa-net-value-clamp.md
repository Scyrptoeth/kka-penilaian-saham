# Session 047 — Proy FA Net Value Clamp + Sticky Floor Rule

**Date**: 2026-04-19
**Scope**: Extend Session 046 LESSON-134 stopping rule with clamping behavior. User reported 4 akun FA masih show Net Value negatif di projection years post-Session-046 — stopping rule halted Dep but didn't clamp Net itself; could also swing back positive when Acq Add continued after Dep freeze.
**Branch**: `feat/session-047-proy-fa-net-value-clamp` (1 feature commit, merged fast-forward to main + pushed, Vercel production deploy triggered).

## Goals (1 task driven by user observation)

- [x] Clamp projected Net Value to 0 when raw math produces negative (accounting sanity — no negative book value).
- [x] Sticky rule: once Net hits 0 or less, stays 0 forever — prevents "revival" from Acq growth while Dep frozen.
- [x] Opsi A per user clarification: historical year NOT clamped (preserve user's ground truth data even if mathematically negative).

## Delivered (commit `698f917`)

### Compute change — `src/data/live/compute-proy-fixed-assets-live.ts`

Added 2 lines in the per-account projection loop:

```ts
const rawNet = thisAcqEnd - thisDepEnd
const thisNet = assetDone ? 0 : Math.max(0, rawNet)
```

Where `assetDone = prevNet <= 0` (Session 046 stopping rule). Combined behavior:

- **First year Net would be negative**: `assetDone = false`, `Math.max(0, rawNet)` → 0. Clamp engaged.
- **Next year onward**: `prevNet = 0` → `assetDone = true` → `thisNet = 0` (sticky branch). Even if Acq grows while Dep is frozen (LESSON-134 halt), Net stays 0.
- **Historical year**: `netAtHist = netHist[histYear] ?? (acqEndAtHist - depEndAtHist)` unchanged. Can be negative if user data has Dep > Acq historically.

### Tests — `__tests__/data/live/compute-proy-fixed-assets-live.test.ts` (+3 cases, 11 → 14)

1. **"clamps projected Net Value to 0 when raw computation goes negative and stays 0"** — Acq flat, Dep grows. Net hits 0 at Y=2022, stays 0 through 2024.
2. **"sticks Net at 0 even when Acq continues to grow after disposal"** — Dep growth > Acq growth scenario. Raw Net goes negative year 2022, clamp engaged. Subsequent years: Dep=0 (stopping rule), Acq continues. Raw math could swing positive. Sticky forces 0.
3. **"preserves negative historical Net Value — Opsi A does not clamp historical"** — Historical Net = -40 preserved. Projection year 2022+: `assetDone` triggered → Net = 0.

## Verification

```
Tests:     1328 / 1328 passing + 1 skipped  (109 files; +3 net since Session 046)
Build:     ✅ 42 static pages
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings
Audit:     ✅ 0 i18n violations
Phase C:   ✅ 5/5 gates green
Cascade:   ✅ 3/3 (29/29 MIGRATED_SHEETS)
```

## Stats

- Commits on feature branch: 1 (squashed feature + test in one commit per git-workflow "one logical change")
- Files touched: 2 (compute + test)
- LOC: +81 / −5
- Test cases added: +3 net
- Store version: unchanged (v20)
- i18n keys: zero new strings

## Deviations from Plan

None — single-task session, straight execution. User's Opsi A choice came during clarification Q&A before implementation.

## Deferred

None from this session.

## Lessons Extracted

- [LESSON-137](../lessons-learned.md#lesson-137): Domain-clamp + sticky floor pattern for projection outputs that violate semantic rules [PROMOTED — extends LESSON-134]

## Files Added/Modified

```
src/data/live/compute-proy-fixed-assets-live.ts    [MODIFIED — clamp + sticky logic + docblock]
__tests__/data/live/compute-proy-fixed-assets-live.test.ts  [MODIFIED — +3 cases]
```

## Next Session Recommendation

1. **User visual QA** — verify 4 akun FA yang sebelumnya negatif sekarang show as 0 di `/projection/fixed-asset`
2. **Upload parser (.xlsx → store)** — priority backlog #1
3. **Dashboard projected FCF chart** — leverages Session 045 roll-forward + Session 046 sentinel + Session 047 clamp

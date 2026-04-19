# Session 052 — Revert FA Seed Fallback (LESSON-144 SUPERSEDED) + KD Additional Capex Visual Polish

**Date**: 2026-04-19
**Scope**: Revert Session 051 `lastNonZeroHistorical` FA seed fallback (LESSON-144 violated INPUT-is-source-of-truth) + polish KD Additional Capex presentation (italic removed, thousand separator, alignment)
**Branch**: `feat/revert-fa-seed-fallback-and-kd-capex-polish` → main

## Goals

- [x] Task 1: Revert LESSON-144 — Proy FA Additions at histYear mirror INPUT FA exactly (0 when user didn't entry)
- [x] Task 2: KD Additional Capex visual polish (no italic, thousand separator, header alignment, plain text)
- [x] Task 3: Cascade audit — verify downstream consumers adjust automatically
- [x] Task 4: Docs + lesson + commit + push + deploy

## Delivered

### Task 1 — Revert FA seed fallback (LESSON-144 → LESSON-146)

**User complaint** (screenshots `acquiition-costs-Additions-PROJECTION-Proy.-Fixed-Asset.png` vs `acquiition-costs-Additions-INPUT DATA-Fixed-Asset.png`):
- INPUT FA Additions 2021 = 0 across all 11 PT Raja accounts (user left blank)
- Proy FA Additions 2021 displayed `3.365.510.390` / `6.424.709.610` / `110.000.000` etc. — fabricated from 2018/2019/2020 via Session 051 `lastNonZeroHistorical` helper
- **Divergence at shared anchor year** = UX betrayal. User flagged "sangat fatal".

**User decision**: (B) — revert total. INPUT at histYear is strict source of truth.

**Code changes** in `src/data/live/compute-proy-fixed-assets-live.ts`:
- Deleted `lastNonZeroHistorical` helper (18 LOC, only consumer of this module)
- Simplified seed logic:
  ```ts
  // Before (LESSON-144):
  const acqAddAtHistRaw = acqAddHist[histYear]
  const acqAddAtHist =
    acqAddAtHistRaw != null
      ? acqAddAtHistRaw
      : lastNonZeroHistorical(acqAddHist, historicalYears) ?? 0
  // After (LESSON-146):
  const acqAddAtHist = acqAddHist[histYear] ?? 0
  ```
- Same simplification for `depAddAtHist`
- Docstring updated to reflect Session 052 contract

**Test rewrite** `__tests__/data/live/compute-proy-fixed-assets-live.test.ts`:
- Renamed `Session 051 Additions seed fallback` describe block → `Session 052 Additions seed is strict — INPUT at histYear wins`
- 4 TDD cases (all pass after compute change):
  1. `stalls at 0 when histYear Additions is undefined (no fabricated fallback)` — verifies the behavior that Session 051 was "fixing"
  2. `respects explicit zero at histYear (no acquisition that year)` — behavior identical to undefined now
  3. `uses histYear Acq Additions as seed when present non-zero` — normal propagation works
  4. `Dep Additions seed is also strict — histYear wins` — symmetry with Acq bands

### Task 2 — KD Additional Capex visual polish

**User complaints** (screenshot `additional-capex-INPUT-DATA-Key-Drivers.png`):
1. Values displayed in italic → wanted normal font
2. No thousand separator (`8935657067`) → wanted id-ID format (`8.935.657.067`)
3. Year header misaligned — header center-aligned on full `<td>` width, values right-aligned inside narrower `<input>` → visual offset
4. Cells rendered as `<input readonly>` boxes with borders → user wanted plain text consistent with Proy FA auto-readonly cells (option X chosen)

**Code changes** in `src/components/forms/KeyDriversForm.tsx` lines 384-400:
- Replaced `<input>` with plain `<td>` child text node
- Value formatter: `IDR.format(Math.round(series[y] ?? 0))` — reuses the same `IDR = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })` already defined at line 177, same format used by Total row
- Classes: `text-right font-mono tabular-nums text-ink` — matches Total row styling (line 406)
- Retained `title={readonlyCapexTooltip}` + `aria-readonly="true"` for accessibility semantics

**Before**:
```tsx
<td key={y} className="px-2 py-1">
  <input
    type="number" step="1" readOnly aria-readonly="true" tabIndex={-1}
    title={readonlyCapexTooltip}
    className="w-28 cursor-not-allowed rounded border border-grid bg-canvas-raised px-1 py-1 text-right font-mono text-sm italic tabular-nums text-ink-muted"
    value={series[y] ? Math.round(series[y]!).toString() : '0'}
  />
</td>
```

**After**:
```tsx
<td
  key={y}
  title={readonlyCapexTooltip}
  aria-readonly="true"
  className="px-2 py-1 text-right font-mono tabular-nums text-ink"
>
  {IDR.format(Math.round(series[y] ?? 0))}
</td>
```

### Task 3 — Cascade (zero additional code changes)

The compute change naturally cascades through data flow — every consumer inherits the strict seed:
- **KD Additional Capex auto-populate** (Session 050): reads Proy FA ACQ_ADDITIONS band → now 0 everywhere until user enters histYear
- **Proy CFS CapEx outflow** (Session 012): reads Proy FA → 0 in projection
- **Proy BS Fixed Assets** (Session 036): reads Proy FA → flat across projection
- **DCF Free Cash Flow** (Session 016): reads Proy FA via `buildDcfInput` → no CapEx deduction in projection years
- **Dashboard charts**: any projection chart sourcing Proy FA reflects the 0 stall

User action required post-deploy: entry 2021 FA Additions data at `/input/fixed-asset` to see meaningful projections. This is correct workflow — blank histYear = "no data, user should enter" not "data should be fabricated".

### Task 4 — Docs + lessons

- **LESSON-144 marked SUPERSEDED** with explicit pointer to LESSON-146
- **LESSON-146 written + PROMOTED** to `/start-kka-penilaian-saham` canonical list (section titled "INPUT at histYear is strict source of truth — no fabricated seed fallback (supersedes LESSON-144)")
- `progress.md` updated (verification header, Session 052 section, Latest Sessions, Next Priorities)

## Verification

```
Tests:     1382 / 1382 passing + 1 skipped  (18/18 in compute-proy-fixed-assets-live.test.ts)
Build:     ✅ 42 static pages
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings (React Compiler compliant)
Audit:     ✅ 0 i18n violations
Phase C:   ✅ 5/5 gates green (state-parity unchanged — compute-only revert)
Cascade:   ✅ 3/3 (29/29 MIGRATED_SHEETS)
```

## Stats

- Commits: 1 feature + 1 docs (pending at wrap-up)
- Files changed: 4 (1 compute + 1 test + 1 form + 2 docs = 5 including lessons-learned.md)
- Net LOC: compute −18 (helper deleted) + test 0 (in-place rewrite, 4 cases) + form −5 (input→td) + docs +80 (new session file + lesson)
- Test count: 1382 (unchanged — 4 FA tests rewritten in-place)

## Deviations from Plan

None. Plan executed as presented in Langkah 3. User confirmed (B) + (X) answers pre-execution.

## Deferred

Session 051 visual QA (BS strict growth display + equity editable) — carries over to Session 053.

## Lessons Extracted

- **[LESSON-146](../lessons-learned.md#lesson-146)** (PROMOTED, supersedes LESSON-144): INPUT at histYear is strict source of truth — no fabricated seed fallback. Multiplicatively-projected bands seed from `historicalSeries[histYear] ?? 0`. Red flag: any `?? lastNonZero*` or backward-walking fallback in seed resolution path. Generalizes to any derived display that mirrors user INPUT.

## Files Modified

```
src/data/live/compute-proy-fixed-assets-live.ts   [MODIFIED]  −18 LOC (helper + simplify seed)
src/components/forms/KeyDriversForm.tsx           [MODIFIED]  −5 LOC (input → td)
__tests__/data/live/compute-proy-fixed-assets-live.test.ts [MODIFIED]  0 net (4 cases rewritten)
lessons-learned.md                                [APPENDED]  +1 lesson + 1 SUPERSEDED annotation
progress.md                                       [REWRITTEN]
history/session-052-revert-fa-seed-fallback-kd-capex-polish.md [NEW]
```

## Next Session Recommendation

Session 053 should start with visual QA of Sessions 051 + 052 combined, then proceed to Upload Parser architecture discussion as the next major feature. Dashboard projected FCF chart ready once cascading data populates (user enters 2021 FA Additions).

# Session 022 — AAM finalValue Removal + Simulasi Potensi Sign Fix

**Date**: 2026-04-15
**Scope**: Two system-level corrections: (A) AAM pure calc ends at Market Value Portion (E59) — remove `finalValue`/`paidUpCapitalDeduction`; (B) `computeSimulasiPotensi` normalizes to positive-input contract (mirrors `computeAam`).
**Branch**: `feat/session-022-aam-simulasi-fixes` → fast-forwarded into `main` (720faba). Branch deleted after merge.

## Goals (pre-session)
- [x] Revisi A: Remove "Nilai Akhir (AAM)" row + deep-remove `finalValue` field from pure calc
- [x] Revisi B: Fix DLOM/DLOC sign bug in Simulasi Potensi page
- [~] Revisi C: B&W redesign (Creddo-inspired) — **intentionally deferred to Session 023** per user decision to split scope

## Delivered

### Revisi A — AAM deep removal (system-wide)
- `src/lib/calculations/aam-valuation.ts` — removed `paidUpCapitalDeduction` input field + `finalValue` result field + computation. Updated JSDoc header to reflect new ceiling at E59.
- `src/lib/calculations/upstream-helpers.ts` — `buildAamInput` no longer assigns `paidUpCapitalDeduction`.
- `src/app/valuation/aam/page.tsx` — row "Nilai Akhir (AAM)" (lines 279-284) deleted. "Market Value (30.0% Equity)" promoted to final row with total styling (`border-t-2 border-grid-strong bg-canvas-raised` + `text-lg font-semibold text-accent`).
- `src/app/dashboard/page.tsx:111` — `perShare` redirected to `marketValuePortion / (jumlahSahamBeredar × proporsiSaham)` — consistent proportional per-share without paid-up deduction step.
- `src/types/financial.ts` — comment on `nilaiNominalPerSaham` updated (now reference metadata, not used in calc).
- `__tests__/lib/calculations/aam-valuation.test.ts` — 15 tests; added guard `'finalValue' in result).toBe(false)`; removed `paidUpCapitalDeduction` input + `finalValue` expectation.

### Revisi B — Simulasi Potensi sign normalization
- `src/lib/calculations/simulasi-potensi.ts` — `dlomAmount = equityValue100 * -dlomPercent`, `dlocAmount = equityLessDlom * -dlocPercent` (negate internal, matching `computeAam` pattern). JSDoc interface updated: caller passes positive percentages.
- `src/app/valuation/simulasi-potensi/page.tsx` — no change needed (already passes `home.dlomPercent` positive; previously bug-inducing now auto-correct).
- `__tests__/lib/calculations/simulasi-potensi.test.ts` — 21 tests; all `dlomPercent`/`dlocPercent` inputs flipped from negative to positive; negative result signs (`dlomAmount`, `dlocAmount`) preserved.

### Mathematical correctness verified
Example case (equityValue 26.4B, DLOM 30%, DLOC 50%, proporsi 30%):
- **Before fix**: equity + 7.93B = 34.37B (adding) → MV 100% = 52.92B (wrong)
- **After fix**: equity − 7.93B = 18.51B (subtracting) → MV 100% = 8.51B (matches AAM page, matches fixture)

## Verification
```
Tests:     838/838 passing (57 files)
Build:     ✅ 34 static pages
Typecheck: ✅ clean
Lint:      ✅ clean
Live:      https://kka-penilaian-saham.vercel.app (HTTP 200 post-deploy)
```

## Stats
- Commits: 1 (720faba)
- Files changed: 8 source (+ 2 test)
- Lines +37 / −49 (net −12)
- Test files: 57 (unchanged) · Tests: 838 (unchanged — all pre-existing tests updated to new contract)

## Deviations from Plan
- Original prompt bundled 3 revisi; user chose to split (Recommended option) after clarification round: Revisi A+B this session (bug/UX fixes, low risk), Revisi C (B&W redesign) deferred to dedicated session 023 to allow proper brainstorm + design.md Phase 1.

## Deferred
- **Session 023 — B&W Redesign (Creddo-inspired)**. Pre-locked decisions from clarification Q&A:
  - Font: Montserrat (body/heading) + JetBrains Mono (financial numbers)
  - Palette: Near-white `#fafdff` + Near-black `#000004` (Creddo tokens)
  - Dark mode toggle: `next-themes` class-based, localStorage-persisted, default light
  - Semantic colors: dark-red `#8B0000` + dark-emerald `#064E3B` for subtle negative/positive
  - Token pipeline: rewrite `globals.css` `@theme inline` block — components using existing Tailwind classes (`text-ink`, `bg-canvas`, `border-grid`) auto-adapt via CSS var indirection.
- Upload parser, RESUME page, bilingual rollout, RINCIAN IS/FA export — still queued from Session 021's next-priority list.

## Lessons Extracted
- [LESSON-062](../lessons-learned.md#lesson-062): Shared-parameter calc modules MUST share sign convention — contract mismatch creates silent bugs
- [LESSON-063](../lessons-learned.md#lesson-063): Before removing a result field, grep all consumers — pure-calc removal without UI cascade leaves dashboard broken

## Files Changed
```
__tests__/lib/calculations/aam-valuation.test.ts         [MODIFIED]
__tests__/lib/calculations/simulasi-potensi.test.ts      [MODIFIED]
src/app/dashboard/page.tsx                               [MODIFIED]
src/app/valuation/aam/page.tsx                           [MODIFIED]
src/lib/calculations/aam-valuation.ts                    [MODIFIED]
src/lib/calculations/simulasi-potensi.ts                 [MODIFIED]
src/lib/calculations/upstream-helpers.ts                 [MODIFIED]
src/types/financial.ts                                   [MODIFIED]
```

## Next Session Recommendation
**Session 023 — B&W Redesign** (pre-locked design decisions above). Workflow:
1. Phase 1 Brainstorm: open design.md for visual identity section, confirm creddo tokens mapping
2. Phase 2 Plan: enumerate pages needing visual regression spot-check (34 pages)
3. Phase 3 Implement: (a) rewrite globals.css `:root` + `.dark` + `@theme inline`, (b) font swap `next/font` Montserrat + JetBrains Mono, (c) add ThemeProvider + toggle, (d) visual regression sweep
4. Rollback plan: since CSS vars are the switching point, revert is single-file if design fails user acceptance

# AUDIT GATE — INPUT DATA Integrity Check

**Date**: 2026-04-14
**Auditor**: Claude (4 parallel agents + manual verification)
**Baseline**: 837/837 tests, build clean, lint clean, typecheck clean

---

## Executive Summary

| Section | Status | Critical | High | Medium | Low |
|---------|--------|----------|------|--------|-----|
| Fixed Asset | ❌ FAIL | 1 | 2 | 2 | 3 |
| Balance Sheet | ⚠️ CONDITIONAL | 0 | 1 | 1 | 4 |
| Income Statement | ✅ PASS | 0 | 0 | 1 | 5 |
| Cross-cutting | ✅ PASS | 0 | 0 | 0 | 1 |

**Blocking issues**: 2 (FA sentinel + BS sentinel)
**Non-blocking issues**: 19

---

## Fixed Asset

### Status Awal
- Pass checklist: 7/11
- Issues: 8 (1 critical, 2 high, 2 medium, 3 low)

### Issues & Fix

| # | Cat | Sev | Description | File | Fix |
|---|-----|-----|-------------|------|-----|
| FA-1 | Integration | **CRITICAL** | Dynamic editor stores at FA_OFFSET keys (2008/4008/5008) but ALL 12+ downstream consumers use static manifest expecting old rows (17/36/45). All FA-dependent computations silently produce zeros. | DynamicFaEditor.tsx | Add sentinel pre-computation at persist time — map offset rows to legacy positions + compute 7 subtotals |
| FA-2 | Integration | HIGH | No sentinel pre-computation at persist time (unlike IS which has this) | DynamicFaEditor.tsx | Implement IS-pattern sentinel logic |
| FA-3 | Integration | HIGH | `upstream-helpers.ts` + `compute-cash-flow-live.ts` call `deriveComputedRows(STATIC_FA_MANIFEST, faRows)` — overwrites correct sentinels with wrong subtotals | upstream-helpers.ts, compute-cash-flow-live.ts | Skip re-derive when sentinels present |
| FA-4 | UX | MEDIUM | No upper bound on yearCount — overflows colLetters at 15+ | DynamicFaEditor.tsx | Cap at 10 |
| FA-5 | UX | MEDIUM | Footer buttons ("Simpan", "Reset") not bilingual | DynamicFaEditor.tsx | Use i18n strings |
| FA-6 | UX | LOW | No Escape key handler in ConfirmDialog | DynamicFaEditor.tsx | Add keydown listener |
| FA-7 | UX | LOW | No beforeunload guard for unsaved debounced changes | DynamicFaEditor.tsx | Deferred (low risk for DJP users) |
| FA-8 | UX | LOW | No input validation bounds | RowInputGrid.tsx | Deferred (DJP users enter known values) |

### Root Cause Analysis (FA-1/FA-2/FA-3)

The dynamic FA editor (Session 019) introduced FA_OFFSET multipliers to avoid excelRow collisions across 7 sub-blocks. This was correct for the editor's internal model, but the persist logic stores raw offset-keyed data without mapping back to the legacy positions that all downstream consumers expect.

The IS editor (also Session 019) solved the same problem with sentinel pre-computation — all 14 IS sentinels are pre-computed and stored at canonical row positions. The FA editor lacks this step.

**Fix strategy** (follows IS sentinel pattern per LESSON-052):
1. At persist time, for each original account (excelRow 8-13), copy offset data to legacy positions
2. Compute 7 subtotals (summing ALL accounts including extended) at sentinel positions (14, 23, 32, 42, 51, 60, 69)
3. Update downstream FA consumers to read sentinels directly (don't re-derive subtotals)

---

## Balance Sheet

### Status Awal
- Pass checklist: 9/11
- Issues: 6 (0 critical, 1 high, 1 medium, 4 low)

### Issues & Fix

| # | Cat | Sev | Description | File | Fix |
|---|-----|-----|-------------|------|-----|
| BS-1 | Integration | HIGH | `allBs = {...bsRows, ...bsComp}` — `bsComp` from static manifest overwrites pre-computed sentinels. Extended accounts (excelRow 100+) invisible to downstream subtotals. | projection-pipeline.ts, page callers | Add sentinel pre-computation in DynamicBsEditor + update downstream to read sentinels |
| BS-2 | UX | MEDIUM | No upper bound on yearCount | DynamicBsEditor.tsx | Cap at 10 |
| BS-3 | UX | LOW | Dropdown missing Escape key handler | RowInputGrid.tsx | Add keydown listener |
| BS-4 | Code | LOW | `addButtonLabels` typed `Record<string, string>` instead of `Record<BsSection, string>` | balance-sheet i18n | Type tighten |
| BS-5 | Code | LOW | Dead ternary: `yearCount === 1 ? 'tahun' : 'tahun'` | DynamicBsEditor.tsx | Remove ternary |
| BS-6 | UX | LOW | Footer buttons not bilingual | DynamicBsEditor.tsx | Use i18n strings |

---

## Income Statement

### Status Awal
- Pass checklist: 10/11
- Issues: 6 (0 critical, 0 high, 1 medium, 5 low)

### Issues & Fix

| # | Cat | Sev | Description | File | Fix |
|---|-----|-----|-------------|------|-----|
| IS-1 | UX | MEDIUM | Custom net_interest accounts always default interestType 'expense' — no way to select 'income' | DynamicIsEditor.tsx | Add interestType selector for net_interest custom accounts |
| IS-2 | UX | LOW | No upper bound on yearCount | DynamicIsEditor.tsx | Cap at 10 |
| IS-3 | UX | LOW | No confirmation dialog for individual account removal | DynamicIsEditor.tsx | Add confirm |
| IS-4 | UX | LOW | Footer buttons not bilingual | DynamicIsEditor.tsx | Use i18n strings |
| IS-5 | UX | LOW | "Tersimpan" feedback not bilingual | DynamicIsEditor.tsx | Use i18n |
| IS-6 | Code | COSMETIC | Dead code at useKkaStore.ts:424 (overwritten at 426) | useKkaStore.ts | Remove dead line |

---

## Cross-Cutting

### Status: PASS

- Store v13: complete migration chain, all 3 input slices present, `_hasHydrated` correct
- `deriveComputedRows`: handles signed refs, subtotal chaining, edge cases (12 tests)
- `parseFinancialInput`: 10 test cases covering all Indonesian financial formats
- `buildLiveCellMap`: 9 tests, clean bridge to CellMap pipeline
- Zero `any`, zero `@ts-ignore`, zero `console.log`, zero `HACK/FIXME` in src/
- Only gap: no dedicated tests for `formatIdr`/`formatPercent` (acceptable — simple Intl wrappers)

---

## Fix Priority

### Must Fix (blocks downstream integrity)
1. **FA-1/FA-2/FA-3**: FA sentinel pre-computation + downstream update
2. **BS-1**: BS sentinel pre-computation + downstream update

### Should Fix (quality/consistency)
3. **IS-6**: Remove dead code in store migration
4. **FA-4/BS-2/IS-2**: Cap yearCount at 10 for all 3 editors
5. **FA-5/BS-6/IS-4/IS-5**: Bilingual footer buttons across all editors

### Nice to Have (deferred)
6. IS-1: Custom interestType selector
7. BS-3/FA-6: Escape key handlers
8. BS-4/BS-5: Type tightening, dead ternary

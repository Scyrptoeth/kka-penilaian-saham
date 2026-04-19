# Session 055 — Plan

**Branch**: `feat/session-055-invested-capital-cash-scope-nfa-cwc`
**Strategy**: TDD, commit per task, parallel agents where independent

## Tasks (18 tracked via TaskList)

1. **Rename global**: ROIC "Non Operating Fixed Assets" → "Other Non-Operating Assets" — manifest label + fixture JSONs + i18n scaffolding
2. **Store v22→v23**: 3 slice types + setters + migration + partialize + ExportableState
3. **computeInvestedCapital**: pure helper BS+FA sourced
4. **computeCashBalance**: pure helper 1-list + year-shift
5. **computeCashAccount**: pure helper bank+cashOnHand
6. **IC page**: `/input/invested-capital` with 3-section dropdown-add
7. **CashBalance page**: `/input/cash-balance` single-section + pre-history
8. **CashAccount page**: `/input/cash-account` 2-section mutex
9. **ROIC rewire**: compute + gate + builder
10. **Growth Rate NFA fix**: compute refactor both rows FA + LESSON-057 merge + gate
11. **CWC multi-year**: FinancialTable matrix + Avg
12. **CFS rewire**: cash rows scope-aware + gate
13. **Nav tree**: 3 entries alphabetical Drivers & Scope
14. **i18n bulk**: ~55 keys bilingual EN/ID
15. **Phase C fixture**: extend `pt-raja-voltama-state.ts`
16. **Verification gate**: full suite + build + typecheck + lint + audit + Phase C
17. **Merge + deploy**: main + Vercel live
18. **Wrap-up**: history + lessons + progress.md

## Dependencies

- Task 2 blocks 3/4/5/6/7/8/9/10/11/12 (store types needed)
- Task 3/4/5 blocks 9/10/12 (compute needed for consumers)
- Task 14 parallel-friendly with most (just translations.ts append)
- Task 16 blocks 17
- Task 17 blocks 18

## Parallelization Plan

- **Sequential (main thread)**: 1 (rename), 2 (store — critical), 13-14 (small)
- **Parallel batch A** (after Task 2): 3+4+5 (compute helpers — pure functions, independent)
- **Parallel batch B** (after A): 6+7+8 (pages — independent routes, mirror IBD pattern)
- **Parallel batch C** (after compute + pages): 9+10+11+12 (consumer rewires — touch different files)
- **Sequential tail**: 15 → 16 → 17 → 18

## Verification Target

```
Tests:     1393+50 new = ~1443 passing, 0 regressions
Build:     ✅ 45 static pages (+3 new input routes)
Typecheck: ✅
Lint:      ✅
Audit:     ✅ 0 i18n violations
Phase C:   ✅ 5/5
Cascade:   ✅ 3/3 (29/29)
Live:      penilaian-bisnis.vercel.app HTTP 200
Store:     v23
```

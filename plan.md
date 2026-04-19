# Session 056 — Plan (Cluster C Financing)

**Branch**: `feat/session-056-financing-scope`
**Strategy**: TDD, commit per task, parallel agents where independent

## Tasks (14 tracked)

1. **Design + plan** (done) — design.md section appended, plan.md rewritten
2. **Create feature branch** — from main
3. **computeFinancing pure helper (TDD)** — `src/lib/calculations/compute-financing.ts` + 12+ test cases
4. **Store v23→v24 migration** — `FinancingState` + mutex setter `assignFinancing(row, excelRow)` + migration + 4 TDD cases
5. **`/input/financing` page editor** — 5-section hydration-gated, dropdown-add, trash, sticky confirm, trivia bilingual
6. **Nav-tree + i18n keys** — Drivers & Scope 6→7 alphabetical + ~55 i18n keys
7. **CFS view rewire + required-gate** — CashFlowLiveView + compute-cash-flow-live refactor (accept financingResult, replace hardcoded isLeaves[26/27] + apRows[10/19/20])
8. **CashFlowStatementBuilder + Phase C fixture** — upstream += 'financing', pre-compute, fixture reconstruction for PT Raja parity
9. **Full verification gates** — test + build + typecheck + lint + audit + phase-c + cascade
10. **Dev server render verification** — curl /input/financing + /analysis/cash-flow-statement
11. **Documentation** — lessons-learned.md append + history/session-056-*.md + progress.md rewrite
12. **Commit chain** — 7-8 conventional commits per logical block; explicit paths only
13. **Merge to main + push + Vercel deploy + live verification** — fast-forward, push origin main, curl penilaian-bisnis.vercel.app HTTP 200

## Dependencies

- Task 2 (branch) blocks 3/4/5/6/7/8
- Task 4 (store) blocks 5/7/8 (FinancingState type needed)
- Task 3 (compute) blocks 7/8 (computeFinancing consumer)
- Task 6 (nav/i18n) parallel with most
- Task 9 blocks 10 (verification before live render)
- Task 10 blocks 11 (docs only after verified)
- Task 12 blocks 13 (commit before merge)

## Parallelization Plan

- **Sequential (main thread)**: 2 (branch), 9/10 (verification), 11/12/13 (docs+merge+deploy)
- **Parallel batch A** (after Task 2): 3 + 4 (pure compute + store — independent files)
- **Parallel batch B** (after A): 5 + 6 + 7 + 8 (page + nav/i18n + consumer rewire + builder — independent files)
  - Task 5 reads store types from Task 4
  - Task 6 reads translation.ts (careful ordering with other i18n updates)
  - Task 7 + 8 consume compute from Task 3

## Verification Target

```
Tests:     1420 → ~1440 passing, 0 regressions
Build:     ✅ 45 → 46 static pages (+1 /input/financing)
Typecheck: ✅
Lint:      ✅
Audit:     ✅ 0 i18n violations
Phase C:   ✅ 5/5 (numeric parity preserved via fixture reconstruction)
Cascade:   ✅ 3/3 (29/29)
Live:      penilaian-bisnis.vercel.app HTTP 200/307 after Vercel deploy
Store:     v24
```

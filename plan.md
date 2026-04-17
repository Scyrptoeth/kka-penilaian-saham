# Session 034 Plan — T7: 9 PROY/Valuation/Dashboard Builders

**Branch**: `feat/session-034-proy-valuation-dashboard-builders`
**Target**: 9 new `SheetBuilder` entries in registry → cascade 20 → 29.

Each task independently verifiable. Commit per task. Feature branch
merged to main at T10 after full verification gate.

---

## T1. Design + Plan + Branch — ✅ DONE

- [x] `design.md` written (Phase 1 brainstorm)
- [x] `plan.md` written (this file)
- [x] Feature branch created: `feat/session-034-proy-valuation-dashboard-builders`
- Commit: `docs: session 034 plan — T7 9 builders`

## T2. Extract `buildCfiInput` + `buildDashboardInput` to `upstream-helpers.ts`

**Scope**: enforce LESSON-046 for the 2 remaining uncentralized mapping
patterns.

- [ ] RED: unit tests for `buildCfiInput` + `buildDashboardInput` in
  `__tests__/lib/calculations/upstream-helpers.test.ts`
- [ ] GREEN: export 2 new functions from `src/lib/calculations/upstream-helpers.ts`
- [ ] REFACTOR: `src/app/valuation/cfi/page.tsx` + `src/app/dashboard/page.tsx`
  consume the new builders (remove inline mapping)
- [ ] Verify: build + typecheck + lint + audit all green
- Commit: `refactor(upstream-helpers): extract buildCfiInput + buildDashboardInput`

## T3. ProyLrBuilder

- [ ] RED: `__tests__/lib/export/sheet-builders/proy-lr.test.ts`
- [ ] GREEN: `src/lib/export/sheet-builders/proy-lr.ts`
- [ ] Register + cascade extend → 21
- Commit: `feat(export): ProyLrBuilder`

## T4. ProyFaBuilder

- [ ] RED + GREEN + Register + cascade → 22
- Commit: `feat(export): ProyFaBuilder`

## T5. ProyBsBuilder

- [ ] RED + GREEN + Register + cascade → 23
- Commit: `feat(export): ProyBsBuilder`

## T6. ProyNoplatBuilder

- [ ] RED + GREEN + Register + cascade → 24
- Commit: `feat(export): ProyNoplatBuilder`

## T7. ProyCfsBuilder

- [ ] RED + GREEN + Register + cascade → 25
- Commit: `feat(export): ProyCfsBuilder`

## T8. DcfBuilder

- [ ] RED + GREEN + Register + cascade → 26
- Commit: `feat(export): DcfBuilder`

## T9. EemBuilder + CfiBuilder

- [ ] EemBuilder — commits separately
- [ ] CfiBuilder — commits separately
- [ ] Register both + cascade → 28

## T10. DashboardBuilder + Final Verify + Merge

- [ ] DashboardBuilder + Register + cascade **→ 29 (final)**
- [ ] Full verification gate (build/test/typecheck/lint/audit/phase-c)
- [ ] Merge to main (fast-forward)
- [ ] Post-merge HTTP probe
- [ ] Invoke `/update-kka-penilaian-saham` Mode B
- Commits: `feat(export): DashboardBuilder`, `test(export): cascade 20→29`, `docs: session 034 wrap-up`

---

## Progress Tracker

- [x] T1: design + plan + branch
- [ ] T2: upstream-helpers extension (+ page refactor)
- [ ] T3: ProyLrBuilder
- [ ] T4: ProyFaBuilder
- [ ] T5: ProyBsBuilder
- [ ] T6: ProyNoplatBuilder
- [ ] T7: ProyCfsBuilder
- [ ] T8: DcfBuilder
- [ ] T9: EemBuilder + CfiBuilder
- [ ] T10: DashboardBuilder + cascade final + full verify + merge + Mode B

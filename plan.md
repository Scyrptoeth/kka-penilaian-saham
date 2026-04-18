# Session 036 Plan — Dynamic Account Interoperability

**Branch**: `feat/session-036-dynamic-projection`
**Target**: End-to-end per-account growth projection (Proy BS + Proy FA) + Input FA CS/Growth feature parity + Additional Capex dynamic + Export builder cascade.
**Budget**: 6–8 hours. MVP cut at T6 (full projection working). T7–T10 extended scope (Additional Capex + export builders + Phase C reconciliation).

---

## Task 1 — Scaffold + branch + design commit

- [ ] Create `feat/session-036-dynamic-projection` from main
- [ ] Commit design.md + plan.md
- [ ] Verify clean: `npm test && npm run typecheck && npm run lint`
- **Verification**: branch checked out, docs committed, all gates green on main baseline.

## Task 2 — Input FA Common Size + Growth YoY columns (feature parity)

**Files**:
- `src/components/forms/DynamicFaEditor.tsx` — add `commonSizeData` + `growthData` memos + props to `RowInputGrid`

**TDD**:
- [ ] RED: test that `DynamicFaEditor` passes non-empty `commonSize` + `growth` props when `fixedAsset.rows[69]` > 0
- [ ] GREEN: implement memos mirroring DynamicBsEditor lines 159–190 (denominator = row 69)
- [ ] Verify visually: dev server render shows CS + Growth YoY columns on Input FA

**Verification**: new Vitest cases green; snapshot/render test; no regression in DynamicBsEditor/DynamicIsEditor tests.

## Task 3 — `computeProyBsLive` rewrite (Full Simple Growth)

**Files**:
- `src/data/live/compute-proy-bs-live.ts` — rewrite to new signature
- `__tests__/lib/calculations/compute-proy-bs-live.test.ts` — rewrite tests

**TDD**:
- [ ] RED: write 8 tests covering (a) uniform per-account growth, (b) subtotals via computedFrom, (c) 3-year projection, (d) custom/extended accounts, (e) zero-growth handling, (f) negative-value handling, (g) missing historical years, (h) Balance Control diagnostic
- [ ] GREEN: new signature `(input: ProyBsInput, projYears) => Record<number, YearKeyedSeries>`
  - Iterate `input.accounts`, project each leaf
  - Apply `deriveComputedRows` for totals
  - Compute Balance Control = rows[33] − rows[62]
- [ ] REFACTOR: clean legacy imports

**Verification**: 8 new tests pass; old call sites identified for Task 4.

## Task 4 — Proy BS page rewrite + caller updates

**Files**:
- `src/app/projection/balance-sheet/page.tsx` — rewrite renderer to iterate `balanceSheet.accounts`
- `src/app/projection/cash-flow/page.tsx` — verify CFS still works with new Proy BS signature
- `src/lib/calculations/projection-pipeline.ts` — update if consumed
- `src/data/live/compute-proy-bs-live.ts` — update old callers

**Tasks**:
- [ ] Page renders dynamic rows: sections from BsSection enum, leaf rows from accounts, Growth row below each, subtotal/total rows from computedFrom
- [ ] Labels honor `account.customLabel || catalog.labelEn || labelId` (language-aware)
- [ ] No FA cross-ref, no PROY LR reference, no intangible special-case

**Verification**: dev-server render on PT Raja Voltama fixture matches image-01 mental model; Proy CFS/NOPLAT pages still render (do not crash).

## Task 5 — `computeProyFixedAssetsLive` rewrite (Net Value growth)

**Files**:
- `src/data/live/compute-proy-fixed-assets-live.ts` — rewrite
- `__tests__/lib/calculations/compute-proy-fixed-assets-live.test.ts` — rewrite tests

**TDD**:
- [ ] RED: 8 tests covering (a) per-account Net Value growth, (b) 7-band internal projection via same growth rate, (c) Dep Additions (row 51) non-zero for PROY LR cascade, (d) totals per band, (e) extended accounts (excelRow ≥ 100), (f) custom accounts (≥ 1000), (g) zero-growth edge, (h) missing Net Value historical
- [ ] GREEN: new signature, loop accounts × 7 bands, uniform NV-growth
- [ ] Totals computed per-band summing leaves

**Verification**: 8 new tests pass; PROY LR depreciation cascade preserved.

## Task 6 — Proy FA page rewrite + MVP gate

**Files**:
- `src/app/projection/fixed-asset/page.tsx` — rewrite renderer for dynamic accounts × 7 bands

**Tasks**:
- [ ] All FA accounts listed under each of 7 band sections (read-only)
- [ ] Display logic: Net Value band shows values for proj years; Acq/Dep bands show "—" for proj years (still display historical last year)
- [ ] Growth row under each Net Value account shows per-account NV avg YoY growth
- [ ] Internal data (Acq/Dep) still in output for downstream (via useMemo cast; display filter)

**MVP Gate (after Task 6)**:
- [ ] `npm test` all green (new + existing)
- [ ] `npm run build` — 39 pages still prerender
- [ ] `npm run typecheck` clean
- [ ] `npm run lint` zero warnings
- [ ] Dev-server smoke test: Input FA shows CS/Growth; Proy BS + Proy FA render with PT Raja Voltama fixture
- [ ] **Commit checkpoint**: if context budget tight, STOP here and merge MVP. T7–T10 slip to 036.5.

## Task 7 — Store v15→v16 migration + Additional Capex slice

**Files**:
- `src/lib/store/useKkaStore.ts` — add `additionalCapexByAccount` to KeyDrivers slice; migrate function v15→v16
- `__tests__/lib/store/migrate-v16.test.ts` — migration unit test

**TDD**:
- [ ] RED: test (a) v15 state → v16 has empty additionalCapexByAccount, old field stripped; (b) other fields preserved; (c) already-v16 pass-through
- [ ] GREEN: implement migrate v15→v16 in useKkaStore persist config

**Verification**: 3+ migration cases green.

## Task 8 — Key Drivers Additional Capex dynamic section

**Files**:
- `src/components/forms/KeyDriversForm.tsx` — rewrite Additional Capex section to iterate `fixedAsset.accounts`
- `src/lib/i18n/translations.ts` — adjust KD labels if needed

**Tasks**:
- [ ] Section reads `fixedAsset?.accounts` — if null, show empty-state prompt linking to Input FA
- [ ] Per account × projection year: NumericInput bound to `keyDrivers.additionalCapexByAccount[excelRow][year]`
- [ ] Footer: Total Additional Capex per year row (sum across accounts)
- [ ] Debounced auto-save to store

**Verification**: Render test with mock FA accounts; input updates store.

## Task 9 — Export builder updates (ProyBsBuilder + ProyFaBuilder)

**Files**:
- `src/lib/export/sheet-builders/proy-balance-sheet.ts` — extended account injection (Session 025 BS pattern)
- `src/lib/export/sheet-builders/proy-fixed-asset.ts` — extended account injection (Session 028 FA pattern)
- `__tests__/lib/export/sheet-builders/proy-balance-sheet.test.ts` — updated cases
- `__tests__/lib/export/sheet-builders/proy-fixed-asset.test.ts` — updated cases

**TDD**:
- [ ] RED: test extended account (excelRow 100) writes to expected template row/col; custom account (excelRow 1000) ditto
- [ ] GREEN: follow `injectExtendedBsAccounts` + `extendBsSectionSubtotals` pattern

**Verification**: per-builder tests + cascade integration + Phase C expansion (Task 10).

## Task 10 — Phase C whitelist + full gate + merge

**Files**:
- `__tests__/integration/phase-c-verification.test.ts` — expand `KNOWN_DIVERGENT_CELLS`
- `progress.md` — update to Session 036 delivered state
- `lessons-learned.md` — extract lessons
- `history/session-036-dynamic-projection.md` — session snapshot

**Tasks**:
- [ ] Add Proy BS rows that now diverge from PT Raja Voltama template (growth-based ≠ template cached)
- [ ] Add Proy FA Acq/Dep band cells that are now null in projection years
- [ ] `npm run verify:phase-c` green
- [ ] Full gate: build + test + typecheck + lint + audit + Phase C + cascade
- [ ] Merge feature branch to main via fast-forward
- [ ] Push main
- [ ] Live-deploy smoke: HTTP 307 → 200
- [ ] `/update-kka-penilaian-saham` Mode B (invoked by user at wrap-up)

**Verification**: All gates green, live 200, docs committed.

---

## Dependency Graph

```
T1 (scaffold) ──► T2 (Input FA CS/Growth) ──┐
                                              ├──► MVP gate at T6
T1 ──► T3 (Proy BS compute) ──► T4 (page) ──┤
T1 ──► T5 (Proy FA compute) ──► T6 (page) ──┘
                                              │
                                              ▼
                                       T7 (store migration)
                                              │
                                              ▼
                                       T8 (KD Additional Capex)
                                              │
                                              ▼
                                       T9 (Export builders)
                                              │
                                              ▼
                                       T10 (Phase C + gate + merge)
```

## Success Criteria

- [ ] User adds a custom BS account (e.g. "Piutang Koperasi") at Input BS → appears in Proy BS with growth row → value projects per historical growth
- [ ] User adds a custom FA account (e.g. "Mesin Pabrik") at Input FA → appears in Proy FA × 7 bands, Net Value projects via own historical NV growth
- [ ] Input FA now has Common Size + Growth YoY columns (feature parity with Input BS / IS)
- [ ] Key Drivers Additional Capex shows dynamic FA accounts (no hardcoded 4 rows)
- [ ] Export .xlsx has dynamic accounts written to template via extended-row injection
- [ ] All existing tests + new tests green
- [ ] `verify:phase-c` green (coverage-invariant for projection sheets maintained)
- [ ] 29/29 `MIGRATED_SHEETS` cascade still green
- [ ] Live deploy HTTP 200

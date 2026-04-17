# Session 035 Plan — T8-T10: Legacy Cleanup + Phase C State-Parity Rewrite

**Branch**: `feat/session-035-legacy-cleanup-v2-promotion`
**Target**: V1 body ≤ 20 LOC + strict state-parity Phase C + zero dead code.

Every task independently verifiable. Commit per task. Feature branch
merges to main at T10 after the full verification gate passes green.

---

## T1. Design + Plan + Branch — in progress

- [x] `design.md` rewritten for Session 035 (Phase 1 output, committed
  as part of T1)
- [x] `plan.md` rewritten (this file)
- [ ] Await user approval on this plan
- [ ] Create feature branch `feat/session-035-legacy-cleanup-v2-promotion`
- Commit 1: `docs: session 035 design + plan — T8-T10 legacy cleanup`

## T2. `stripCrossSheetRefsToBlankSheets` helper + TDD

**Scope**: new exported utility in `src/lib/export/export-xlsx.ts`
(colocated with `sanitizeDanglingFormulas`). Identifies formulas whose
cross-sheet reference targets a cleared sheet and replaces them with
cached values.

- [ ] RED: write `__tests__/lib/export/strip-cross-sheet-refs.test.ts`
  with 4 cases:
  1. formula `='BLANK SHEET'!A1` on populated sheet, blankSheets =
     `['BLANK SHEET']`, result = cached value
  2. formula `=BLANK_SHEET!A1` (unquoted) → also stripped
  3. formula `='POPULATED'!A1` on populated sheet, blankSheets =
     `['BLANK SHEET']` → untouched
  4. clearedSheets = `[]` → identity no-op across workbook
- [ ] GREEN: implement `stripCrossSheetRefsToBlankSheets(workbook,
  clearedSheets)` in `src/lib/export/export-xlsx.ts`. Reuse the
  cached-value extraction pattern from `sanitizeDanglingFormulas`
  (error-string/error-object null guards).
- [ ] Export from `src/lib/export/index.ts` barrel
- [ ] Verify: `npm test -- strip-cross-sheet-refs` all green
- Commit 2: `feat(export): stripCrossSheetRefsToBlankSheets helper`

## T3. Extend `runSheetBuilders` to return `{ clearedSheets }`

**Scope**: augment `src/lib/export/sheet-builders/registry.ts` so the
orchestrator is the authoritative source of blanked-sheet names. No
call-site breakage — existing callers (Phase C test, `exportToXlsx`)
can ignore the return value.

- [ ] RED: add test in `__tests__/lib/export/sheet-builders/registry.test.ts`:
  (a) all builders populated → `clearedSheets = []`; (b) some unpopulated
  → `clearedSheets` contains those sheet names; (c) registry empty →
  returns `{ clearedSheets: [] }`.
- [ ] GREEN: change `runSheetBuilders` return type from `void` to
  `{ clearedSheets: readonly string[] }`. Push sheet name when
  `isPopulated(upstream, state)` is false and `clearSheetCompletely`
  runs.
- [ ] Update callers: `exportToXlsx` captures return (for T4),
  Phase C test ignores it, cascade integration test updates assertions
  where relevant.
- [ ] Verify: `npm test -- registry` green, no other test regression
- Commit 3: `refactor(registry): runSheetBuilders returns clearedSheets`

## T4. `loadPtRajaVoltamaState` fixture-to-state adapter

**Scope**: new test helper at `__tests__/helpers/pt-raja-voltama-state.ts`
that reconstructs the full `ExportableState` from `__tests__/fixtures/`
JSONs. Covers all 12 store slices + 2 root fields.

- [ ] RED: write `__tests__/helpers/pt-raja-voltama-state.test.ts`:
  shape sanity (all 14 fields non-null/present) + spot-check 8 key
  values (HOME namaPerusahaan, BS!C8 cash, IS!D6 revenue, FA!C8
  acq-begin land, WACC ERP, DR tax rate, DLOM F7 answer, aamAdjustments
  empty object)
- [ ] GREEN: implement adapter. Per slice:
  - `home`: read `home.json`, build `HomeInputs` object
  - `balanceSheet`: read `balance-sheet.json`, derive rows grid +
    accounts array using `BS_CATALOG_ALL` and leafRows from
    `BALANCE_SHEET_GRID`
  - `incomeStatement`, `fixedAsset`, `accPayables`: similar pattern
  - `wacc`: read `wacc.json`, extract marketParams scalars + dynamic
    rows for comparableCompanies + bankRates
  - `discountRate`: scalars + bankRates
  - `keyDrivers`: scalars + arrays per `KEY_DRIVERS_ARRAYS`
  - `dlom`: answers object from F7..F25, jenisPerusahaan from C30,
    kepemilikan from C31
  - `dloc`: answers E7..E15, kepemilikan B21
  - `borrowingCapInput`: D5, D6
  - `aamAdjustments`: {}
  - `nilaiPengalihanDilaporkan`: read from simulasi-potensi-aam.json E11
- [ ] Verify: adapter test green
- Commit 4: `test(helpers): loadPtRajaVoltamaState fixture-to-state adapter`

## T5. Rewrite Phase C as strict state-parity test

**Scope**: replace `__tests__/integration/phase-c-verification.test.ts`
content in-place with the new state-parity shape. Same filename same
`npm run verify:phase-c` entry-point — rewrite semantics only.

- [ ] Enumerate sanitizer whitelist by snapshotting template, running
  `sanitizeDanglingFormulas` in isolation, diffing. Commit whitelist
  as const in the test file (expected: ≤ 30 cells, mostly hidden
  sheets + a few `#REF!` stragglers).
- [ ] Write new Phase C test:
  1. Load template, snapshot all WEBSITE_NAV_SHEETS
  2. `const state = loadPtRajaVoltamaState()`
  3. Run `exportToXlsx(state)` — full pipeline (still-V1 at this point;
     pipeline should work because all 29 sheets registered)
  4. Round-trip exported via writeBuffer + reload (match existing
     pattern for serialization verification)
  5. For each cell in templateSnapshot not in sanitizer whitelist:
     - If formula → assert formula string equal (after normalization)
     - If plain value → assert numerically equal @ 1e-6
  6. Also assert: visibility enforcement (29 visible sheets as today)
- [ ] Run test. Expected: GREEN on first try (builders already handle
  all 29 sheets; V1 body is inert for them). If RED, investigate — may
  indicate a hidden regression in one of the 29 builders.
- [ ] Update `phase-c-verification-report.md` — regenerated on failure.
- [ ] Verify: `npm run verify:phase-c` green, total test count increases
- Commit 5: `test(phase-c): strict state-parity rewrite with real fixtures`

## T6. Prune `exportToXlsx` body — in-place rewrite

**Scope**: replace the 90-line orchestration body in
`src/lib/export/export-xlsx.ts` (lines 78-167) with the slim ~15-line
version from design.md. Wire `stripCrossSheetRefsToBlankSheets` using
`runSheetBuilders` return value.

- [ ] Replace body. Keep all helper function definitions below unchanged.
- [ ] Remove imports no longer needed (`MIGRATED_SHEET_NAMES` still
  needed? — yes, deprecated but Phase C may use. Check grep first.)
- [ ] Remove no-longer-needed DLOM/DLOC/AAM/extended-injector wrappers
  at the orchestration layer (the helpers remain — only the V1 guarded
  call-sites go away).
- [ ] Run full test suite. Expected green. Phase C state-parity from
  T5 is the primary gate.
- Commit 6: `refactor(export): prune exportToXlsx body — registry-only pipeline`

## T7. Delete dead internal functions

**Scope**: remove 5 internal functions + their source-code overhead.
Zero downstream references → safe after T6.

- [ ] Delete `clearAllInputCells` function (lines 376-442 approx)
- [ ] Delete `injectScalarCells` function (lines 467-479)
- [ ] Delete `injectGridCells` function (lines 646-673)
- [ ] Delete `injectArrayCells` function (lines 679-690)
- [ ] Delete `injectDynamicRows` function (lines 725-736)
- [ ] Remove any JSDoc comments now-orphaned that reference the deleted
  functions (grep for orphan mentions)
- [ ] Remove `skipSheets` parameter documentation from `writeXxxFromSheet`
  helpers if it's there purely for V1 compat (it's not — the helpers
  target single sheet by name, no skipSheets param)
- [ ] Verify: `npm run typecheck` + `npm run lint` + `npm test` green,
  no dangling references
- Commit 7: `refactor(export): delete 5 dead internal injection functions`

## T8. Full verification gate + live check

**Scope**: run every gate before merge. Fix any regressions discovered.

- [ ] `npm run build 2>&1 | tail -25` — zero errors
- [ ] `npm test 2>&1 | tail -25` — expect ~1200+ passing, zero fails
- [ ] `npm run typecheck 2>&1 | tail -10` — clean
- [ ] `npm run lint 2>&1 | tail -10` — zero warnings
- [ ] `npm run audit:i18n` — zero violations
- [ ] `npm run verify:phase-c` — 5/5+ integrity gates green (new count)
- [ ] Cascade integration test still green (29/29 registered)
- [ ] `git diff --stat origin/main..HEAD` — sanity summary
- Commit 8: (if gate revealed a fix needed) `fix: ...` or skip if clean

## T9. Merge + push + live verify

- [ ] Sync feature branch with main: `git rebase main` (conflicts
  resolved if any)
- [ ] Merge to main: `git checkout main && git merge feat/session-035-legacy-cleanup-v2-promotion`
- [ ] Push: `git push origin main` (Vercel auto-deploys)
- [ ] Delete feature branch local + remote
- [ ] Curl live: `curl -s -o /dev/null -w "%{http_code}" https://penilaian-bisnis.vercel.app/` — expect 307 (root redirect to /akses)
- [ ] Spot-check /akses returns 200
- No new commit at this step (merge is a fast-forward or merge commit)

## T10. `/update-kka-penilaian-saham` Mode B wrap-up

**Scope**: session closer per SKILL.md Steps B1-B9.

- [ ] Gather session evidence (commits, stats)
- [ ] Write `history/session-035-legacy-cleanup-v2-promotion.md`
- [ ] Extract lessons learned (expected 3-4 new LESSON-099+ entries)
- [ ] Update `progress.md` with latest state (Phase C new shape, V1
  pruned, test count)
- [ ] Promote general lessons to `~/.claude/skills/start-kka-penilaian-saham/SKILL.md`
  section 2 (Delivered State) + section 8 (Tech Stack Gotchas) as fits
- [ ] Commit docs: `docs(session-035): wrap-up — V1 pruned + Phase C
  state-parity + N lessons`
- [ ] Push docs commit

## Success Gate Summary

After T10:
- Tests ≥ ~1200 green (T4 + T5 + T6 adds ~15-25 new tests)
- `exportToXlsx` body ≤ 20 LOC
- 5 internal functions deleted (verified via grep)
- Phase C runs strict cell-parity against PT Raja Voltama state
- `stripCrossSheetRefsToBlankSheets` exported + tested
- Live deploy HTTP 307 (root) + 200 (/akses)
- Session 035 history committed
- 3-4 new lessons recorded

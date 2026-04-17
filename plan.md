# Session 032 Plan — T5: 8 Input-Driven SheetBuilders

## Branch
`feat/session-032-input-builders` (off `main` at commit `e09fd53`)

## Scope (from Session 032 design.md)
Migrate the 8 input-driven sheets into the state-driven `SHEET_BUILDERS`
registry. Each builder is a thin wrapper over existing injectors filtered
to its own sheet. Legacy pipeline auto-skips via the reactive
`MIGRATED_SHEET_NAMES` proxy.

## Tasks (10 total — per Superpowers max)

### T1 — Brainstorm + design.md ✅
- Explore codebase: registry shape, cell mappings, builder pattern
- Identify Session 031 IS!B33 regression + plan WaccBuilder fix
- Identify ACC PAYABLES missing-from-ExportableState gap
- Write `design.md` Session 032

### T2 — plan.md + infrastructure extension + feature branch
Files:
- `plan.md` (this file)
- `src/lib/export/export-xlsx.ts`
  - Add optional `skipSheets` param to: `injectArrayCells`,
    `injectDynamicRows`, `injectDlomAnswers`, `injectDlocAnswers`,
    `injectDlomJenisPerusahaan`
  - Pass `MIGRATED_SHEET_NAMES` from `exportToXlsx` to each
  - Add `accPayables: AccPayablesInputState | null` to
    `ExportableState`
- `src/lib/export/cell-mapping.ts`
  - Add `ACC_PAYABLES_GRID: GridCellMapping`
  - Include in `ALL_GRID_MAPPINGS`
- `src/components/layout/ExportButton.tsx`
  - Add `accPayables: state.accPayables` to exportState
- Git: create `feat/session-032-input-builders` branch; commit
  "chore(export): extend skipSheets coverage + accPayables mapping"

**Verification**: `npm run typecheck` clean, existing tests still GREEN.

### T3 — HomeBuilder (TDD)
Files:
- `__tests__/lib/export/sheet-builders/home.test.ts` (NEW) — RED
- `src/lib/export/sheet-builders/home.ts` (NEW) — GREEN
- `src/lib/export/sheet-builders/registry.ts` — add HomeBuilder

Test cases (4):
1. Populated home → B4,B5,B6,B7,B9,B12 match state
2. Null home → sheet cleared (via orchestrator path)
3. Partial scalar undefined → skipped gracefully
4. Multi-run idempotent — same state, same output

### T4 — KeyDriversBuilder (TDD)
Files:
- `__tests__/lib/export/sheet-builders/key-drivers.test.ts` (NEW)
- `src/lib/export/sheet-builders/key-drivers.ts` (NEW)
- `registry.ts` — add KeyDriversBuilder

Test cases (4):
1. Populated state → 9 scalars + 12 arrays written to KEY DRIVERS
2. Null state → sheet cleared
3. `_cogsRatioProjected` synthetic array expansion works
4. Array write respects `length` per mapping

### T5 — AccPayablesBuilder (TDD)
Files:
- `__tests__/lib/export/sheet-builders/acc-payables.test.ts` (NEW)
- `src/lib/export/sheet-builders/acc-payables.ts` (NEW)
- `registry.ts` — add AccPayablesBuilder

Test cases (4):
1. Populated state → rows 10/11/14/19/20/23 across C/D/E written
2. Null state → sheet cleared
3. Partial year data → missing years skipped, existing written
4. Template formula at row 9 (Beginning) UNTOUCHED

### T6 — DlomBuilder (TDD)
Files:
- `__tests__/lib/export/sheet-builders/dlom.test.ts` (NEW)
- `src/lib/export/sheet-builders/dlom.ts` (NEW)
- `registry.ts` — add DlomBuilder

Test cases (5):
1. Home populated + dlom populated → all 3 cells + 10 answers written
2. Home populated + dlom null → only C30 (jenisPerusahaan) written
3. Null home → sheet cleared
4. jenisPerusahaan="terbuka" → C30 = "DLOM Perusahaan terbuka "
5. jenisPerusahaan="tertutup" → C30 = "DLOM Perusahaan tertutup "

### T7 — DlocBuilder (TDD)
Files:
- `__tests__/lib/export/sheet-builders/dloc.test.ts` (NEW)
- `src/lib/export/sheet-builders/dloc.ts` (NEW)
- `registry.ts` — add DlocBuilder

Test cases (3):
1. Populated → B21 + E7,E9,E11,E13,E15 written
2. Null → sheet cleared
3. Partial factor answers → empty factors left unwritten

### T8 — WaccBuilder (TDD) 🔧 includes IS!B33 fix
Files:
- `__tests__/lib/export/sheet-builders/wacc.test.ts` (NEW)
- `src/lib/export/sheet-builders/wacc.ts` (NEW)
- `registry.ts` — add WaccBuilder (position: after FixedAssetBuilder per
  design D4, but MUST be after IncomeStatementBuilder for IS!B33 write)

Test cases (5):
1. Populated → 4 scalars written to WACC
2. Populated → IS!B33 = state.wacc.taxRate (cross-sheet write)
3. Populated → comparableCompanies + bankRates dynamic rows
4. Null state → WACC sheet cleared; IS!B33 NOT written by this builder
5. Overrides null → waccOverride cell skipped gracefully

### T9 — DiscountRateBuilder + BorrowingCapBuilder (TDD, folded)
Files:
- `__tests__/lib/export/sheet-builders/discount-rate.test.ts` (NEW)
- `src/lib/export/sheet-builders/discount-rate.ts` (NEW)
- `__tests__/lib/export/sheet-builders/borrowing-cap.test.ts` (NEW)
- `src/lib/export/sheet-builders/borrowing-cap.ts` (NEW)
- `registry.ts` — add both

DR test cases (3):
1. Populated → 6 scalars + bankRates dynamic table
2. Null → sheet cleared
3. `multiplyBy100` column transform applied to rate column

BorrowingCap test cases (2):
1. Populated → D5 + D6 written
2. Null → sheet cleared

### T10 — Cascade integration test extension + verification + merge + Mode B
Files:
- `__tests__/integration/export-cascade.test.ts` — extend
  `WANT_BLANK_SHEETS` from 5 → 13
- `progress.md` — update to Session 032 complete state
- `history/session-032-input-builders.md` (NEW)
- `lessons-learned.md` — append new lessons
- `~/.claude/skills/start-kka-penilaian-saham/SKILL.md` — promote
  lessons worthy of "always-load" (if any)

Verification gate (all must be GREEN):
```bash
npm test 2>&1 | tail -20
npm run build 2>&1 | tail -15
npm run typecheck 2>&1 | tail -10
npm run lint 2>&1 | tail -10
npm run audit:i18n 2>&1 | tail -10
npm run verify:phase-c 2>&1 | tail -10
```

Merge:
```bash
git checkout main
git merge --ff-only feat/session-032-input-builders
git push origin main
```

Live verify:
```bash
curl -s -o /dev/null -w "%{http_code}" https://penilaian-bisnis.vercel.app/akses
```

Mode B commit:
```
docs: session 032 wrap-up — 8 input builders + IS!B33 fix + N lessons
```

## Expected outcome

- 13 sheets now in `SHEET_BUILDERS` registry (5 from Session 031 +
  8 new)
- IS!B33 cross-sheet regression fixed
- AccPayables data finally flows from store to export
- Legacy pipeline auto-skips migrated sheets without manual coordination
- ~40-50 new tests added (999 → ~1040)
- 16 remaining builders queued for Session 033+

## Risk mitigation

- **Risk**: WaccBuilder's IS!B33 write might interfere with
  IncomeStatementBuilder's label write. **Mitigation**: explicit test
  case verifying order (T8 case 2).
- **Risk**: AccPayables cell mapping year columns wrong (template may
  use different columns). **Mitigation**: first test case loads real
  template and reads cell addresses to verify before asserting.
- **Risk**: Adding `accPayables` to ExportableState breaks existing
  tests expecting the old shape. **Mitigation**: default to `null` at
  all test call sites; scan test helpers for `ExportableState`
  constructions.

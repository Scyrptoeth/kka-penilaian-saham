# Session 031 Plan — Core Builders (T3 + T4 continuation of Session 030)

## Branch
`feat/session-031-core-builders` (off `main` at commit `0169ae5`)

## Session Goal
Continue Session 030 state-driven export migration. Land **5 SheetBuilders**
(BS/IS/FA/AAM/SIMULASI POTENSI AAM) + legacy-pipeline skip logic + cascade
integration test. Primary user complaint ("prototipe labels PT Raja Voltama
bocor di 5 sheet") fixed.

## Scope (narrow, explicitly carved from plan.md Session 030)
- **T3 (BS/IS/FA)** — 3 builders wrap existing injectors + add
  `writeLabelsFromStore` col B override.
- **T4 (AAM/SIMULASI POTENSI)** — 2 builders reuse `buildAamInput` +
  `computeAam` + `computeSimulasiPotensi`; AAM labels from
  `balanceSheet.accounts` via reverse BS_ROW_TO_AAM_D_ROW; Simulasi writes
  `nilaiPengalihanDilaporkan` + relies on Excel cross-sheet formulas.
- **Cascade integration test** — narrow: all-null state → 5 migrated
  sheets blank.
- **Phase C exclusion** — skip migrated sheets in existing integrity test.
- **Merge + live verify + Mode B wrap**.

## Out of Scope (deferred to Session 032+)
- T5–T7 (remaining 24 builders)
- T8 (legacy `exportToXlsx` full removal, cross-sheet sanitizer)
- T9 (Phase C rewrite to website-state parity)
- AAM extended-account (excelRow ≥ 100) native injection in AAM sheet

## Tasks (10 total)

### T1 — Shared label-writer utility
**Files**:
- `src/lib/export/sheet-builders/label-writer.ts` [NEW] — generic
  `resolveLabel<C>(account, catalog, language)` + per-sheet `writeBsLabels`,
  `writeIsLabels`, `writeFaLabels`, `writeAamLabels`.
- `__tests__/lib/export/label-writer.test.ts` [NEW] — 8 tests across
  cases: customLabel wins, labelEn, labelId, unknown catalogId fallback.

**Commit**: `feat(export): shared label-writer utility for sheet builders`

### T2 — BalanceSheetBuilder
**Files**:
- `src/lib/export/sheet-builders/balance-sheet.ts` [NEW]
- `__tests__/lib/export/sheet-builders/balance-sheet.test.ts` [NEW]

**RED**: 4 tests — null bs slice → sheet blank (orchestrator path);
populated default catalog → labelEn in col B; populated id language →
labelId; renamed account via customLabel → custom text in col B.

**GREEN**: build() wraps `injectSingleGrid(BS)` + `injectBsCrossRefValues`
+ `injectExtendedBsAccounts` + `extendBsSectionSubtotals` + `writeBsLabels`.

**Commit**: `feat(export): BalanceSheetBuilder`

### T3 — IncomeStatementBuilder
**Files**: parallel structure to T2.
**Commit**: `feat(export): IncomeStatementBuilder`

### T4 — FixedAssetBuilder
**Files**: parallel structure. Handles 7-band label mirror.
**Commit**: `feat(export): FixedAssetBuilder`

### T5 — Register T3 builders + pipeline filter
**Files**:
- `src/lib/export/sheet-builders/registry.ts` [MODIFIED] — push BS, IS, FA.
- `src/lib/export/export-xlsx.ts` [MODIFIED] —
  - `injectGridCells(workbook, state, skipSheets?)` — filter
  - `clearAllInputCells(workbook, skipSheets?)` — filter
  - Guards on `injectBsCrossRefValues`, `injectExtendedBsAccounts`, etc.
  - Call `runSheetBuilders(workbook, state)` at correct pipeline position.

**Commit**: `feat(export): register BS/IS/FA builders, skip legacy pipeline`

### T6 — AamBuilder
**Files**:
- `src/lib/export/sheet-builders/aam.ts` [NEW]
- Test file

**Scope**: `build()` writes col B labels via reverse BS_ROW_TO_AAM_D_ROW
lookup + calls existing `injectAamAdjustments`. Upstream: `balanceSheet` +
`home` + `aamAdjustments`. Null any → blank sheet.

**Commit**: `feat(export): AamBuilder with dynamic labels`

### T7 — SimulasiPotensiBuilder
**Files**:
- `src/lib/export/sheet-builders/simulasi-potensi.ts` [NEW]
- Test file

**Scope**: writes `nilaiPengalihanDilaporkan` to E11; relies on Excel
formulas for cross-sheet reactivity to AAM/DLOM/DLOC sheets. Upstream:
`balanceSheet` + `home` + `dlom` + `dloc` + `aamAdjustments`. Null any →
blank sheet.

**Commit**: `feat(export): SimulasiPotensiBuilder`

### T8 — Register T4 + handle STANDALONE_SCALARS for SIMULASI
**Files**:
- `registry.ts` [MODIFIED] — push AAM + SIMULASI POTENSI (AAM).
- `export-xlsx.ts` [MODIFIED] — `injectScalarCells` filter skipSheets.
  Guard on `injectAamAdjustments`.

**Commit**: `feat(export): register AAM + Simulasi builders`

### T9 — Cascade integration test + Phase C exclusion
**Files**:
- `__tests__/integration/export-cascade.test.ts` [NEW] — all-null state →
  5 migrated sheets blank.
- `__tests__/integration/phase-c-verification.test.ts` [MODIFIED] — add
  `STATE_DRIVEN_SHEETS` exclusion to skip 5 migrated sheets.

**Commit**: `test(export): cascade integration + phase C exclusion`

### T10 — Verification gate + merge + Mode B
**Steps**:
1. `npm test 2>&1 | tail -20`
2. `npm run build 2>&1 | tail -15`
3. `npm run typecheck 2>&1 | tail -5`
4. `npm run lint 2>&1 | tail -10`
5. `npm run audit:i18n`
6. `npm run verify:phase-c`
7. All green → merge to main, push, curl `/akses`
8. Invoke `/update-kka-penilaian-saham` Mode B

**Commit**: `docs: session 031 wrap-up — core builders + N lessons`

## Verification Gates (per T10)
```
Tests:     >= 970 passing (953 existing + builders + cascade)
Build:     ✅ 34 static pages
Typecheck: ✅ clean
Lint:      ✅ clean
Audit:     ✅ zero i18n violations
Phase C:   ✅ passes with STATE_DRIVEN_SHEETS exclusion
Live:      /akses HTTP 200 post-merge
```

## Budget (Opus 1M)
Estimated ~75-95 tool calls. Feasible single session. If >70% at T9,
partial-commit checkpoint per LESSON-085.

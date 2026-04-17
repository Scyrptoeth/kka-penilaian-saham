# Session 035 Design — T8-T10: Legacy Cleanup + Phase C State-Parity Rewrite

**Date**: 2026-04-17
**Branch**: `feat/session-035-legacy-cleanup-v2-promotion`

## Problem Statement

Sessions 030-034 migrated **29 of 29** WEBSITE_NAV_SHEETS into the
state-driven `SHEET_BUILDERS` registry. The migration left three
closure items:

1. **T8 — Legacy cleanup**. `exportToXlsx` still contains the full V1
   pipeline (clear + inject scalars/grids/arrays/dynamic-rows + per-type
   DLOM/DLOC/AAM/extended injectors) guarded by
   `if (!MIGRATED_SHEET_NAMES.has(...))`. Because the registry owns all
   29 nav sheets and `MIGRATED_SHEET_NAMES` is a `Proxy` that reflects
   that coverage live, every guard currently evaluates *false* and every
   V1 step is a no-op. The code is dead weight violating LESSON-069
   ("DELETE superseded code, no for-compat dead branches").

2. **T9 — Phase C depth mismatch**. Current Phase C validates the
   template → sanitize → strip → round-trip pipeline with a *minimal
   null state*, asserting formula preservation only. It does not
   exercise `runSheetBuilders` because the minimal state makes every
   builder either clear-to-blank or early-return. The registry's
   correctness under real user state is not gated by an end-to-end test.

3. **T10 — V2 entry-point promotion**. The plan called for introducing
   `exportToXlsxV2` as the registry-only entry-point. User feedback (via
   clarification Q1) chose the cleaner path: *in-place rewrite of
   `exportToXlsx`* with one symbol, one function body. No V2 alias.

## Investigation Findings

### V1 pipeline status (already inert for nav sheets)

Read of `export-xlsx.ts:78-167`: the orchestration body calls
`clearAllInputCells`, `injectScalarCells`, `injectGridCells`,
`injectArrayCells`, `injectDynamicRows` — each of which iterates their
mapping registry and early-continues when `skipSheets.has(sheet)`. With
`MIGRATED_SHEET_NAMES` Proxy-reflected to the full 29 registry, every
iteration is a skipped pass. Per-type injectors (`injectDlomAnswers`,
`injectDlocAnswers`, `injectDlomJenisPerusahaan`, `injectAamAdjustments`)
are wrapped in explicit `if (!MIGRATED_SHEET_NAMES.has(...))` blocks —
same all-false result. Extended-catalog injectors (BS/IS/FA) likewise
guarded.

**Implication**: user-facing export behavior is already 100% registry-
driven today. Pruning V1 changes zero runtime semantics for the current
population of 29 migrated sheets. The refactor is risk-low.

### No hidden-sheet writes exist

Read of `cell-mapping.ts`: every `ScalarCellMapping`, `GridCellMapping`,
`ArrayCellMapping`, `DynamicRowsMapping` targets one of:
HOME, BALANCE SHEET, INCOME STATEMENT, FIXED ASSET, ACC PAYABLES, KEY
DRIVERS, WACC, DISCOUNT RATE, DLOM, DLOC(PFC), BORROWING CAP, SIMULASI
POTENSI (AAM). All are in `WEBSITE_NAV_SHEETS`. There are **zero**
mappings targeting PROY ACC PAYABLES, ADJUSTMENT TANAH, TL, RESUME,
DIVIDEND DISCOUNT MODEL, PASAR-*, DAFTAR EMITEN, or other hidden
template sheets. Hidden sheets are populated exclusively via template
cross-sheet formulas at Excel evaluation time — no state writes needed.

**Implication**: the clarification Q2 answer "Migrate hidden sheets to
builders too" has a zero-scope fulfillment — the audit shows no hidden
sheet ever received state writes. No new builders to add for hidden
sheets. T8 scope collapses to "prune dead code only".

### STANDALONE_SCALARS already fully covered

`STANDALONE_SCALARS` has exactly two entries:

1. `nilaiPengalihanDilaporkan → SIMULASI POTENSI (AAM)!E11` — covered
   by `SimulasiPotensiBuilder` (Session 031).
2. `wacc.taxRate → INCOME STATEMENT!B33` — covered by `WaccBuilder`
   via `writeScalarsFromSlice('wacc')` (Session 032 regression fix).

LESSON-091 guard check passes by construction: no source-slice write is
orphaned by pruning V1.

### Dead-code boundaries

Five internal functions are called exactly once, from inside the V1
pipeline, and not exported:
- `clearAllInputCells` (export-xlsx.ts:376)
- `injectScalarCells` (export-xlsx.ts:467)
- `injectGridCells` (export-xlsx.ts:646)
- `injectArrayCells` (export-xlsx.ts:679)
- `injectDynamicRows` (export-xlsx.ts:725)

Test file `__tests__/lib/export/export-xlsx.test.ts` reimplements a
local `clearAllInputCells` (line 80), does not import from source — so
deletion is safe for that test.

All exported helpers (`injectAamAdjustments`, `injectDlomAnswers`,
`injectDlomJenisPerusahaan`, `injectDlocAnswers`, `injectBsCrossRefValues`,
`injectExtendedBsAccounts`, `extendBsSectionSubtotals`,
`injectExtendedIsAccounts`, `replaceIsSectionSentinels`,
`injectExtendedFaAccounts`, `extendFaSectionSubtotals`,
`applySheetVisibility`, `sanitizeDanglingFormulas`, `stripDecorativeTables`,
`writeScalarsForSheet`, `writeScalarsFromSlice`, `writeArraysForSheet`,
`writeDynamicRowsForSheet`, `writeGridForSheet`) are consumed by one or
more sheet-builder modules or by Phase C itself — **all preserved**.

Three internal helpers (`writeScalarMapping`, `writeArrayMapping`,
`writeDynamicRowsMapping`, `resolveSlice`, `getNestedValue`,
`BALANCE_SHEET_GRID_COLUMNS`) are called by the builder-facing exported
helpers — **preserved**.

## Chosen Approach

### T8 Approach — In-place prune with explicit kept-set

Replace `exportToXlsx` body with the minimal pipeline:

```ts
export async function exportToXlsx(state: ExportableState): Promise<Blob> {
  const response = await fetch('/templates/kka-template.xlsx')
  if (!response.ok) throw new Error(`Failed to load template: ${response.status}`)
  const buffer = await response.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  // State-driven: 29 registered SheetBuilders own all nav-visible sheets.
  // Each builder either populates from state or clears to a blank shell
  // based on isPopulated(upstream). Non-registered sheets stay template.
  runSheetBuilders(workbook, state)

  // Partial-data guard: builders that clear their sheet to blank leave
  // cross-sheet refs in OTHER populated sheets dangling. Resolve them
  // to cached values (pattern mirrors sanitizeDanglingFormulas).
  stripCrossSheetRefsToBlankSheets(workbook)

  // Template hygiene (unchanged from V1 tail)
  applySheetVisibility(workbook)
  sanitizeDanglingFormulas(workbook)
  stripDecorativeTables(workbook)

  const outBuffer = await workbook.xlsx.writeBuffer()
  return new Blob([outBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.xlsx',
  })
}
```

Then delete the 5 internal functions and their call-sites.

### `stripCrossSheetRefsToBlankSheets` semantics

New exported helper. Parameters: `workbook`. Behavior:

1. Build `blankSheets: Set<string>` — names of worksheets where
   `clearSheetCompletely` has been run (inferred by: sheet is in
   `getMigratedSheetNames()` AND every cell in snapshot is empty/null).
   *Or* simpler: snapshot all sheets before `runSheetBuilders`, compare
   after, any sheet that lost all cells is "blanked". *Or* simplest:
   ask the registry directly — each builder returns a `wasCleared`
   flag after `runSheetBuilders`.
2. For every cell in *other* worksheets:
   - If cell has a formula (ExcelJS `{formula}` or `{sharedFormula}`)
   - AND the formula string contains a cross-sheet reference
     `'<blankSheetName>'!...` or `<blankSheetName>!...`
   - THEN replace the formula with its cached `result` value (same
     pattern as `sanitizeDanglingFormulas` lines 304-313).
3. No-op for formulas referencing non-blank sheets.

**Chosen implementation strategy**: augment `runSheetBuilders` to
return `{ clearedSheets: readonly string[] }`. The orchestrator already
decides clear vs build, so it's the authoritative source of truth.
`stripCrossSheetRefsToBlankSheets(workbook, clearedSheets)` then acts
on that set. Clean separation of concerns.

### T9 Approach — Phase C state-parity rewrite

**Core insight**: the PT Raja Voltama Elektrik template is both the
source-of-truth for fixture extraction (Sessions 001-003) AND the
template shipped to the browser. Therefore, feeding a
`ExportableState` *reconstructed from PT Raja Voltama fixtures* through
the complete export pipeline must yield a workbook cell-by-cell
equivalent to the template, modulo known-diverge transformations
(sanitizer, extended-catalog append, sentinel-replacement,
visibility-flip, table-strip).

The PT Raja Voltama data has zero extended accounts (all excelRow <
100), zero AAM adjustments, and standard values for all scalars —
known from fixture inspection. So:

- `injectExtendedBsAccounts` / `injectExtendedIsAccounts` /
  `injectExtendedFaAccounts` are no-ops → no BS/IS/FA cell divergence
  from extended-row writes
- `replaceIsSectionSentinels` / `extendBsSectionSubtotals` /
  `extendFaSectionSubtotals` are no-ops → no formula-replacement
  divergence
- `aamAdjustments` = `{}` → no AAM D-column writes
- **The only diverges expected are**:
  - Sanitizer touches (known list: formulas with `[N]` externals,
    `#REF!`). Enumerate and whitelist.
  - Visibility flips non-nav sheets to `hidden` (affects metadata,
    not cell values).
  - `stripDecorativeTables` removes FINANCIAL RATIO table wrappers
    (affects metadata, not cell values).
  - **Builders that use `clearSheetCompletely` for unpopulated
    state**: not applicable here because PT Raja Voltama state fills
    every slice.

**Assertion model**:

```ts
for (const sheet in WEBSITE_NAV_SHEETS) {
  const templateCells = snapshotSheet(template, sheet)
  const exportedCells = snapshotSheet(exported, sheet)
  for (const [addr, tCell] of templateCells) {
    if (SANITIZER_WHITELIST.has(`${sheet}!${addr}`)) continue
    const eCell = exportedCells.get(addr)
    assert(eCell !== undefined, `cell missing: ${sheet}!${addr}`)
    if (tCell.hasFormula) {
      assert(eCell.hasFormula, `formula stripped: ${sheet}!${addr}`)
      assert(
        normalizeFormula(tCell.formula) === normalizeFormula(eCell.formula),
        `formula string diverged: ${sheet}!${addr}`,
      )
    } else {
      assertNumericallyEqual(tCell.value, eCell.value, 1e-6)
    }
  }
}
```

**Fixture-to-state adapter**: new `__tests__/helpers/pt-raja-voltama-state.ts`:

```ts
export function loadPtRajaVoltamaState(): ExportableState
```

Reads fixtures from `__tests__/fixtures/`, reconstructs `ExportableState`
shape. Per slice:
- `home`: hardcoded from HOME fixture (6 scalars)
- `balanceSheet`: derived from balance-sheet.json cells → rows grid +
  accounts array (with catalog matching)
- `incomeStatement`: derived from income-statement.json similarly
- `fixedAsset`: derived from fixed-asset.json with band offsets
- `accPayables`: from acc-payables.json leafRows
- `wacc`: from wacc.json (scalars + comparable companies array +
  bank rates array)
- `discountRate`: from discount-rate.json
- `keyDrivers`: from key-drivers.json
- `dlom`, `dloc`: from dlom.json and dloc-pfc.json answers
- `borrowingCapInput`: from borrowing-cap.json
- `aamAdjustments`: `{}`
- `nilaiPengalihanDilaporkan`: from simulasi-potensi-aam.json E11

The helper is ~150-200 LOC + covered by ~5 sanity tests (shape +
spot-check key values against fixtures).

### T10 Approach — In-place, no V2 symbol

Per clarification Q1, the T10 "V2 promotion" is realized as:
- `exportToXlsx` function body is rewritten (Phase 3 T4)
- No new `exportToXlsxV2` export is added
- No deprecation shim
- `ExportButton.tsx` caller unchanged (still imports `exportToXlsx` from
  `@/lib/export` barrel)
- Single function identity preserved across the refactor for git-blame
  coherence

## Architectural Decisions

1. **In-place V1 body rewrite** (clarification Q1): single symbol,
   LESSON-069 compliant, no migration shim. User-selected.
2. **No hidden-sheet builders added**: investigation shows no hidden
   sheet ever received writes. "Migrate all hidden sheets" from Q2
   has zero scope.
3. **Strict cell-parity Phase C**: PT Raja Voltama is the template
   origin → full fixture-driven state → cell-by-cell equality modulo
   sanitizer whitelist.
4. **`stripCrossSheetRefsToBlankSheets` as new helper in
   `export-xlsx.ts`**: colocated with `sanitizeDanglingFormulas` to
   share the formula-replacement pattern. Exported for Phase C
   visibility.
5. **`runSheetBuilders` signature extended** to return
   `{ clearedSheets: readonly string[] }`: authoritative source of
   blanked-sheet names eliminates snapshot-diff detection logic.
6. **Deletion of 5 internal functions** (`clearAllInputCells`,
   `injectScalarCells`, `injectGridCells`, `injectArrayCells`,
   `injectDynamicRows`): safe per grep audit (single call-site inside
   V1 body).

## Out of Scope

- Creating `exportToXlsxV2` alias — user chose in-place rewrite
- Dead code around RINCIAN NERACA (already deleted Session 025)
- AAM/AccPayables extended-catalog native injection (deferred to
  Sessions 036+)
- Upload parser (reverse of export — deferred)
- Moving extended-catalog injectors (BS/IS/FA) into builder files
  themselves — current "builder imports helper from export-xlsx.ts"
  pattern is intentional for the circular-import fix (LESSON-088)
- Changing builder signatures or `SheetBuilder` interface
- Any UI, i18n, store-version, or calc-engine changes

## Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Pruning V1 breaks an export path not covered by registry | High | Investigation proved all nav sheets registered + STANDALONE_SCALARS both covered. Phase C state-parity test is the safety net — written BEFORE prune. |
| Phase C fixture-to-state adapter has bugs → false positives | Medium | Adapter gets its own test suite (spot-check 5-8 key values per slice). Adapter is pure function, trivially debuggable. |
| `stripCrossSheetRefsToBlankSheets` over-strips formulas still in populated sheets | Medium | Narrow regex match on exact blankSheet names. Dedicated test (TDD) covers: (a) populated sheet's formula pointing to cleared sheet → stripped; (b) populated sheet's formula pointing to populated sheet → untouched; (c) no clearedSheets → identity. |
| Sanitizer whitelist incomplete → Phase C flaky | Medium | Enumerate whitelist by running sanitizer once on template + diffing snapshot. Whitelist seeded from actual divergences, not guessed. |
| Deletion of internal functions breaks `export-xlsx.test.ts` | Low | Grep confirmed test file re-implements `clearAllInputCells` locally, not imported. Other deleted internals never imported anywhere. |

## Success Criteria

- `exportToXlsx` body ≤ ~20 LOC
- 5 dead internal functions deleted (zero references remaining)
- New `stripCrossSheetRefsToBlankSheets` exported + tested
- `runSheetBuilders` returns `{ clearedSheets: readonly string[] }`
- New Phase C test uses real PT Raja Voltama state + strict cell parity
- Old Phase C test file replaced in-place (same path, new semantics)
- All gates green: build, tests (≥ 1183 → likely ~1200+), typecheck,
  lint, audit:i18n, verify:phase-c, cascade integration test
- Live deploy HTTP 200 via merge + push
- Session 035 history file committed + lessons extracted

## Session 036+ Follow-ups

- AAM extended-catalog native injection
- AccPayables extended-catalog
- Upload parser (Excel → store)
- RESUME page
- Dashboard polish (projected FCF chart)
- Multi-case management

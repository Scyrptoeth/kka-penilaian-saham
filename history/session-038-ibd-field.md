# Session 038 — Interest Bearing Debt Dedicated Page + Required Gating

**Date**: 2026-04-18
**Scope**: Extract Interest Bearing Debt (IBD) into a dedicated required
valuation input page with always-visible bilingual trivia. Remove
classifier-based auto-aggregation from AAM/DCF/EEM pipeline — all three
now read a single source of truth from the store. Add cross-reference
note with inline hyperlink below AAM's TOTAL LIABILITIES & EQUITY row.
**Branch**: `feat/session-038-ibd-field` → fast-forward into `main`
(1e9c800). Branch deleted locally post-merge.

## Goals (all 11 tasks T0–T10 completed)
- [x] T0 — Feature branch
- [x] T1 — Store migration v16→v17 (`interestBearingDebt: number | null`)
  + 2 TDD cases
- [x] T2 — i18n: ~30 new keys (nav + page + trivia + AAM note, bilingual)
- [x] T3 — New page `/valuation/interest-bearing-debt` with single
  numeric input + always-visible trivia
- [x] T4 — Sidebar nav entry between Borrowing Cap and DCF
- [x] T5 — Refactor `buildAamInput`: IBD via explicit param (drop
  classifier auto-aggregation of `interestBearingDebtHistorical`)
- [x] T6 — Refactor `buildDcfInput` + `buildEemInput`: IBD via explicit
  param (drop `(allBs[31]+allBs[38])*-1` shortcut, negate internally)
- [x] T7 — AAM page: PageEmptyState gate on IBD null + bilingual note
  with inline `<Link>` below TOTAL LIABILITIES & EQUITY
- [x] T8 — DCF + EEM + CFI + Simulasi + Dashboard: PageEmptyState
  gates on IBD null; all consumer `build*Input` calls pass IBD from store
- [x] T9 — Full gate verification (tests + build + typecheck + lint +
  audit + phase-c + cascade)
- [x] T10 — Merge + push + live verify

## Delivered

### Store + Migration
- `KkaState.interestBearingDebt: number | null` root-level slice; setter
  `setInterestBearingDebt(v: number | null)`.
- `STORE_VERSION: 16 → 17` + migration chain entry (idempotent:
  preserves existing values on re-migrate).
- `partialize` and `resetAll` updated.
- 2 new TDD cases: v16→v17 adds null default; idempotency test.

### New Page `/valuation/interest-bearing-debt`
- `InterestBearingDebtEditor`: numeric input with Rp formatting, local
  draft state (LESSON-034 hydration-gate child pattern), explicit Clear
  button when filled, status indicator (`accent` when filled, `negative`
  when null), helper text clarifying 0 vs empty distinction.
- `TriviaSection` always-visible (per user's Q2 — the information is too
  important to hide): 2 intro paragraphs + "What Counts as IBD?" (6
  components: Bank Loans, Bonds Payable, Notes Payable, Mortgage
  Payable, Finance/Capital Lease Liabilities, Commercial Paper) +
  "As Comparison: Non-IBD" (4 components: Accounts Payable, Accrued
  Expenses, Unearned Revenue, Taxes Payable).
- Bilingual via `useT()` + ~26 trivia i18n keys with hierarchical naming
  (`ibd.trivia.include.bankLoans.term` etc.).
- Light + dark mode auto-adapt via existing CSS vars
  (`bg-canvas-raised`, `text-ink-soft`, `border-grid`).

### Navigation
- `NAV_TREE` VALUATION group: new entry between Borrowing Cap and DCF.
- i18n key `nav.item.interestBearingDebt` (EN "Interest Bearing Debt" /
  ID "Utang Berbunga").

### Calc Pipeline Refactor
- `buildAamInput` takes `interestBearingDebt: number` param (POSITIVE);
  field `interestBearingDebtHistorical` in `AamInput` now sources from
  this param, not from the classifier. `isIbdAccount()` classifier
  retained **only** for display-level CL/NCL split (nonIbdCL vs ibdCL
  subtotals in the AAM table).
- `buildDcfInput` + `buildEemInput` take the same param; negate
  internally to match `DcfInput.interestBearingDebt` /
  `EemInput.interestBearingDebt` pre-signed convention
  (`(BS!F31+F38)*-1`). `allBs` param retained for API stability but
  marked as unused by IBD computation.

### Consumer Page Gating (6 pages)
- `/valuation/aam`, `/valuation/dcf`, `/valuation/eem`,
  `/valuation/cfi`, `/valuation/simulasi-potensi`, `/dashboard`:
  subscribe to `interestBearingDebt`; when `null`, show PageEmptyState
  with IBD listed as a required input linking to
  `/valuation/interest-bearing-debt`.

### AAM Cross-Reference Note
- Bilingual `<aside role="note">` below TOTAL LIABILITIES & EQUITY:
  explains the workflow (apply negative adjustments via column D to
  IBD liability accounts) and includes an inline `<Link>` ("click
  here" / "klik di sini") to the IBD page.
- Uses `border-l-2 border-accent` + subtle background per design
  tokens; readable in both light and dark mode.

### Export Pipeline
- `ExportableState` extended with `interestBearingDebt: number | null`.
- `UpstreamSlice` union adds `'interestBearingDebt'`.
- `isPopulated` special-cases this key (non-null check).
- `DcfBuilder`, `EemBuilder`, `CfiBuilder` upstream arrays include
  `'interestBearingDebt'`; each gates `build()` on non-null.
- `ExportButton.tsx` passes `state.interestBearingDebt` to the pipeline.

## Verification

```
Tests:     1215 / 1216 passing + 1 skipped  (was 1213; +2 migration TDD)
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings
Build:     ✅ 40 static pages (new: /valuation/interest-bearing-debt)
Audit:     ✅ zero i18n violations
Phase C:   ✅ 5/5 gates green
Cascade:   ✅ 3/3 green (29/29 MIGRATED_SHEETS)
Live:      https://penilaian-bisnis.vercel.app — HTTP 200 via /akses
Store:     v17 (migration added: interestBearingDebt: null default)
```

## Stats
- Commits: 1 (1e9c800 — squashed feature commit; test-fixture mass
  update inlined)
- Files changed: 51 (20 source + 29 test fixtures + 2 existing tests)
- Lines: +560 / −72
- Store migration: v16 → v17
- New TDD cases: 2 (migration) + fixture updates for 29 builder tests
- i18n keys added: ~30
- Zero regressions

## Deviations from Plan

- **Q3 redirect** during BRAINSTORM: user originally asked for an
  inline-editable cell on the AAM VALUATION table (prompt #1). After
  seeing Q3 ("put trivia in a dedicated IBD field page?"), user chose
  the cleaner separate-page architecture. Final design removes the
  inline-edit path entirely — AAM shows IBD read-only from the store +
  note with hyperlink. This was the right call: trivia was too long
  for inline display, and DCF/EEM also needed the same input.
- **All 6 consumer pages gated** (AAM/DCF/EEM/CFI/Simulasi/Dashboard)
  rather than just AAM as originally considered. Consistent with user
  intent "pendekatan apapun yang memang memerlukan isian IBD" and
  prevents silent 0-fallback in downstream views.

## Deferred

- None. Scope fully delivered.
- **Note**: `isIbdAccount()` classifier is still used for AAM CL/NCL
  display split. Could be removed if we also redesign the AAM table's
  subtotal display — out of scope for this session.

## Lessons Extracted

- [LESSON-106](../lessons-learned.md#lesson-106-auto-classifier-aggregation--per-row-adjustments--double-count-trap):
  Auto-classifier aggregation + per-row adjustments = double-count
  trap (promoted).
- [LESSON-107](../lessons-learned.md#lesson-107-extract-cross-cutting-required-valuation-inputs-into-dedicated-page--required-gate):
  Extract cross-cutting required valuation inputs into dedicated page
  + required-gate (promoted).

## Files & Components Added/Modified

```
src/app/valuation/interest-bearing-debt/page.tsx              [NEW]
src/app/valuation/aam/page.tsx                                [MODIFIED + note]
src/app/valuation/dcf/page.tsx                                [MODIFIED]
src/app/valuation/eem/page.tsx                                [MODIFIED]
src/app/valuation/cfi/page.tsx                                [MODIFIED]
src/app/valuation/simulasi-potensi/page.tsx                   [MODIFIED]
src/app/dashboard/page.tsx                                    [MODIFIED]
src/components/layout/ExportButton.tsx                        [MODIFIED]
src/components/layout/nav-tree.ts                             [+1 nav entry]
src/data/catalogs/balance-sheet-catalog.ts                    [unchanged]
src/lib/calculations/aam-valuation.ts                         [unchanged — field semantics doc update only]
src/lib/calculations/upstream-helpers.ts                      [MODIFIED, +43]
src/lib/export/export-xlsx.ts                                 [+2 ExportableState field]
src/lib/export/sheet-builders/types.ts                        [+1 UpstreamSlice entry]
src/lib/export/sheet-builders/populated.ts                    [+3 isPopulated branch]
src/lib/export/sheet-builders/dcf.ts                          [MODIFIED]
src/lib/export/sheet-builders/eem.ts                          [MODIFIED]
src/lib/export/sheet-builders/cfi.ts                          [MODIFIED]
src/lib/i18n/translations.ts                                  [+115 (~30 keys)]
src/lib/store/useKkaStore.ts                                  [+26 migration + slice + setter]
__tests__/lib/store/store-migration.test.ts                   [+2 cases + v17 future test]
__tests__/lib/export/sheet-builders/*.test.ts (29 files)      [fixture: interestBearingDebt: 0]
__tests__/lib/export/export-xlsx.test.ts                      [fixture update]
__tests__/lib/export/registry.test.ts                         [fixture update]
__tests__/integration/export-cascade.test.ts                  [fixture update]
__tests__/helpers/pt-raja-voltama-state.ts                    [fixture update]
```

## Next Session Recommendation

1. **Proy BS + Proy FA extended account injection** (deferred since
   Session 036) — still top priority. Mirror Session 025 BS native-row
   pattern + Session 028 FA 7-band slot pattern for PROY sheets so
   extended (≥100) and custom (≥1000) accounts land in exported
   workbook.
2. **KEY DRIVERS dynamic `additionalCapexByAccount` injection** —
   build dedicated injector in KeyDriversBuilder.
3. **Sign convention reconciliation** — 21 whitelisted KD
   cogsRatio/sellingExpenseRatio/gaExpenseRatio cells (deferred from
   Session 035).
4. **Optional cleanup**: consider removing `isIbdAccount` classifier
   from AAM display split as well — the user now manually controls IBD
   via adjustments + dedicated field. Requires AAM table UI redesign
   for CL/NCL subtotal rendering.
5. **RESUME page** — final summary comparing AAM/DCF/EEM per share
   side by side.

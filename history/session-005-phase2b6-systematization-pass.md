# Session 005 — Phase 2B.6: Systematization Pass

**Date**: 2026-04-11
**Scope**: Refactor-only pass to eliminate 4 patch-mode items identified by post-Session-004 architecture audit. Normalize every rendering pattern before scaling to 4 more pages in 2B.5.
**Branch**: `refactor/phase2b6-systematization` → merged to `main` (merge commit `862b3c5`)

## Goals (from audit)
- [x] Patch 1: `anchorRow` in manifest (eliminate hardcoded `REVENUE_ROW = 6`)
- [x] Patch 2: `derive` callback in manifest (auto-invoked by builder)
- [x] Patch 3: Seed-mode convention documented on FR + FCF
- [x] Patch 4: `<SheetPage>` helper + shrink all pages to ~11 lines
- [x] Verify + ship to main + Vercel deploy verification

## Motivation

Architecture audit after Session 004 identified 4 patch-mode items that would multiply if Session 2B.5 added 4 pages built on the same pattern:

1. `REVENUE_ROW = 6` hardcoded in IS page file
2. Every page had to manually import + call sheet-specific derive functions
3. FR + FCF silently bypassed the hardened pipeline (not documented)
4. Every page duplicated the same `loadCells + buildRowsFromManifest + FinancialTable` boilerplate

Fix now (refactor-only, output bit-identical) so Session 2B.5 can add pages via manifest-authoring alone.

## Delivered — 4 patches + 1 chore

**Patch 1 — `anchorRow` in manifest** (`2f11766`)
- `SheetManifest.anchorRow?: number` field added
- `INCOME_STATEMENT_MANIFEST.anchorRow = 6`
- `deriveIncomeStatementColumns(cells, manifest)` reads `manifest.anchorRow` internally instead of taking a parameter
- Hardcoded `REVENUE_ROW` constant removed from page file

**Bonus chore** — `.gitignore /.claude/` (`2fbdcf0`)
- Prevents Claude Code scratch state (scheduled_tasks.lock) from being accidentally committed

**Patch 2 — `derive` callback auto-invoked by builder** (`7c977cd`)
- `SheetManifest.derive?: ManifestDeriveFn` callback field
- `buildRowsFromManifest` auto-invokes `manifest.derive?.(cells, manifest)` if no explicit override passed
- BS + IS manifests assign their derive functions directly
- Pages drop the manual derive call — pattern becomes `loadCells` + `buildRowsFromManifest` only
- `ManifestDerivedColumnMap` added to types.ts (inline shape to avoid circular import with build.ts)

**Patch 3 — Seed-mode docs on FR + FCF** (`626db58`)
- JSDoc blocks added to `FINANCIAL_RATIO_MANIFEST` and `FCF_MANIFEST`
- Explicitly flag: seed-mode renders pre-computed fixture values intentionally
- Phase 3+ migration path spelled out: `toFcfInput` / future `toRatiosInput` adapter + `validated*` through calc engine
- Ensures future session author doesn't silently miss the hardened pipeline

**Patch 4 — `<SheetPage>` helper + page files shrink** (`8e7f9be`)
- New `src/components/financial/SheetPage.tsx` Server Component
- Encapsulates `loadCells` + `buildRowsFromManifest` + `<FinancialTable>` + column-group auto-inference
- Column visibility heuristic: show commonSize if `manifest.commonSizeColumns` declared OR `derive` produced commonSize data; same for growth
- All 4 P1 pages shrunk to **11 lines each** (from ~15-22 lines)
- Adding a new sheet becomes manifest-authoring + 11-line page file template

## Verification
```
Tests:     107 / 107 passing (unchanged — refactor preserves contracts)
Build:     ✅ 9 routes, 4 P1 pages still prerendered static
Lint:      ✅ zero warnings
Typecheck: ✅ tsc --noEmit clean
Smoke:     ✅ all 4 live pages HTTP 200 post-deploy, BS still renders 14.216.370.131 + 29,9%
```

## Stats
- Commits: 5 (4 patches + 1 gitignore)
- New files: 1 (`src/components/financial/SheetPage.tsx`)
- Files modified: 12
- Net delta: +74 lines (mostly JSDoc + SheetPage helper)
- Visual output: **bit-identical** pre vs post refactor

## Deviations from Plan
- None. Each patch shipped as planned, 1 atomic commit each.

## Deferred
- `historical-derive.ts` still contains `deriveBalanceSheetColumns` + `deriveIncomeStatementColumns` as callback targets — identified as next gap, resolved in Session 006 (Phase 2B.6.1).
- DataSource abstraction, FR/FCF calc-engine rewiring, input forms — all still deferred to Session 3+.

## Lessons Extracted
- [LESSON-019](../lessons-learned.md#lesson-019): Declarative data in manifest > callback functions — eliminates per-sheet code paths
- [LESSON-020](../lessons-learned.md#lesson-020): Patch-audit before scaling — identify repeat-risk patterns before duplicating them 4x

## Files & Components Added/Modified
```
.gitignore                                          [MODIFIED — +/.claude/]
src/components/financial/SheetPage.tsx              [NEW]
src/data/manifests/types.ts                         [MODIFIED — anchorRow, derive, ManifestDeriveFn]
src/data/manifests/build.ts                         [MODIFIED — auto-invoke manifest.derive]
src/data/manifests/balance-sheet.ts                 [MODIFIED — derive assignment]
src/data/manifests/income-statement.ts              [MODIFIED — anchorRow + derive assignment]
src/data/manifests/financial-ratio.ts               [MODIFIED — seed-mode JSDoc]
src/data/manifests/fcf.ts                           [MODIFIED — seed-mode JSDoc]
src/data/manifests/historical-derive.ts             [MODIFIED — IS signature (param removed)]
src/app/historical/balance-sheet/page.tsx           [MODIFIED — simplified]
src/app/historical/income-statement/page.tsx        [MODIFIED — simplified]
src/app/analysis/financial-ratio/page.tsx           [MODIFIED — simplified]
src/app/analysis/fcf/page.tsx                       [MODIFIED — simplified]
```

## Architecture After Session 005
```ts
// Page files — always 11 lines, no sheet-specific logic
import type { Metadata } from 'next'
import { SheetPage } from '@/components/financial/SheetPage'
import { X_MANIFEST } from '@/data/manifests/x'

export const metadata: Metadata = { title: '...' }
export default function XPage() {
  return <SheetPage manifest={X_MANIFEST} />
}
```

No hardcoded row numbers. No derive function imports. No boilerplate. Only outstanding gap: `derive` field still takes a callback function, which means Session 2B.5 sheets needing derivation would still write sheet-specific functions. Fixed in Session 006.

## Next Session Recommendation
Follow-up audit revealed derive callbacks themselves were still patch-like. Next session should eliminate `historical-derive.ts` entirely by replacing the callback form with a declarative `DerivationSpec[]` array — shipped as Session 006 (Phase 2B.6.1).

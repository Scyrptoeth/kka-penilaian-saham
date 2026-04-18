# Plan — Session 049 Proy. P&L OpEx Merge + Common-Size Drivers

**Branch**: `feat/session-049-proy-lr-opex-common-size`
**Scope**: Full refactor Proy. P&L compute + display + export per user's 4-point spec (Skenario A, confirmed).

## Tasks (max 10)

### Task 1 — Feature branch (2 min)
```
git checkout -b feat/session-049-proy-lr-opex-common-size
```
Verification: `git branch --show-current` shows new branch.

### Task 2 — Refactor `compute-proy-lr-live.ts` (10 min)
File: `src/data/live/compute-proy-lr-live.ts`

Changes:
- New `ProyLrInput` interface (remove `interestIncomeGrowth`, `interestExpenseGrowth`, `nonOpIncomeGrowth`; add `commonSize: { cogs, totalOpEx, interestIncome, interestExpense, nonOpIncome }`; replace `isLastYear.sellingOpex + gaOpex` with `isLastYear.totalOpEx`).
- Delete `roundUp3` helper (no longer used).
- Projection: COGS/II/IE/NOI/TotalOpEx all = `revenue × commonSize.<key>`.
- Historical column: row 17 = `isLastYear.totalOpEx`; rows 15/16 dropped (no `set(15,...)` / `set(16,...)`).
- Margin computations unchanged.

Verification: file typechecks via `npm run typecheck 2>&1 | tail -5`.

### Task 3 — Rewrite `compute-proy-lr-live.test.ts` (TDD RED→GREEN, 12 min)
File: `__tests__/data/live/compute-proy-lr-live.test.ts`

Create fresh fixture with synthetic numbers that EXERCISE each branch:
- Revenue historical series with 2+ years → avgYoY growth computed.
- Common size for each of 5 leaves (cogs, totalOpEx, ii, ie, noi).
- Historical column assertions (row 17 = totalOpEx).
- Projection column assertions for all 8 affected rows (8, 10, 11, 17, 19, 25, 29, 31, 33, 34, 36, 37, 39).
- Explicit assertion that rows 15 + 16 are NOT in output (`expect(result[15]).toBeUndefined()`).
- Sign convention tests (negative COGS produces negative projection).

PRECISION=6 (exact compute now, no ROUNDUP).

Verification: `npm test -- compute-proy-lr-live 2>&1 | tail -20` — all tests pass.

### Task 4 — Update `projection-pipeline.ts` caller (5 min)
File: `src/lib/calculations/projection-pipeline.ts`

- Compute `commonSize` object via `averageSeries(historical common size series, histYears4)` for each of 5 IS rows (7, 15, 26, 27, 30) denominated by IS.6 revenue.
- Remove old `interestIncomeGrowth / interestExpenseGrowth / nonOpIncomeGrowth` fields from input.
- Change `isLastYear.sellingOpex + gaOpex` → `isLastYear.totalOpEx = isVal(15)`.

Use a local helper (`avgCommonSizeFor(row)`) to avoid 5× duplicated loops.

Verification: typecheck clean + integration tests unchanged (they use pipeline output, not input shape).

### Task 5 — Update `projection/income-statement/page.tsx` (15 min)
File: `src/app/projection/income-statement/page.tsx`

Two-part change:
- **A (compute)**: mirror Task 4 inline — compute commonSize averages, build new ProyLrInput, pass to `computeProyLrLive`.
- **B (display)**: rewrite ROW_DEFS to new structure:
  - Discriminated union `RowDef = { kind: 'data', row, ... } | { kind: 'subRow', id, labelKey, driver: 'revenueGrowth' | keyof CommonSize }`.
  - Drop row 15, 16 entries.
  - Insert 1 sub-row below row 8 (revenue-growth), row 10 (cogs-cs), row 17 (totalopex-cs), row 29 (ii-cs), row 31 (ie-cs), row 34 (noi-cs).
- TableBody render: switch on `def.kind`. Data rows use `rows[def.row]?.[y]`. SubRows read `subRowValue(def.driver)` which returns:
  - For 'revenueGrowth': `revenueGrowth` at projection years, undefined/'—' at historical.
  - For common-size keys: `commonSize[key]` at projection years, '—' at historical.
- Style sub-rows identical to Margin rows (`indent italic text-ink-muted`, `border-b border-grid`).

Verification: dev server renders Proy. P&L without errors (manual check); `npm run typecheck` clean.

### Task 6 — Update `projection/noplat/page.tsx` caller (3 min)
File: `src/app/projection/noplat/page.tsx`

Same compute pattern as Task 4: build `commonSize` + change `isLastYear.totalOpEx` instead of sellingOpex/gaOpex. Page only consumes proyLrRows output — no display impact.

Verification: typecheck + `npm test -- proy-noplat 2>&1 | tail -10` still passes.

### Task 7 — Update export `ProyLrBuilder` (5 min)
File: `src/lib/export/sheet-builders/proy-lr.ts`

- `managedRows` → `[8, 9, 10, 11, 12, 17, 19, 20, 22, 25, 26, 29, 31, 33, 34, 36, 37, 39, 40]` (drop 15 + 16).
- Before writing managed rows, clear cells at rows 15 + 16 across all 4 columns (C/D/E/F): `ws.getCell(`${col}15`).value = 0; ws.getCell(`${col}16`).value = 0`.

Verification: `npm test -- proy-lr 2>&1 | tail -10` passes (existing builder tests).

### Task 8 — Add 6 i18n keys + ROW_DEFS labelKeys (3 min)
File: `src/lib/i18n/translations.ts`

Add entries:
- `proy.revenueGrowth` EN/ID
- `proy.cogsCommonSize` EN/ID
- `proy.totalOpExCommonSize` EN/ID
- `proy.interestIncomeCommonSize` EN/ID
- `proy.interestExpenseCommonSize` EN/ID
- `proy.nonOpIncomeCommonSize` EN/ID

Verification: `npm run audit:i18n` clean; ESLint `local/no-hardcoded-ui-strings` clean.

### Task 9 — Phase C whitelist + verification (10 min)
- Run `npm run verify:phase-c 2>&1 | tail -40` — expect new divergent cells.
- Inspect `phase-c-verification-report.md`.
- LESSON-112 audit: `grep -rn "'PROY LR'!C10\|'PROY LR'!D10\|..." __tests__/fixtures/` — verify no live cross-sheet formulas reference divergent cells in prototipe XLSX.
- Add to `__tests__/integration/phase-c-verification.test.ts` `KNOWN_DIVERGENT_CELLS` set.

Verification: Phase C 5/5 green.

### Task 10 — Full gate + commit + merge + push + verify live (15 min)
```bash
npm run build 2>&1 | tail -15
npm test 2>&1 | tail -15
npm run typecheck 2>&1 | tail -10
npm run lint 2>&1 | tail -15
npm run audit:i18n 2>&1 | tail -5
npm run verify:phase-c 2>&1 | tail -10
```

Then:
1. `git add <specific files>` + `git commit -m "feat(proy-lr): common-size projection drivers + drop Selling/G&A"`.
2. Checkout main → `git merge feat/session-049-...` → `git push origin main`.
3. Wait for Vercel prod deploy.
4. `curl -s -o /dev/null -w "%{http_code}" https://penilaian-bisnis.vercel.app/` — expect 200/307.
5. Progress marked in `progress.md` at `/update-kka-penilaian-saham` wrap-up time.

## Exit Criteria

All gates green:
- Tests: ≥1328 passing (+ at least +5 new test cases for common-size drivers).
- Build: 42 static pages.
- Typecheck: clean.
- Lint: clean.
- Audit i18n: clean.
- Phase C: 5/5.
- Cascade: 3/3.
- Live: 200/307 HTTP response.

## Deferred

- `/update-kka-penilaian-saham` Mode B wrap-up (history + lessons extract) runs after user QA confirmation.

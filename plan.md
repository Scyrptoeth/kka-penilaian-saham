# Session 033 Plan — T6: 7 Computed Analysis Builders

## Branch
`feat/session-033-computed-builders` (off `main` at commit `19f4032`)

## Scope (from Session 033 design.md)
Migrate 7 computed analysis sheets into state-driven `SHEET_BUILDERS`
registry. Each builder composes existing `computeXxxLiveRows` + manifest
`deriveComputedRows` and writes values via new shared helper
`writeComputedRowsToSheet`. No cross-sheet scalar audit concerns
(verified empty STANDALONE_SCALARS for T6 sheets).

## Tasks (10 total — per Superpowers max)

### T1 — Brainstorm + design.md ✅
- User authorized blanket execution
- Design written (computed sheets, shared helper, null-safe chaining)

### T2 — Shared helper `writeComputedRowsToSheet` + feature branch (TDD)
Files:
- `__tests__/lib/export/sheet-builders/computed-writer.test.ts` (NEW) — RED
- `src/lib/export/sheet-builders/computed-writer.ts` (NEW) — GREEN

Test cases (5):
1. Writes values at `<col><excelRow>` for each manifest row with data
2. Skips rows with `type` in `['header','separator']` (no excelRow)
3. Skips year entries where `allRows[row][year]` is null/undefined
4. Idempotent — repeated calls produce identical output
5. Missing worksheet — no throw (defensive)

Branch: `git checkout -b feat/session-033-computed-builders`

### T3 — NoplatBuilder (TDD)
Files:
- `__tests__/lib/export/sheet-builders/noplat.test.ts` (NEW)
- `src/lib/export/sheet-builders/noplat.ts` (NEW)
- `registry.ts` — add NoplatBuilder AFTER BorrowingCapBuilder, BEFORE AamBuilder

Test cases (6):
1. Metadata: sheetName='NOPLAT', upstream=['incomeStatement']
2. Populated IS + home → writes values at NOPLAT_MANIFEST rows × columns
3. Null IS → orchestrator clears (not tested here — cascade integration covers)
4. Null home → builder returns early (no throw)
5. Missing worksheet → no throw
6. Idempotent

### T4 — CashFlowStatementBuilder (TDD)
Files:
- `__tests__/lib/export/sheet-builders/cash-flow-statement.test.ts` (NEW)
- `src/lib/export/sheet-builders/cash-flow-statement.ts` (NEW)
- `registry.ts` — add

Test cases (7):
1. Metadata: sheetName='CASH FLOW STATEMENT', upstream=['balanceSheet','incomeStatement']
2. Populated BS+IS (no FA, no AP) → CFS values written
3. Populated BS+IS+FA → row 17 (Capex) populated from FA row 23
4. Populated BS+IS+AP → row 23/26 (loan/repayment) populated
5. Null home → no throw
6. Missing worksheet → no throw
7. Idempotent

### T5 — FcfBuilder (TDD)
Files:
- `__tests__/lib/export/sheet-builders/fcf.test.ts` (NEW)
- `src/lib/export/sheet-builders/fcf.ts` (NEW)
- `registry.ts` — add

Test cases (5):
1. Metadata: sheetName='FCF', upstream=['balanceSheet','incomeStatement','fixedAsset']
2. Full chain populated → FCF values written per FCF_MANIFEST
3. Null FA → orchestrator clears (not tested here)
4. Null home → no throw
5. Idempotent

### T6 — RoicBuilder (TDD)
Files:
- `__tests__/lib/export/sheet-builders/roic.test.ts` (NEW)
- `src/lib/export/sheet-builders/roic.ts` (NEW)
- `registry.ts` — add

Test cases (5):
1. Metadata
2. Full chain populated → ROIC values written per ROIC_MANIFEST
3. Null home → no throw
4. Missing worksheet → no throw
5. Idempotent

### T7 — GrowthRevenueBuilder (TDD)
Files:
- `__tests__/lib/export/sheet-builders/growth-revenue.test.ts` (NEW)
- `src/lib/export/sheet-builders/growth-revenue.ts` (NEW)
- `registry.ts` — add

Test cases (4):
1. Metadata: sheetName='GROWTH REVENUE', upstream=['incomeStatement']
2. Populated IS → GrowthRevenue values written
3. Null home → no throw
4. Idempotent

### T8 — GrowthRateBuilder (TDD)
Files:
- `__tests__/lib/export/sheet-builders/growth-rate.test.ts` (NEW)
- `src/lib/export/sheet-builders/growth-rate.ts` (NEW)
- `registry.ts` — add

Test cases (5):
1. Metadata
2. Full chain populated → Growth Rate values written
3. Null home → no throw
4. Missing worksheet → no throw
5. Idempotent

### T9 — FinancialRatioBuilder (TDD)
Files:
- `__tests__/lib/export/sheet-builders/financial-ratio.test.ts` (NEW)
- `src/lib/export/sheet-builders/financial-ratio.ts` (NEW)
- `registry.ts` — add

Test cases (5):
1. Metadata: sheetName='FINANCIAL RATIO', upstream=['balanceSheet','incomeStatement']
2. BS+IS populated → 14/18 ratios written; 4 CF ratios = 0 without CFS
3. BS+IS+FA+AP populated → all 18 ratios live
4. Null home → no throw
5. Idempotent

### T10 — Registry verify + cascade extension + full gate + merge + Mode B
Files:
- `__tests__/integration/export-cascade.test.ts` — extend `MIGRATED_SHEETS` 13 → 20
- `progress.md` — update to Session 033 complete state
- `history/session-033-computed-builders.md` (NEW)
- `lessons-learned.md` — append new lessons (if any)
- `~/.claude/skills/start-kka-penilaian-saham/SKILL.md` — promote lessons (if any)

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
git merge --ff-only feat/session-033-computed-builders
git push origin main
```

Live verify:
```bash
curl -s -o /dev/null -w "%{http_code}" https://penilaian-bisnis.vercel.app/akses
```

Mode B commit:
```
docs: session 033 wrap-up — 7 computed analysis builders + N lessons
```

## Expected outcome

- 20 sheets now in `SHEET_BUILDERS` registry (13 from Sessions 031-032 + 7 new)
- `CASH FLOW STATEMENT`, `FCF`, `NOPLAT`, `FINANCIAL RATIO`, `ROIC`,
  `GROWTH REVENUE`, `GROWTH RATE` no longer leak prototipe when user's
  upstream data doesn't match PT Raja Voltama exactly
- Cascade integration test covers 20 sheets (declarative — add name, coverage grows)
- ~40-45 new tests added (1066 → ~1110)
- 9 remaining builders queued for Session 034 (PROY×5 + DCF + EEM + CFI + Dashboard)

## Risk mitigation

- **Risk**: Compute-live function signatures differ from assumed shape.
  **Mitigation**: read each `compute-Xxx-live.ts` signature at start of
  its own TDD task (T3-T9), before writing builder.
- **Risk**: Manifest `columns` field uses unexpected keys (e.g. number
  vs string). **Mitigation**: `writeComputedRowsToSheet` handles generic
  `Record<number | string, string>` via `Object.entries` + Number().
- **Risk**: FINANCIAL RATIO has non-ratio rows (headers/sections) that
  compute-live doesn't return. **Mitigation**: helper iterates manifest
  rows; missing keys in `allRows` skipped gracefully (case 3 of T2 tests).
- **Risk**: Compute-chain order inside builder wrong (e.g. FCF needs
  NOPLAT before FA). **Mitigation**: mirror existing `computeHistoricalUpstream`
  pattern from `upstream-helpers.ts` which has correct ordering.

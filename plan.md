# Plan — Session 042

**Scope**: 5 Priorities Session 042 (IS Tax Export + AAM Extended + LESSON-108 Audit + AP Dynamic + RESUME Page)
**Branch**: `feat/session-042-tax-export-aam-ext-ap-dynamic-resume`
**Target**: Tests 1261 → ~1320+, all gates green, live deploy

---

## Tasks

### Task 1 — IS Tax Adjustment Export (rows 600/601)
- **Files**: `src/lib/export/export-xlsx.ts` (IS_SECTION_INJECT + injector helper), `__tests__/lib/export/export-xlsx.test.ts`
- **Change**:
  - Add entry `tax_adjustment: { extendedRowStart: 600, extendedRowEnd: 619, sentinelRow: null }` to IS_SECTION_INJECT
  - New helper `injectTaxAdjustmentRows(worksheet, isRows, years)` — row 600: label + static value. Row 601: label + formula `=<col>32+<col>600` + cached result
  - Wire into IncomeStatementBuilder after existing extended injection
- **Verify**: 4 TDD cases — row 600 written, row 601 as formula, label correct, cached value matches

### Task 2a — AAM Template Probe
- **Files**: explore only (no source changes)
- **Change**: Grep AAM template via ExcelJS to identify: (a) current section boundaries + subtotal rows, (b) unused synthetic row ranges for extended injection
- **Verify**: Write findings into design.md D2 update with actual row numbers

### Task 2b — AAM Extended Injection
- **Files**: `src/lib/export/sheet-builders/aam.ts`, new helper `src/lib/export/aam-extended-helpers.ts`, `__tests__/lib/export/sheet-builders/aam.test.ts`
- **Change**:
  - `injectAamExtendedAccounts(worksheet, state)` — per-section synthetic row allocation
  - For each extended BS account: write label (B), BS value (C static), adjustment (D from aamAdjustments), formula `=C{row}+D{row}` (E)
  - Section routing uses Session 041 exclusion sets for CL/NCL split
  - Extend section subtotal cells via `+SUM(<col>{start}:<col>{end})` append pattern (Session 025 BS)
- **Verify**: 8 TDD cases — per-section placement, formula correctness, subtotal append, excluded sets routing, empty accounts no-op

### Task 3 — LESSON-108 Grep Audit
- **Files**: 4 target modules: `src/lib/calculations/noplat-live.ts`, `src/lib/calculations/fcf-live.ts`, `src/lib/calculations/financial-ratios-live.ts`, `src/lib/calculations/roic-live.ts` (or equivalent paths)
- **Change**:
  - Grep each file for `const \w+_ROWS\s*=\s*\[\s*\d+` hardcoded row-array pattern
  - For each hit: refactor to account-driven iteration via `bsAccounts.filter(a => a.section === 'X')` pattern
  - Extract shared helper if 2+ callers share filter semantic
  - If zero hits: record finding, no refactor
- **Verify**: Full test suite green; new TDD cases only if refactor happened

### Task 4a — AP Catalog Foundation
- **Files**: new `src/data/catalogs/acc-payables-catalog.ts`, `src/types/acc-payables.ts`, migration in `src/lib/store/useKkaStore.ts` (v19→v20)
- **Change**:
  - `ApSection = 'st_bank_loans' | 'lt_bank_loans'`
  - `ApSchedule = { id: string, labelEn: string, labelId: string, section: ApSection, slotIndex: number, customLabel?: string }`
  - `AccPayablesInputState = { schedules: ApSchedule[], rows: Record<number, YearKeyedSeries> }`
  - Default catalog seeds 1 ST + 1 LT schedule (labels "Short-Term Bank Loan" / "Long-Term Bank Loan")
  - Store migration v19→v20 transforms old 6-field shape into 1 ST + 1 LT schedule with data preserved
  - Sentinel pre-compute: Ending = Beg + Addition per schedule (at persist time for downstream)
- **Verify**: 6 TDD cases — catalog defaults, migration from v19 shape, sentinel computation, addSchedule/removeSchedule mutations

### Task 4b — DynamicApEditor UI
- **Files**: new `src/components/forms/DynamicApEditor.tsx`, rewrite `src/app/input/acc-payables/page.tsx`, i18n keys
- **Change**:
  - 2 fixed sections (ST + LT) each with +Add button to append new schedule
  - Per schedule: inline rename, remove button, 3-row mini-grid (Beg editable, Addition editable, Ending read-only = formula display)
  - Year columns from home.historicalYearCount
  - Debounced 500ms persist, hydration gate (LESSON-034)
- **Verify**: Page renders, schedules can be added/removed/renamed, sentinel Ending shows correctly; ~5 TDD cases via testing-library

### Task 4c — AP Extended Injection Export
- **Files**: `src/lib/export/sheet-builders/acc-payables.ts` (rewrite from Session 032 baseline), `__tests__/lib/export/sheet-builders/acc-payables.test.ts`
- **Change**:
  - `AP_BAND` 6-entry `{ST_BEG, ST_ADDITION, ST_END, LT_BEG, LT_ADDITION, LT_END}` with synthetic row ranges per D4
  - Slot allocation per schedule index per section
  - Input bands write static values; formula bands (ST_END, LT_END) write `=<col>{beg_row}+<col>{add_row}` per year
  - Label in col B across Beg + Addition + End bands (matches FA pattern)
  - Section subtotals (verify at implementation) extended via `+SUM` append if present
- **Verify**: 10 TDD cases — per-band allocation, formula correctness, section routing, empty-schedules no-op, multi-schedule ordering

### Task 5 — RESUME Page
- **Files**: new `src/app/dashboard/resume/page.tsx`, nav entry in `src/data/nav-tree.ts`, i18n keys (~20 new)
- **Change**:
  - Route `/dashboard/resume` under Ringkasan group
  - PageEmptyState gated on required inputs (home + IBD + WC null-checks)
  - 3-column table (AAM / DCF / EEM) × 3 rows (Equity Value 100%, Equity Value Proporsi Saham, Per-Share Value)
  - Metodologi section: 3 cards, 1 bilingual paragraf per metode (AAM / DCF / EEM)
  - Rekomendasi Nilai: neutral text listing 3 results + PMK-79 professional judgment reminder
  - Pure display — uses buildAamInput/buildDcfInput/buildEemInput + compute* via useMemo
- **Verify**: Page renders, PageEmptyState guards work, values match AAM/DCF/EEM pages individually; ~3 TDD cases

### Task 6 — Final Verification + Documentation Update
- **Files**: all
- **Change**: Run full verification suite. Update progress.md. Ready for commit.
- **Verify**:
  - `npm run build 2>&1 | tail -15` → 41+ static pages (RESUME adds 1 → 42)
  - `npm test 2>&1 | tail -15` → 1261 → ~1320+ passing
  - `npm run typecheck` → clean
  - `npm run lint` → clean
  - `npm run audit:i18n` → 0 violations
  - `npm run verify:phase-c` → 5/5 green
  - Cascade integration → 3/3 green
  - Open exported XLSX → zero repair dialogs

---

## Progress Tracking

- [ ] Task 1: IS Tax Adjustment Export
- [ ] Task 2a: AAM Template Probe
- [ ] Task 2b: AAM Extended Injection
- [ ] Task 3: LESSON-108 Grep Audit
- [ ] Task 4a: AP Catalog Foundation + Migration
- [ ] Task 4b: DynamicApEditor UI
- [ ] Task 4c: AP Extended Injection Export
- [ ] Task 5: RESUME Page
- [ ] Task 6: Final Verification

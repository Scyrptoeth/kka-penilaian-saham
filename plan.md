# Session 025 Plan — Extended Catalog Native Injection (Approach E3)

> Branch: `feat/session-025-extended-catalog-native`
> Scope: BS + IS native injection. FA deferred to Session 026.

## Tasks

- [ ] **T1** — Branch + add `BS_SECTION_EXTENDED` map in cell-mapping.ts (section → {subtotalRow, extendedRange, originalLeaves})
- [ ] **T2** — `injectExtendedBsAccounts(workbook, state)`: write label (col B) + values (year cols) for each user account with `excelRow >= 100`
- [ ] **T3** — `extendBsSectionSubtotals(workbook, state)`: per section with extended accounts, append `+SUM(<col>{start}:<col>{end})` to subtotal formula across all year columns
- [ ] **T4** — Wire T2+T3 into `exportToXlsx` pipeline. Skip RINCIAN NERACA call.
- [ ] **T5** — TDD: tests verify (a) extended BS account at row 100 has value, (b) section subtotal formula includes appended SUM, (c) original leaves unchanged
- [ ] **T6** — Repeat T1-T3 for IS (`IS_SECTION_EXTENDED`, `injectExtendedIsAccounts`, `extendIsSectionSubtotals`)
- [ ] **T7** — TDD: IS extended account tests
- [ ] **T8** — Full gate (842+ tests + build + lint + typecheck) → commit → merge to main → push → verify live HTTP 200 fresh deploy

## Verification per task
- T2 GREEN: extended account row in BS has both label (col B) and numeric values (year cols)
- T3 GREEN: subtotal formula for section X = original formula + `+SUM(...)` per year column
- T5/T7 GREEN: at least 4 new tests per sheet (BS, IS) covering happy path + edge cases (no extended = original behavior, multiple sections extended)
- T8: 842+N tests pass, 34 pages built, deploy fresh

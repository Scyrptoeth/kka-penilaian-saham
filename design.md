# Design — Session 042: IS Tax Adjustment Export + AAM Extended Injection + LESSON-108 Audit + AP Dynamic Catalog + RESUME Page

**Session**: 042
**Date**: 2026-04-18
**Scope**: Close 5 deferred priorities from progress.md Session 041 backlog. Agresif full-scope single session.

---

## 1. Problem Statement

Session 041 introduced synthetic sentinel rows 600 (KOREKSI_FISKAL) + 601 (TAXABLE_PROFIT) and redesigned IBD scope. Remaining gaps:

1. **Synthetic rows 600/601 not exported** — website stores them at persist time but `exportToXlsx` does not write to IS sheet. User opens exported XLSX missing tax adjustment data.
2. **AAM drops extended BS accounts** — `AamBuilder` only writes `BS_ROW_TO_AAM_D_ROW` mapped rows; extended catalog accounts (excelRow ≥ 100) with per-row `aamAdjustments` never reach the AAM sheet.
3. **Hardcoded row arrays in compute modules** — `computeNoplatLiveRows` / `computeFcfLiveRows` / FR / ROIC may still have `const *_ROWS = [N, N, N]` patterns that silently fail for extended catalog users (LESSON-108).
4. **AccPayables still static** — 4th dynamic catalog missing. Users cannot add custom bank loan schedules.
5. **No RESUME page** — no single view comparing AAM / DCF / EEM per-share results side-by-side.

## 2. Scope

### In Scope (5 tasks, full agresif)

1. **IS Tax Adjustment Export** — new `tax_adjustment` section in `IS_SECTION_INJECT`. Row 600 = static value (user leaf). Row 601 = live formula `=<col>32+<col>600` with cached pre-computed value. Placement at synthetic IS rows 600/601 (beyond legacy 1-69). No sentinel to replace — downstream Tax/NPAT formulas unchanged per LESSON-116.

2. **AAM Extended Injection** — Opsi B: formula hybrid. Per-section synthetic row ranges in AAM sheet. For each extended BS account: write label (col B), BS value (col C, static), adjustment (col D, from `aamAdjustments`), adjusted value (col E, **live formula** `=C+D`). Section subtotals extended via `+SUM(<col>{start}:<col>{end})` append — mirror Session 025 BS pattern (LESSON-067).

3. **LESSON-108 Grep Audit** — scan 4 compute modules for hardcoded row lists. Refactor to account-driven iteration when found (mirror Session 039 `resolveWcRows` pattern).

4. **AccPayables Dynamic Catalog (Opsi B + 5a=A/5b=A/5c=A)** — multi-schedule FA-band style:
   - **2 fixed sections**: Short-Term Bank Loan Schedules + Long-Term Bank Loan Schedules (matches current template)
   - **3 bands per schedule**: Beginning Balance, Addition, Ending Balance
   - **Ending = computed formula**: Excel live formula `=<col>{begRow}+<col>{addRow}` per schedule per year (Reduction is implicit as negative Addition, keeps template simple)
   - User can add N schedules within each section; default catalog seeds 1 ST + 1 LT schedule
   - Full dynamic-catalog treatment: catalog file, DynamicApEditor, sentinel pre-compute, extended injection in export

5. **RESUME Page (6a=B + 6b=B + 6c=A)** — `/dashboard/resume`:
   - Route inside existing "Ringkasan" sidebar group (below Dashboard)
   - Content: 3-column table (AAM vs DCF vs EEM) with rows Equity Value 100% / Equity Value Proporsi Saham / Per-Share Value + "Metodologi" section (1 paragraf per metode) + "Rekomendasi Nilai" (neutral midpoint/range statement)
   - Pure display via existing `build*Input` + `compute*` — no new calc
   - Required-gate via PageEmptyState on `home/interestBearingDebt/changesInWorkingCapital === null`

### Out of Scope

- **Upload parser (.xlsx → store)** — reverse direction, deferred to Session 043+ (needs IBD scope adapter discussion)
- **Multi-case management** (multi-company localStorage)
- **Dashboard polish** (projected FCF chart with Session 036 NV-growth model)
- **AP reduction as separate band** — folded into Addition via signed input
- **RESUME weighted average / range calculator** — YAGNI; user can infer from table
- **AP schedule-level custom labels beyond default "Bank Loan Schedule N"** — user rename later if needed

---

## 3. Key Technical Decisions

### D1 — TAXABLE PROFIT as live formula (Opsi C)
Cell E601 written as `{ formula: '=E32+E600', result: preComputedValue }`. ExcelJS standard pattern. User edit E600 in Excel → E601 recomputes. Consistent with Session 028 IS sentinel reactivity. Tax (row 33) + NPAT (row 35) formulas UNCHANGED per LESSON-116.

### D2 — AAM extended per-section row ranges
Reserve synthetic AAM row ranges per section (grep AAM template for unused blocks). Example allocation:
- Current Assets extended: rows 100-139 (40 slots)
- Non-Current Assets extended: rows 140-179
- IBD extended: rows 180-219
- Non-IBD CL extended: rows 220-259
- Non-IBD NCL extended: rows 260-299
- Equity extended: rows 300-339

Actual ranges verified at implementation time (Task 2a grep). Subtotal SUM appends per section. Extended account routing: `section === 'current_assets'` → current assets range; `section === 'current_liabilities' && !excludedCurrentLiabIbd.has(row)` → IBD range (else Non-IBD CL); same split for NCL. Drives same exclusion set as LESSON-119.

### D3 — LESSON-108 audit discovery-first
Phase 1: grep each of 4 files for `const \w+_ROWS\s*=\s*\[` pattern. Report findings. Refactor only actual hits using account-driven iteration. If zero hits, document as "audit clean" lesson. Saves rewriting modules that already comply.

### D4 — AP catalog schedule model
Each schedule is one "account" in the catalog with 3 synthetic bands (Beg/Addition/End rows). Mirror FA_BAND pattern:
```
ST_BEG      rows 100-139
ST_ADDITION rows 140-179
ST_END      rows 180-219   (formula band)
LT_BEG      rows 220-259
LT_ADDITION rows 260-299
LT_END      rows 300-339   (formula band)
```
Schedule index in filtered accounts → slot index within band. Ending row formula `=<col>{beg_row}+<col>{add_row}` per year column. Section subtotals in AP template (if any) extended via `+SUM` — verify template at implementation.

### D5 — RESUME page pure display
`useMemo` gates on required state; call `build*Input` + `compute*` inside memos. No new calc helpers. i18n via useT() throughout (ESLint `local/no-hardcoded-ui-strings` enforced). Copy "Metodologi" content from existing AAM/DCF/EEM page trivia if exists, else write 1-paragraf bilingual EN/ID per metode. "Rekomendasi Nilai" = neutral text listing 3 values + "user exercises professional judgment per PMK-79".

### D6 — Store migration v19 → v20
Three coordinated changes in single migration:
- **AP slice schema**: old fixed-6-field shape → new `{ shortTermSchedules: ApSchedule[], longTermSchedules: ApSchedule[] }`. Migrate old values into first default schedule of each type (preserves data).
- No IBD/WC changes (Session 041 already did those).
- Schema version bump 19→20.

### D7 — Feature branch naming
`feat/session-042-is-tax-export-aam-extended-ap-dynamic-resume` (long but descriptive per git-workflow; Vercel auto-preview gets matching subdomain)

---

## 4. Success Criteria

- Tests 1261 → ~1320+ (60+ new test cases expected)
- Build ✅, typecheck ✅, lint ✅, audit:i18n ✅, Phase C 5/5 ✅, cascade 3/3 ✅
- Live deploy HTTP 200
- Export XLSX opens cleanly (no repair dialog) — regression check Session 026
- Store v19 → v20 migration tested end-to-end
- Zero hardcoded UI strings (triple-layer gate)

## 5. Risk Register

| Risk | Mitigation |
|------|-----------|
| **Context window exhaustion mid-session** | Commit per task; ship partial via progress.md if running out. Task 4 (AP) is highest risk. |
| **AAM template subtotal row numbers unknown** | Grep template at Task 2 implementation; write ranges based on what's unused. |
| **AP template layout unknown** | Same — grep at Task 4. Fall back to current row pattern (10/11/14 + 19/20/23) if template simple. |
| **LESSON-108 audit reveals cascading refactor** | If NOPLAT/FCF actually have hardcoded rows, refactor quickly via `resolveXxxRows` helper; if complex, document + defer to Session 043. |
| **RESUME page design ambiguity** | Fallback to minimal 3-column table if Metodologi content research runs long. |

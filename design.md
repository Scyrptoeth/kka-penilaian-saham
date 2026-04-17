# Session 029 — Design

**Date**: 2026-04-17
**Scope**: (P1) i18n coverage audit + full remediation with automated lint rule + runnable audit script. (P2) Phase C headless numerical verification: seed PT Raja Voltama Elektrik → snapshot website calc pipeline → snapshot Excel export readback → diff at 1e-6 tolerance → integration test gate.

---

## Problem Statement

**P1** — After Session 027 migrated 50+ files to `useT()`, we lack automation to prevent regression. Any new hardcoded string can slip in silently. Target: zero hardcoded user-facing strings outside `translations.ts`, enforced by CI.

**P2** — Export pipeline (Sessions 018–028) touches 3,084 formulas across 29 visible nav sheets with BS/IS/FA extended-catalog native injection. We have unit tests for individual cell mappings and individual injection functions, but **no end-to-end verification** that the full compose produces numerical equivalence between website-rendered values and Excel readback. One undetected formula drift or cell mapping divergence breaks user trust in the artifact they hand to DJP. Target: automated headless comparator that catches drift at 6-decimal precision.

---

## Chosen Approach

### P1 — Triple-layer i18n enforcement

Three complementary gates, progressing from dev-feedback to CI-hard-gate:

1. **Editor feedback (IDE)** — ESLint custom rule `local/no-hardcoded-ui-strings` reports red squiggles while editing `.tsx` files.
2. **Pre-test gate (npm)** — `audit:i18n` script runs before `npm test` via `pretest` chain (alongside existing `build-nip-whitelist.cjs`). Produces markdown report.
3. **CI gate** — `npm run lint` and `npm test` both enforce — cannot merge to main with violations.

**Accept-list strategy**: `scripts/i18n-accept-list.json` holds explicit exemptions (symbols, technical tokens, CSS class names, data-testids, URLs). `// i18n-ignore` line pragma for rare edge cases.

**Remediation strategy**: full migration sesi ini. Reconnaissance shows ~22 hardcoded strings across ~17 files — manageable with TDD-disciplined batched migration.

**AST walker approach**: use TypeScript compiler API (`typescript` is already a devDep for `tsc`) rather than regex. AST gives accurate JSX text / JSXAttribute values / string literals in specific prop positions. No regex false positives on CSS class strings or import paths.

### P2 — Headless snapshot comparator

**Key insight**: We don't need DOM rendering. Website numerical values ARE the output of pure calc modules + deriveComputedRows + sentinel pre-computation. We can invoke those programmatically, seed with fixture data, extract values keyed by `{sheet, row, year}`.

**Two snapshots**:
- **Website snapshot** — seed store → run calc pipeline (same helpers that pages use) → output `phase-c-website-snapshot.json` keyed by `{sheet, row, yearOrCol}`.
- **Excel snapshot** — same seed → run `exportToXlsx` → write buffer to temp .xlsx → ExcelJS `readFile` → iterate `worksheet.eachRow` → extract `cell.value` or `cell.result` for formula cells → output `phase-c-excel-snapshot.json` same key shape.

**Diff engine**: join by key, compute `abs(websiteVal - excelVal)`. Report structure:
- PASS: diff ≤ 1e-6 for every key
- MISMATCH: list of `{sheet, row, year, websiteVal, excelVal, diff}` sorted by diff magnitude descending

**Integration**: `__tests__/integration/phase-c-verification.test.ts` imports the comparator as a library function, asserts zero mismatches. CI gate.

**29 sheets** defined in `WEBSITE_NAV_SHEETS` const (Session 024) — scope matches export visibility decision.

---

## Key Technical Decisions

### P1

1. **Node ESM (`.mjs`) not Python** — align with existing `copy-fixtures.cjs` and `build-nip-whitelist.cjs` (Node-native), and ESLint rule must be JS (same language). Avoid two-language script suite. `audit-export.py` was Python-heavy because openpyxl is Python; no such dependency here.
2. **TypeScript Compiler API for AST** — `createProgram` + visitor pattern. Handles JSX, TSX, type annotations. Already installed as devDep.
3. **Rule violation scope**: JSXText nodes + JSXAttribute values for `{aria-label, title, placeholder, alt, label, 'aria-labelledby', 'aria-describedby'}`. Plus string literal argument to `toast.error()`/`toast.success()` if we add toasts later. Explicitly **skip**: `className`, `id`, `data-*`, `style`, URLs, file paths.
4. **Threshold**: strings ≥ 2 chars containing at least one alphabetic character. Skip pure-numeric, pure-punctuation, single chars.
5. **Accept-list entries**: seed with known-safe tokens (`"NPWP"`, `"CIF"`, `"NIP"`, `"IDR"`, `"USD"`, `"EN"`, `"ID"`, `"&"`, `"→"`, `"—"`, `"•"`, `"✓"`, `"✗"`, `"2026"`, etc.) and expand as audit surfaces legitimate exemptions.

### P2

1. **Seed source** — use `src/data/seed/loader.ts` fixtures + synthesize HOME + store slices from fixture metadata (namaPerusahaan="PT Raja Voltama Elektrik", years, etc.). Deterministic — same fixture → same output every run.
2. **Website compute entry points** — reuse existing calc helpers (`upstream-helpers.ts`, `deriveComputedRows`, `computeFcf`, `computeNoplat`, etc.) directly. Do NOT mock — comparator validates the actual production code path.
3. **Excel readback** — formula cells: read `cell.result` (cached value). Value cells: read `cell.value`. For `value.richText` and `value.formula` wrapper shapes, extract primitive. Match the same 4-shape handler from export-xlsx.ts LESSON-070 sanitizer.
4. **Tolerance 1e-6** — aligns with 6-decimal fixture precision (matches existing tests). Tighter would flag floating-point noise; looser misses real bugs.
5. **Sheet coverage** — only 29 `WEBSITE_NAV_SHEETS`. Hidden helper sheets (RINCIAN, KEY DRIVERS, ACC PAYABLES, etc. that are website-visible but have dedicated pages) covered; hidden template-helper sheets (DAFTAR EMITEN 2023, PANGSA PASAR, etc.) out of scope.
6. **Mismatch remediation** — if diff surfaces, fix root cause in calc / cell mapping / export pipeline. Never relax tolerance. Add regression test for each root-cause fix.

---

## Out of Scope

### P1
- Migration strategy for lib/*.ts (non-UI) error messages or console.log strings. These are NOT user-facing.
- Full bilingual rollout to ANALISIS pages (deferred — separate priority).
- Spanish or other additional languages — only EN/ID.
- Pluralization / ICU message format — existing flat dictionary works for current needs; over-engineering for hypothetical future.

### P2
- Manual Excel inspection checklist (not needed — headless comparator replaces it).
- Visual formatting / styling parity (colors, borders, fonts in Excel) — comparator is numerical only.
- Performance of export pipeline (unchanged).
- Upload parser (.xlsx → store) — separate priority, deferred.

---

## Verification Strategy

**P1 gate**:
```
npm run audit:i18n   → 0 findings outside accept-list
npm run lint         → 0 errors (rule active)
npm test             → 913 + new audit tests pass
```

**P2 gate**:
```
npm run verify:phase-c → 0 mismatches across 29 sheets
npm test               → phase-c-verification.test.ts passes
```

**Final gate** (Session 029 done-done):
```
npm run audit:i18n    ✅
npm run lint          ✅
npm test              ✅
npm run typecheck     ✅
npm run build         ✅
npm run verify:phase-c ✅
curl HTTP 200         ✅
```

---

## Risk Analysis

| Risk | Probability | Mitigation |
|------|-------------|------------|
| Hardcoded count >>22 | Low (recon done) | Auto-split session if >100 surface |
| Phase C reveals real export bug | Medium | This is the feature, not a risk — fix + regression test |
| ESLint rule false-positives on technical strings | Medium | Accept-list + `// i18n-ignore` pragma |
| verify:phase-c slow (minutes) | Low | Seed once, snapshot in-memory, diff streaming. Target < 10s. |
| Custom ESLint rule compatibility (flat config v9) | Low | ESLint 9 flat config supports inline rule definitions; test locally |
| Multiple-key collision in website-snapshot | Medium | Use `{sheet, excelRow, yearColumn}` compound key — matches export writeCellValue addressing |

---

## References

- LESSON-066: Audit-first methodology for opaque formats (scripts/audit-export.py pattern)
- LESSON-070: Template-based ExcelJS export corruption vectors
- LESSON-072: ExcelJS Table round-trip unsafe — strip before export (affects readback too)
- LESSON-075: Flat dictionary + useT() hook i18n pattern
- LESSON-076: Root-level language field (Session 027)
- Session 024 history: WEBSITE_NAV_SHEETS const (29 entries) — scope definition
- Session 025–028 history: extended-catalog native injection (comparator must handle synthetic rows)

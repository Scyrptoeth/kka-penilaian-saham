# Session 027 — AAM Dynamic Interoperability + Full i18n

**Date**: 2026-04-16 / 2026-04-17
**Scope**: (1) Make AAM page dynamically display ALL BS accounts (catalog + manual). (2) Add EKUITAS section to AAM. (3) Redesign `computeAam` calc engine to section-based totals. (4) Build comprehensive EN/ID translation system covering entire website.
**Branch**: `feat/session-027-aam-dynamic` → fast-forwarded into `main`

## Goals (from plan.md)
- [x] Task 1: Feature branch
- [x] Task 2: Redesign `computeAam` + tests
- [x] Task 3: Add IBD helper + label resolver
- [x] Task 4: Redesign `buildAamInput`
- [x] Task 5: Update callers (Dashboard, EEM, Simulasi)
- [x] Task 6: Redesign AAM page UI
- [x] Task 7: Language toggle
- [x] Task 8: Full verification
- [x] Task 9: Commit + push + deploy
- [x] UNPLANNED: Full i18n system (500+ translation keys, 50+ files)

## Delivered

### 1. AAM Dynamic Account Interoperability
- **`AamInput` redesigned**: 20 named BS-row fields → section-based totals (totalCurrentAssets, nonIbdCurrentLiabilities, interestBearingDebtHistorical, totalEquity, etc.)
- **`buildAamInput` redesigned**: iterates `balanceSheet.accounts` dynamically, classifies each liability as IBD/non-IBD via `isIbdAccount()`, aggregates per section
- **New helpers**: `IBD_CATALOG_IDS`, `isIbdAccount()`, `resolveAccountLabel()` in `balance-sheet-catalog.ts`
- **AAM page rewritten**: dynamic from `balanceSheet.accounts`, 5 sections (AKTIVA LANCAR, AKTIVA TIDAK LANCAR, KEWAJIBAN LANCAR, KEWAJIBAN JANGKA PANJANG, EKUITAS — previously missing)
- **Fixed Asset Net** (row 22) remains special hardcoded row
- **Per-row Penyesuaian** works for ALL accounts via `aamAdjustments[excelRow]`
- **`AamResult` unchanged** — Dashboard, EEM, Simulasi callers unaffected

### 2. Comprehensive EN/ID Translation System
- **`src/lib/i18n/translations.ts`**: 500+ translation keys in flat dictionary format
- **`src/lib/i18n/useT.ts`**: React hook returning `{ t, language }`
- **Store v14→v15**: root-level `language: 'en' | 'id'` with migration from `balanceSheet.language`
- **`<LanguageToggle>`**: sidebar component below ThemeToggle, controls global language
- **50+ files migrated**: ALL 34 pages + 20 components use `useT()` hook
- **Per-editor language toggles removed**: DynamicBsEditor, DynamicIsEditor, DynamicFaEditor now read from root store
- **EN default**: technical accounting terms (DLOM, DLOC, WACC, DCF, NOPLAT, ROIC) unchanged in both languages

## Verification
```
Tests:     878/878 passing (61 files)
Build:     ✅ 34 static pages
Typecheck: ✅ clean
Lint:      ✅ clean
Deploy:    ✅ Ready — Vercel production
Store:     v15
```

## Stats
- Commits: 6
- Files changed: 59
- Lines +2,111 / -1,111
- Test cases: 878 (871→878, +7 net)
- New files: 3 (LanguageToggle.tsx, translations.ts, useT.ts, akses/layout.tsx)

## Deviations from Plan
- Plan had 9 tasks for AAM + language toggle only
- User requested full i18n (ALL text on website) mid-session → became major unplanned scope
- 3 background agents hit rate limits during first i18n batch → re-launched 5 new agents successfully

## Lessons Extracted
- [LESSON-073](../lessons-learned.md#lesson-073): Section-based calc input > named-field input for dynamic account systems
- [LESSON-074](../lessons-learned.md#lesson-074): IBD classification at catalog level, not calc level
- [LESSON-075](../lessons-learned.md#lesson-075): Flat dictionary + useT() hook is the right i18n pattern for client-side Next.js
- [LESSON-076](../lessons-learned.md#lesson-076): Lift language to root store — works before any slice exists

## Next Session Recommendation
1. IS + FA extended catalog native injection (carried over from Session 026)
2. Phase C per-page numerical verification
3. i18n coverage audit — verify no remaining hardcoded strings
4. Upload parser, RESUME page

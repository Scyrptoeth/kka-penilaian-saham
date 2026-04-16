# Session 027 Plan — AAM Dynamic Account Interoperability

> Branch: `feat/session-027-aam-dynamic`
> Scope: AAM dynamic accounts + EKUITAS + calc redesign + language toggle

## Tasks

### Task 1: Feature branch
- Create `feat/session-027-aam-dynamic` from main

### Task 2: Redesign `computeAam` + tests (RED → GREEN)
- Change `AamInput` to section-based totals
- Update `computeAam` internal logic (same NAV formula, same AamResult)
- Update test to construct section totals from fixture values
- Files: `src/lib/calculations/aam-valuation.ts`, `__tests__/lib/calculations/aam-valuation.test.ts`
- Verify: `npm test -- aam-valuation`

### Task 3: Add IBD helper + label resolver
- `IBD_CATALOG_IDS` set in `balance-sheet-catalog.ts`
- `resolveAccountLabel(account, language)` helper in catalog
- Files: `src/data/catalogs/balance-sheet-catalog.ts`

### Task 4: Redesign `buildAamInput`
- Add `accounts: BsAccountEntry[]` to `BuildAamParams`
- Iterate accounts, classify IBD, aggregate per section
- Handle Fixed Asset Net (row 22) as special case
- Files: `src/lib/calculations/upstream-helpers.ts`

### Task 5: Update callers — add `accounts` param
- Dashboard, EEM, Simulasi Potensi: add `accounts` to `buildAamInput` call
- Files: `src/app/dashboard/page.tsx`, `src/app/valuation/eem/page.tsx`, `src/app/valuation/simulasi-potensi/page.tsx`
- Verify: `npm run typecheck`

### Task 6: Redesign AAM page UI
- Replace hardcoded ASSET_ROWS/LIABILITY_ROWS with dynamic from `balanceSheet.accounts`
- Add EKUITAS section
- Group by section, resolve labels, show values + adjustments
- Fixed Asset Net row 22 = special
- Files: `src/app/valuation/aam/page.tsx`

### Task 7: Language toggle
- `<LanguageToggle>` component (similar to ThemeToggle pattern)
- Wire into Sidebar + MobileShell
- Add `setLanguage` action to store (controls `balanceSheet.language`)
- Files: `src/components/layout/LanguageToggle.tsx`, `src/components/layout/Sidebar.tsx`, `src/components/layout/MobileShell.tsx`, `src/lib/store/useKkaStore.ts`

### Task 8: Full verification
- `npm test`, `npm run build`, `npm run typecheck`, `npm run lint`

### Task 9: Commit + push + deploy
- Conventional commits, push to origin, verify Vercel deploy

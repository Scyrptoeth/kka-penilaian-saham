# Progress — KKA Penilaian Saham

> Latest state after Session 022 (2026-04-15)

## Verification Results
```
Tests:     838 / 838 passing (57 files)
Build:     ✅ 34 static pages
Typecheck: ✅ clean
Lint:      ✅ clean
Live:      https://kka-penilaian-saham.vercel.app (HTTP 200)
Store:     v14 (unchanged this session)
```

## Delivered (cumulative)

### Infrastructure
- Next 16 + React 19 + TS strict + Tailwind v4 + Zustand 5 + RHF 7 + Zod 4 + ExcelJS 4 + Recharts 3
- Design system: IBM Plex Sans/Mono, navy+gold palette, 4px radius, tabular-nums (— B&W redesign queued for Session 023)
- Store v14 with chained migration v1→v14 (14 versions, fully backward-compatible)
- Generic `CatalogAccount` interface + `ManifestRow.section: string` for multi-sheet catalogs
- Sentinel pre-computation pattern standardized across BS, IS, FA editors
- IS sign convention: expenses negative, formulas plain addition (matching Excel)
- Universal auto-save: all editors debounced 500ms, no SIMPAN buttons, HomeForm onBlur + beforeunload
- PageEmptyState universal across all sections
- **Unified DLOM/DLOC sign convention (Session 022)**: both `computeAam` and `computeSimulasiPotensi` now accept POSITIVE percentages and negate internally. Store holds positive values, all UI displays positive, sign flip centralized in pure calc.

### Pages (34 total)
- **Input**: HOME · Balance Sheet (dynamic 84) · Income Statement (dynamic 41) · Fixed Asset (dynamic 20) · Key Drivers · Acc Payables
- **Historical** (hidden from sidebar): BS, IS, Cash Flow, Fixed Asset
- **Analysis** (live-only + PageEmptyState): Financial Ratio (18/18), FCF, NOPLAT, Growth Revenue, ROIC, Growth Rate, Cash Flow Statement
- **Projection**: Proy L/R, Proy FA, Proy BS, Proy NOPLAT, Proy CFS
- **Valuation**: DLOM, DLOC (PFC), WACC, Discount Rate, Borrowing Cap, DCF, **AAM (ends at Market Value Portion — Session 022)**, EEM, CFI, Simulasi Potensi
- **Dashboard**: 4 Recharts charts

### Session 022 Deliverables (1 commit: 720faba)
- **AAM pure calc depth removal**: `finalValue` field + `paidUpCapitalDeduction` input removed from `AamResult`/`AamInput`. AAM ends at Market Value Portion (E59). Dashboard per-share re-derived from `marketValuePortion / (shares × proporsiSaham)`.
- **Simulasi Potensi sign bug fixed**: `computeSimulasiPotensi` now mirrors `computeAam` — takes positive DLOM/DLOC percentages, negates internally. Previously silent bug caused MV of Equity to inflate ~6× (52.9B instead of 8.5B for standard inputs).
- **Contract unified** across calc modules sharing `home.dlomPercent` / `home.dlocPercent`.
- **Test guard**: `'finalValue' in result).toBe(false)` prevents regression from future merge reintroducing deleted field.

## Next Session Priorities

### Session 023 — B&W Redesign (pre-locked from user Q&A)
1. **Phase 1 Brainstorm**: open `design.md`, section "Visual Identity v2 (B&W, Creddo-inspired)". Confirm creddo token mapping.
2. **Phase 2 Plan**: enumerate 34 pages for visual regression spot-check. One plan.md with ~6-8 tasks.
3. **Phase 3 Implement** (TDD where applicable):
   - Rewrite `src/app/globals.css`: `:root` light tokens + `.dark` variant + `@theme inline` rebinding
   - Font swap via `next/font`: Montserrat (sans) + JetBrains Mono (mono for financial numbers)
   - Add `next-themes` + `<ThemeProvider>` wrapper in `layout.tsx`
   - Add theme toggle button (sidebar footer likely placement)
   - Keep `text-negative` / `text-positive` as dark-red `#8B0000` / dark-emerald `#064E3B` (user-chosen subtle-semantic option)
4. **Design decisions pre-committed**:
   - Font: Montserrat + JetBrains Mono
   - Palette: near-white `#fafdff` (light), near-black `#000004` (dark), neutral opacity hierarchy 100/80/60/40
   - Default mode: light (Creddo default)
   - Theme toggle: class-based (`next-themes`), localStorage persist
   - Semantic colors: subtle red/green preserved (not pure B&W)

### Other queued (from Session 021)
5. Upload parser (.xlsx → store) — reuses Session 018 cell-mapping registry
6. RESUME page — final summary comparing DCF/AAM/EEM side by side
7. Bilingual toggle incremental rollout to ANALISIS + other pages
8. Export IS/FA RINCIAN detail sheets (apply LESSON-051 pattern)
9. Dashboard polish — projected FCF chart, more KPIs

## Latest Session
- [Session 022](history/session-022-aam-simulasi-fixes.md) (2026-04-15): AAM deep removal + Simulasi Potensi sign contract normalization — 2 new lessons (062/063)
- [Session 021](history/session-021-ux-fixes-auto-save-aam-adjustments.md) (2026-04-14): UX fixes + auto-save + PageEmptyState + AAM per-row adjustments

# Progress — KKA Penilaian Saham

> Latest state after Session 027 (2026-04-17)

## Verification Results
```
Tests:     878 / 878 passing (61 files)
Build:     ✅ 34 static pages
Typecheck: ✅ clean
Lint:      ✅ clean (React Compiler compliant)
Live:      Vercel production — Ready
Store:     v15 (language lifted to root)
```

## Delivered (cumulative)

### Infrastructure
- Next 16 + React 19 + TS strict + Tailwind v4 + Zustand 5 + RHF 7 + Zod 4 + ExcelJS 4 + Recharts 3 + next-themes 0.4
- **Visual identity (Session 023)**: Montserrat + JetBrains Mono fonts, B&W palette with light + dark mode via `next-themes`
- Store v15 with chained migration v1→v15 (15 versions, fully backward-compatible)
- **Comprehensive i18n system (Session 027)**: 500+ translation keys, `useT()` hook, `<LanguageToggle>` in sidebar, EN default / ID alternate, 50+ files migrated, root-level `language` field
- Generic `CatalogAccount` interface + `ManifestRow.section: string` for multi-sheet catalogs
- Sentinel pre-computation pattern standardized across BS, IS, FA editors
- IS sign convention: expenses negative, formulas plain addition (matching Excel)
- Universal auto-save: all editors debounced 500ms, no SIMPAN buttons, HomeForm onBlur + beforeunload
- PageEmptyState universal across all sections
- Unified DLOM/DLOC sign convention across calc family (Session 022)
- **Export pipeline (Sessions 018-026)**: template-based .xlsx export with 3,084 formulas preserved + website-nav 1:1 visibility + extended BS catalog native injection + sanitizer pipeline (3 corruption vectors eliminated)
- **AAM dynamic interoperability (Session 027)**: section-based `AamInput`, dynamic from `balanceSheet.accounts`, IBD classification, EKUITAS section, `resolveAccountLabel()`

### Pages (34 total)
- **Input**: HOME · Balance Sheet (dynamic 84) · Income Statement (dynamic 41) · Fixed Asset (dynamic 20) · Key Drivers · Acc Payables
- **Historical** (hidden from sidebar): BS, IS, Cash Flow, Fixed Asset
- **Analysis** (live-only + PageEmptyState): Financial Ratio (18/18), FCF, NOPLAT, Growth Revenue, ROIC, Growth Rate, Cash Flow Statement
- **Projection**: Proy L/R, Proy FA, Proy BS, Proy NOPLAT, Proy CFS
- **Valuation**: DLOM, DLOC (PFC), WACC, Discount Rate, Borrowing Cap, DCF, AAM (dynamic accounts + EKUITAS), EEM, CFI, Simulasi Potensi
- **Dashboard**: 4 Recharts charts

### Recent Sessions Deliverables

#### Session 027 (2026-04-16/17) — AAM Dynamic + Full i18n
- AAM page reads ALL BS accounts dynamically (catalog + manual "Isi Manual")
- EKUITAS section added to AAM display
- `computeAam` redesigned: 20 named fields → section-based totals
- `buildAamInput` iterates `balanceSheet.accounts` with IBD classification
- Comprehensive i18n: 500+ translation keys, 50+ files, EN/ID toggle in sidebar
- Store v14→v15: root-level `language` field
- Per-editor language toggles removed (replaced by global toggle)

#### Session 026 (2026-04-15) — Footer + Export Repair
- Site footer component
- Excel export repair dialog fix (4 corruption vectors, 7 new tests)

#### Session 025 (2026-04-15) — Extended BS Catalog Native Injection
- Approach E3: synthetic-row write + subtotal SUM append
- Extended BS accounts (excelRow ≥ 100) write directly to BALANCE SHEET sheet

## Next Session Priorities

### Session 028 — IS + FA Extended Catalog + Numerical Verification
1. **IS extended catalog native injection** — carry-over from Session 026
2. **FA extended catalog native injection** — 7-block mirror handling
3. **Phase C per-page numerical verification** — verify export numbers match website
4. **i18n coverage audit** — verify no remaining hardcoded strings missed

### Other queued
- Upload parser (.xlsx → store)
- RESUME page — final summary comparing DCF/AAM/EEM side by side
- Dashboard polish — projected FCF chart, more KPIs

## Latest Session
- [Session 027](history/session-027-aam-dynamic-i18n.md) (2026-04-17): AAM dynamic interoperability + full i18n (500+ keys, 50+ files)
- [Session 026](history/session-026-footer-export-repair-fix.md) (2026-04-15): Footer + export repair
- [Session 025](history/session-025-bs-extended-native-injection.md) (2026-04-15): Extended BS catalog native injection

# Progress — KKA Penilaian Saham

> Latest state after Session 028 (2026-04-17)

## Verification Results
```
Tests:     913 / 913 passing (61 files)
Build:     ✅ 34 static pages
Typecheck: ✅ clean
Lint:      ✅ clean (React Compiler compliant)
Live:      https://penilaian-bisnis.vercel.app — /akses HTTP 200, / → 307 redirect
Store:     v15 (unchanged — no schema change this session)
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
- **Export pipeline (Sessions 018-028)**: template-based .xlsx export with 3,084 formulas preserved + website-nav 1:1 visibility + BS/IS/FA extended-catalog native injection + sanitizer pipeline (3 corruption vectors eliminated)
  - BS extended (Session 025 Approach E3): synthetic-row write + subtotal `+SUM(...)` append
  - IS extended (Session 028 Approach δ): native-row write + sentinel formula replacement (D6/D7/D15/D30 → live SUM; D26/D27 stay hardcoded for mixed-sign net_interest)
  - FA extended (Session 028 Approach η): 7-band layout with slot-index mirroring + subtotal SUM append across 7 blocks (rows 100-379)
- **AAM dynamic interoperability (Session 027)**: section-based `AamInput`, dynamic from `balanceSheet.accounts`, IBD classification, EKUITAS section, `resolveAccountLabel()`

### Pages (34 total)
- **Input**: HOME · Balance Sheet (dynamic 84) · Income Statement (dynamic 41) · Fixed Asset (dynamic 20) · Key Drivers · Acc Payables
- **Historical** (hidden from sidebar): BS, IS, Cash Flow, Fixed Asset
- **Analysis** (live-only + PageEmptyState): Financial Ratio (18/18), FCF, NOPLAT, Growth Revenue, ROIC, Growth Rate, Cash Flow Statement
- **Projection**: Proy L/R, Proy FA, Proy BS, Proy NOPLAT, Proy CFS
- **Valuation**: DLOM, DLOC (PFC), WACC, Discount Rate, Borrowing Cap, DCF, AAM (dynamic accounts + EKUITAS), EEM, CFI, Simulasi Potensi
- **Dashboard**: 4 Recharts charts

### Recent Sessions Deliverables

#### Session 028 (2026-04-17) — IS + FA Extended Catalog Native Injection
- T0: Domain rename housekeeping (kka-penilaian-saham.vercel.app → penilaian-bisnis.vercel.app) in live docs + 2 skill files; session history preserved verbatim
- T1: IS extended injection (Approach δ) — `injectExtendedIsAccounts` + `replaceIsSectionSentinels`. Sentinel D6/D7/D15/D30 replaced with live `=SUM(D<ext>:D<ext>)` formulas. Net interest D26/D27 stays hardcoded (mixed-sign). Derived formulas D8/D18/D22/D32/D35 unchanged. 15 new tests.
- T2: FA extended injection (Approach η) — `injectExtendedFaAccounts` + `extendFaSectionSubtotals`. 7-band layout (rows 100-379, 40 slots each). Each extended account mirrored across 4 input bands + 3 formula bands, with 7 subtotals getting `+SUM(band)` appended. 20 new tests.
- Full Excel reactivity: user edits extended cell → sentinel/subtotal auto-recomputes → derived cascade
- 35 new tests (878 → 913). Zero regressions. Build + typecheck + lint clean.

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

## Next Session Priorities

### Session 029 — i18n Audit + Phase C Numerical Verification (deferred from Opsi B Session 028)
1. **i18n coverage audit** — grep hardcoded strings across `src/` post-Session 027 rollout. Target: zero hardcoded EN/ID strings outside `translations.ts`. Deliverable: automated lint rule or script to block new hardcoded strings.
2. **Phase C per-page numerical verification** — generate sample .xlsx export, manually cross-check 29 visible nav sheets against website-rendered values (requires user participation for Excel-side inspection). Fix any mismatches discovered. This is the last major quality gate for the export feature.
3. **Upload parser** (.xlsx → store) — reverse of export. Reuses cell-mapping registry + extended injection patterns. Can read extended rows from sheet and reconstruct catalog accounts.
4. **RESUME page** — final summary comparing DCF/AAM/EEM results side by side.
5. **Dashboard polish** — projected FCF chart, more KPIs.

### Other queued
- Multi-case management (multiple companies in one localStorage)
- Cloud sync / multi-device
- Audit trail / change history

## Latest Session
- [Session 028](history/session-028-extended-is-fa-injection.md) (2026-04-17): IS (Approach δ sentinel formula replacement) + FA (Approach η 7-band mirror) extended catalog native injection; 35 new tests (878→913), 4 commits on main
- [Session 027](history/session-027-aam-dynamic-i18n.md) (2026-04-17): AAM dynamic interoperability + full i18n (500+ keys, 50+ files)
- [Session 026](history/session-026-footer-export-repair-fix.md) (2026-04-15): Footer + export repair

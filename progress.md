# Progress — KKA Penilaian Saham

> Latest state after Session 026 (2026-04-15)

## Verification Results
```
Tests:     871 / 871 passing (61 files)
Build:     ✅ 34 static pages
Typecheck: ✅ clean
Lint:      ✅ clean (React Compiler compliant)
Live:      https://kka-penilaian-saham.vercel.app (HTTP 200 via /akses auth gate)
Store:     v14 (unchanged since Session 021)
```

## Delivered (cumulative)

### Infrastructure
- Next 16 + React 19 + TS strict + Tailwind v4 + Zustand 5 + RHF 7 + Zod 4 + ExcelJS 4 + Recharts 3 + next-themes 0.4
- **Visual identity (Session 023)**: Montserrat + JetBrains Mono fonts, B&W palette with light + dark mode via `next-themes`. Single switching point: `globals.css` `:root` + `.dark` + `@theme inline`. Theme toggle in sidebar footer + mobile drawer.
- Store v14 with chained migration v1→v14 (14 versions, fully backward-compatible)
- Generic `CatalogAccount` interface + `ManifestRow.section: string` for multi-sheet catalogs
- Sentinel pre-computation pattern standardized across BS, IS, FA editors
- IS sign convention: expenses negative, formulas plain addition (matching Excel)
- Universal auto-save: all editors debounced 500ms, no SIMPAN buttons, HomeForm onBlur + beforeunload
- PageEmptyState universal across all sections
- Unified DLOM/DLOC sign convention across calc family (Session 022)
- **Export pipeline (Sessions 018-025)**: template-based .xlsx export with 3,084 formulas preserved + website-nav 1:1 visibility (Session 024) + extended BS catalog native injection (Session 025, Approach E3)
- **`scripts/audit-export.py`**: re-runnable static analyzer producing markdown punch list of export coverage gaps

### Pages (34 total)
- **Input**: HOME · Balance Sheet (dynamic 84) · Income Statement (dynamic 41) · Fixed Asset (dynamic 20) · Key Drivers · Acc Payables
- **Historical** (hidden from sidebar): BS, IS, Cash Flow, Fixed Asset
- **Analysis** (live-only + PageEmptyState): Financial Ratio (18/18), FCF, NOPLAT, Growth Revenue, ROIC, Growth Rate, Cash Flow Statement
- **Projection**: Proy L/R, Proy FA, Proy BS, Proy NOPLAT, Proy CFS
- **Valuation**: DLOM, DLOC (PFC), WACC, Discount Rate, Borrowing Cap, DCF, AAM (ends at Market Value Portion), EEM, CFI, Simulasi Potensi
- **Dashboard**: 4 Recharts charts

### Recent Sessions Deliverables

#### Session 023 (2026-04-15) — B&W Redesign (commit c8a7d1d)
- Visual identity overhaul: Inter→Montserrat, IBM_Plex_Mono→JetBrains_Mono, navy/gold→pure B&W
- Light + dark mode via `next-themes` with class-based toggle, default light, system disabled
- `<ThemeToggle>` with `useSyncExternalStore` SSR-safe mounted gate (React Compiler compliant)
- Single-file design overhaul via Tailwind v4 CSS vars — only 3 components touched outside `globals.css`

#### Session 024 (2026-04-15) — Export Visibility + Audit Infrastructure (commit 97863cd)
- `scripts/audit-export.py` — re-runnable export auditor producing markdown punch list
- `applySheetVisibility(workbook)` enforces website-nav 1:1: 29 visible nav sheets, all helper/dataset sheets hidden
- 5 visibility fixes: unhide KEY DRIVERS + ACC PAYABLES; hide TL + RESUME + DIVIDEND DISCOUNT MODEL
- 4 visibility test guards prevent regression

#### Session 025 (2026-04-15) — Extended BS Catalog Native Injection (commit c00b9c5)
- `BS_SECTION_INJECT` map + `injectExtendedBsAccounts` + `extendBsSectionSubtotals` (Approach E3)
- Extended BS accounts (excelRow ≥ 100) write directly to BALANCE SHEET sheet at synthetic rows
- Section subtotal formulas auto-extended via `+SUM(<extendedRange>)` append per year column
- Removed `addBsDetailSheet()` (110+ lines) + 3 obsolete RINCIAN tests + visibility entry — superseded
- 244 cross-sheet formulas across 23 sheets all preserved untouched (zero row shifts, zero ref updates)

#### Session 026 (2026-04-15) — Site Footer + Excel Export Repair Dialog Fix (commits 7aea42c, 5846820, c0a6404, f14c45e, 6c36f34)
- **Site footer** (`src/components/layout/Footer.tsx`): GitHub + phone + copyright, adapted from `penilaikanwilsumut1/peta` source with B&W palette remap + inline SVGs (no lucide-react dep)
- **Export sanitizer** for template corruption vectors ExcelJS can't round-trip:
  - External-link formulas (`'[3]BALANCE SHEET'!A3`, `[4]BANGUNAN!...`) → strip, keep cached value
  - `#REF!` in cell formulas → strip
  - Raw-error cells (`t="e"` with `<v>#REF!</v>`) → clear
  - Conditional-formatting rules with dangling refs (`worksheet.conditionalFormattings[].rules[].formulae`) → filter
  - ExcelJS error-object shape `{ error: '#REF!' }` recognized alongside string form
- **stripDecorativeTables**: Excel repair log pinpointed root cause — 4 Tables on FINANCIAL RATIO mis-serialised by ExcelJS (`headerRowCount="0"` with orphan column names). Removed via `ws.removeTable()`. Cell values + styles preserved, invisible Table wrapper gone.
- Result: exported .xlsx now opens in Excel without "We found a problem" / "Excel was able to open by repairing" dialogs.
- **Inherited context** (prior untracked commits since Session 025 wrap-up): NIP Pendek access gate (`src/proxy.ts`, `src/app/akses/*`, `src/lib/auth/*`, JWT cookie), ThemeToggle redesign — not wrapped up as separate session history yet.

## Next Session Priorities

### Session 027 — IS + FA Extended Catalog (carried over from Session 026 — deferred when session scope became footer + export repair)
1. **IS extended catalog**: design "section → aggregation cell" map. Choose between (a) replace section single-leaf cell with `=SUM(extendedRange)` or (b) append `+SUM` to derived row formula (D8 Gross Profit, D15 OpEx, D28 Other Inc/Charges, D32 PBT). Handle sentinel interplay (D6/D7/D12/D13/D21/D26/D27/D30/D33 are sentinel-filled positions).
2. **FA extended catalog**: design 7-block mirror handling. Each extended FA account at row N replicates across 7 sub-blocks at row offsets (Acquisition Beg/Add/Disp/End + AccDep Beg/Add/End at offsets 0/2000/3000/4000/5000/6000/7000).

### Session 028 — Phase C Per-Page Numerical Verification
- Generate sample export with realistic dummy state (extended accounts in all dynamic catalogs, all valuation params)
- Open in Excel manually
- For SETIAP sheet: bandingkan numeric value di Excel dengan website state
- Mark mismatches sebagai bug → fix per kasus
- Could be semi-automated: Python script generate hash per sheet × per cell vs API-derived expected (over-engineering for first pass, defer)

### Other queued (from earlier sessions)
- Upload parser (.xlsx → store) — reuses Session 018 cell-mapping registry
- RESUME page — final summary comparing DCF/AAM/EEM side by side
- Bilingual toggle incremental rollout to ANALISIS + other pages
- Export IS/FA RINCIAN detail sheets (apply LESSON-051 pattern) — likely SUPERSEDED by extended-catalog native injection (Sessions 025-026)
- Dashboard polish — projected FCF chart, more KPIs

## Latest Session
- [Session 026](history/session-026-footer-export-repair-fix.md) (2026-04-15): Site footer + Excel export repair dialog fix (4 corruption vectors)
- [Session 025](history/session-025-bs-extended-native-injection.md) (2026-04-15): Extended BS catalog native injection — Approach E3
- [Session 024](history/session-024-export-visibility-audit.md) (2026-04-15): Export visibility 1:1 + audit script
- [Session 023](history/session-023-bw-redesign.md) (2026-04-15): B&W redesign — Montserrat + JetBrains Mono + dark mode toggle
- [Session 022](history/session-022-aam-simulasi-fixes.md) (2026-04-15): AAM finalValue removal + Simulasi sign fix

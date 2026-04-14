# Progress — KKA Penilaian Saham

> Latest state after Session 020 (2026-04-14)

## Verification Results
```
Tests:     837 / 837 passing (57 files)
Build:     ✅ 32 static pages
Typecheck: ✅ clean
Lint:      ✅ clean
Live:      https://kka-penilaian-saham.vercel.app (HTTP 200)
Store:     v13
```

## Delivered (cumulative)

### Infrastructure
- Next 16 + React 19 + TS strict + Tailwind v4 + Zustand 5 + RHF 7 + Zod 4 + ExcelJS 4 + Recharts 3
- Design system: IBM Plex Sans/Mono, navy+gold palette, 4px radius, tabular-nums
- Store v13 with chained migration v1→v13 (13 versions, fully backward-compatible)
- Generic `CatalogAccount` interface + `ManifestRow.section: string` for multi-sheet catalogs
- Sentinel pre-computation pattern standardized across BS, IS, FA editors
- IS sign convention: expenses negative, formulas plain addition (matching Excel)

### Pages (32 total)
- **Input**: HOME, Balance Sheet (dynamic 84-account + Common Size + Growth YoY), Income Statement (dynamic 41-account + Common Size + Growth YoY), Fixed Asset (dynamic 20-account), Key Drivers (auto-integrated with IS)
- **Historical**: BS, IS, Cash Flow, Fixed Asset (HIDDEN from sidebar — still accessible via URL)
- **Analysis**: Financial Ratio (18/18), FCF, NOPLAT, Growth Revenue, ROIC, Growth Rate — ALL live-only with empty state + redirect
- **Projection**: Proy L/R, Proy FA, Proy BS, Proy NOPLAT, Proy CFS
- **Valuation**: DLOM, DLOC, WACC, Discount Rate, Borrowing Cap, DCF, AAM, EEM, CFI, Simulasi Potensi
- **Dashboard**: 4 Recharts charts

### Session 020 Deliverables (5 commits)
- **Audit Gate**: FA sentinel pre-computation (CRITICAL fix), BS sentinel, 10 downstream merge fixes, yearCount cap
- **IS Sign Fix**: 5 computedFrom → plain addition, NOPLAT/CFS adapters updated, 4 test files fixed
- **Common Size + Growth YoY**: RowInputGrid extended, BS (% Total Assets) + IS (% Revenue) derivation columns
- **Key Drivers Integration**: auto-populate COGS ratio, OpEx ratio, Tax rate from IS store
- **ANALISIS Live-Only**: 6 pages show AnalysisEmptyState when INPUT incomplete, live data when complete
- **HISTORIS Hidden**: removed from sidebar navigation
- **Demo Company Removed**: "PT Raja Voltama Elektrik" stripped from DataSourceHeader

## Next Session Priorities

1. **Upload parser** (.xlsx → store) — reuses cell-mapping registry from Session 018
2. **RESUME page** — final summary comparing DCF/AAM/EEM results side by side
3. **Bilingual toggle** incremental rollout to ANALISIS + other pages
4. **Export IS/FA RINCIAN detail sheets** (apply LESSON-051 pattern)
5. **Dashboard polish** — projected FCF chart, more KPIs

## Latest Session
- [Session 020](history/session-020-audit-gate-sign-fix-analysis.md) (2026-04-14): Audit gate + IS sign fix + Common Size/Growth YoY + ANALISIS live-only + HISTORIS hidden

# Progress — KKA Penilaian Saham

> Latest state after Session 018 (2026-04-13)

## Verification Results
```
Tests:     771 / 771 passing (53 files)
Build:     ✅ 32 static pages
Typecheck: ✅ clean
Lint:      ✅ clean
Live:      https://kka-penilaian-saham.vercel.app (HTTP 200)
Store:     v10
```

## Delivered (cumulative)

### Infrastructure
- Next 16 + React 19 + TS strict + Tailwind v4 + Zustand 5 + RHF 7 + Zod 4 + ExcelJS 4 + Recharts 3
- Design system: IBM Plex Sans/Mono, navy+gold palette, 4px radius, tabular-nums
- Store v10 with chained migration v1→v10 (10 versions, fully backward-compatible)

### Pages (32 total)
- **Input**: HOME, Balance Sheet (dynamic), Income Statement, Fixed Asset, Key Drivers
- **Historical**: BS, IS, Cash Flow, Fixed Asset
- **Analysis**: Financial Ratio (18/18), FCF, NOPLAT, Growth Revenue, ROIC, Growth Rate
- **Projection**: Proy L/R, Proy FA, Proy BS, Proy NOPLAT, Proy CFS
- **Valuation**: DLOM, DLOC, WACC, Discount Rate, Borrowing Cap, DCF, AAM, EEM, CFI, Simulasi Potensi
- **Dashboard**: 4 Recharts charts

### Session 018 Deliverables
- **Excel Export**: template-based, 3,084 formulas preserved, ExportButton in sidebar
- **Cell Mapping Registry**: 12 store slices → verified Excel positions
- **HOME Revision**: 4 new fields (subjek pajak), conditional labels, reset buttons, PPh Badan 22%
- **Dynamic BS Input**: catalog-driven account selection (84 bilingual accounts), dynamic years, language toggle
- **Export RINCIAN NERACA**: detail sheet with all individual accounts, SUM subtotals, fully editable
- **BS Account Catalog**: 84 accounts across 7 sections with PSAK-standard Indonesian terminology

## Next Session Priorities

1. **IS + FA catalog expansion**: apply dynamic catalog pattern to Income Statement and Fixed Asset
2. **Upload parser** (.xlsx → store) — reuses cell-mapping registry from Session 018
3. **RESUME page** — final summary comparing DCF/AAM/EEM results side by side
4. **SheetPage live mode integration** for dynamic BS manifest (historical view)
5. **Dashboard polish** — projected FCF chart, more KPIs

## Latest Session
- [Session 018](history/session-018-export-home-dynamic-bs.md) (2026-04-13): Export + HOME + Dynamic BS + Catalog

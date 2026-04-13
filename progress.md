# Progress — KKA Penilaian Saham

> Latest state after Session 019 (2026-04-14)

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

### Pages (32 total)
- **Input**: HOME, Balance Sheet (dynamic 84-account), Income Statement (dynamic 41-account), Fixed Asset (dynamic 20-account), Key Drivers
- **Historical**: BS, IS, Cash Flow, Fixed Asset
- **Analysis**: Financial Ratio (18/18), FCF, NOPLAT, Growth Revenue, ROIC, Growth Rate
- **Projection**: Proy L/R, Proy FA, Proy BS, Proy NOPLAT, Proy CFS
- **Valuation**: DLOM, DLOC, WACC, Discount Rate, Borrowing Cap, DCF, AAM, EEM, CFI, Simulasi Potensi
- **Dashboard**: 4 Recharts charts

### Session 019 Deliverables
- **Dynamic FA Input**: 20-account bilingual PSAK/IFRS catalog, row mirroring × 7 sub-blocks, FA_OFFSET multipliers
- **Dynamic IS Input**: 41-account catalog across 5 sections (Revenue, Cost, OpEx, Non-Op, Net Interest), sentinel pre-computation for 20+ downstream backward compat, Net Interest income/expense sub-groups
- **UI Standardization**: bilingual add-button labels for BS, no italic on cross-ref rows, add-button font 13px
- **Downstream Updates**: 4 compute files read IS sentinels directly (no more deriveComputedRows for IS)
- **Store v11→v13**: FA dynamic accounts (v12) + IS dynamic accounts with sentinel chain (v13)

## Next Session Priorities

1. **Upload parser** (.xlsx → store) — reuses cell-mapping registry from Session 018
2. **RESUME page** — final summary comparing DCF/AAM/EEM results side by side
3. **SheetPage live mode integration** for dynamic BS/FA/IS manifests (historical view)
4. **Dashboard polish** — projected FCF chart, more KPIs
5. **Export IS/FA RINCIAN detail sheets** (apply LESSON-051 pattern)

## Latest Session
- [Session 019](history/session-019-dynamic-fa-is-catalogs.md) (2026-04-14): Dynamic FA + IS catalogs, UI standardization, sentinel compat

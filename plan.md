# Session 018 Plan — Export .xlsx (Template-Based)

> **Scope**: Cell Mapping Registry + Template-Based Export + Export Button UI
> **Deferred to S019**: Upload template generator + upload parser + upload UI
> **Branch**: `feat/session-018-export-xlsx`

## Pre-verified Assumptions

1. ExcelJS formula preservation: **CONFIRMED** (round-trip test passed)
2. HOME cell positions **differ from prompt** — verified against actual Excel
3. KEY DRIVERS COGS/selling/GA ratios are FORMULAS in Excel (D20/D23/D24)
4. File size: 1319 KB — acceptable for client-side
5. faAdjustment: no single cell in Excel — inject into AAM!D20

## Task 1: Cell Mapping Registry (src/lib/export/cell-mapping.ts)

**Files**: `src/lib/export/cell-mapping.ts`
**Verify**: TypeScript compiles, all store slices covered

Define typed mapping registry for 12 store slices → Excel cells:

### Verified Cell Positions (from Excel analysis):

**HOME** → Sheet "HOME":
- B4: namaPerusahaan (string)
- B5: jenisPerusahaan (string)
- B6: jumlahSahamBeredar (number)
- B7: jumlahSahamYangDinilai (number)
- B9: tahunTransaksi (number)
- B12: objekPenilaian (string)
- SKIP: npwp (not in Excel), nilaiNominalPerSaham (not in Excel)
- SKIP: dlomPercent, dlocPercent (formula cells B15/B16)

**BALANCE SHEET** → Sheet "BALANCE SHEET":
- Leaf rows: 8,9,10,11,12,13,14,20,21,24,31,32,33,34,38,39,43,44,46,47
- Year cols: C=y0, D=y1, E=y2, F=y3 (4 years)

**INCOME STATEMENT** → Sheet "INCOME STATEMENT":
- Leaf rows: 6,7,12,13,21,26,27,30,33
- Year cols: C=y0, D=y1, E=y2, F=y3 (4 years)

**FIXED ASSET** → Sheet "FIXED ASSET":
- Leaf rows: 8-13, 17-22, 36-41, 45-50 (24 rows)
- Year cols: C=y0, D=y1, E=y2 (3 years)

**KEY DRIVERS** → Sheet "KEY DRIVERS":
- C8-C11: financial drivers (4 scalars)
- D14: salesVolumeBase, E15-J15: salesVolumeIncrements[0..5]
- D17: salesPriceBase, E18-J18: salesPriceIncrements[0..5]
- D20,E20-J20: cogsRatio (OVERWRITE formula)
- D23,E23-J23: sellingExpenseRatio (OVERWRITE)
- D24,E24-J24: gaExpenseRatio (OVERWRITE)
- D28-J28: accReceivableDays, D29-J29: inventoryDays, D30-J30: accPayableDays
- D33-J33: land, D34-J34: building, D35-J35: equipment, D36-J36: others

**WACC** → Sheet "WACC":
- B4: equityRiskPremium, B5: ratingBasedDefaultSpread, B6: riskFree
- Dynamic rows 11+: comparableCompanies (A=name, B=BL, C=marketCap, D=debt)
- E22: waccOverride, rows 27+: bankRates (A=name, B=rate)

**DISCOUNT RATE** → Sheet "DISCOUNT RATE":
- C2-C6+C8: 6 scalars
- Dynamic K6-K10+: bankRates (K=name, L=rate×100)

**DLOM** → Sheet "DLOM":
- F7,F9,...,F25: 10 answers (odd rows)
- C30: jenisPerusahaan text, C31: kepemilikan

**DLOC** → Sheet "DLOC(PFC)":
- E7,E9,...,E15: 5 answers (odd rows)
- B21: kepemilikan

**BORROWING CAP** → Sheet "BORROWING CAP": D5, D6

**AAM** → D20: faAdjustment (overwrite formula)

**SIMULASI POTENSI (AAM)** → E11: nilaiPengalihanDilaporkan

---

## Task 2: Template Setup

Copy `kka-penilaian-saham.xlsx` → `public/templates/kka-template.xlsx`

---

## Task 3: Export Core Function (src/lib/export/export-xlsx.ts)

1. `exportToXlsx(store): Promise<Blob>` — main entry
2. `clearInputCells(workbook, mappings)` — remove prototype data
3. `injectStoreData(workbook, store, mappings)` — inject user data
4. `handleDynamicArrays(workbook, store)` — WACC/DR variable-length

Edge cases: decimal↔percent for DR bank rates (×100), overwrite formulas for KD ratios + AAM!D20, dynamic array clear+fill, DLOM/DLOC answer labels.

---

## Task 4: Export Button UI

New `ExportButton.tsx` client component. Add to Sidebar bottom area.
Disabled when `home === null`. Loading state during export.

---

## Task 5: Tests + Verification

Test cell mapping coverage + export round-trip + formula preservation.
Full build/test/typecheck/lint verification.

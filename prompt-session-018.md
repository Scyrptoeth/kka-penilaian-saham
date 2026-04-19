# Session 018 — CLI Prompt

> **Scope**: Export .xlsx (template-based, full formula) + File Upload (.xlsx → live data) dengan template standar
> **Pre-condition**: Session 017 selesai sukses. 715 tests, 32 pages, build clean, store v8.
> **Source of truth**: `kka-penilaian-saham.xlsx` (45 sheets, 3.084 formulas, 642 input values)
> **Semua lessons learned dari HANDOFF-COWORK tetap berlaku.**
> **Pengembangan Ditunda**: RESUME page dan Dashboard polish — TIDAK dikerjakan di sesi ini.

---

## GAMBARAN BESAR

Session ini membangun **2 fitur besar** yang saling komplementer:

```
EXPORT (website → Excel)                 UPLOAD (Excel → website)
┌─────────────────────┐                  ┌─────────────────────┐
│ Zustand Store       │                  │ User fills template │
│ (user's live data)  │                  │ (.xlsx file)        │
│         ↓           │                  │         ↓           │
│ Template Excel      │                  │ Parse input cells   │
│ (clone + inject)    │                  │ (SheetJS/ExcelJS)   │
│         ↓           │                  │         ↓           │
│ Download .xlsx      │                  │ Map → store slices  │
│ (formulas intact)   │                  │         ↓           │
└─────────────────────┘                  │ Zustand hydration   │
                                         │ (auto-calculate)    │
                                         └─────────────────────┘
```

Keduanya share satu komponen kunci: **Cell Mapping Registry** — peta yang menghubungkan posisi cell Excel ↔ field/slice di Zustand store.

---

## TASK A: Cell Mapping Registry — FONDASI untuk Export & Upload

### Why
Export dan Upload keduanya butuh tahu: "data X di store → cell mana di Excel?" dan sebaliknya. Bangun registry ini DULU sebagai shared infrastructure.

### What
Buat `src/lib/export/cell-mapping.ts` — registry yang mendefinisikan mapping antara Zustand store slices ↔ posisi cell di Excel.

### 10 Input Forms yang Harus Dimapping

Berikut **SELURUH** field manual di website yang perlu dimapping ke posisi cell Excel. CLI WAJIB baca file Excel langsung (`kka-penilaian-saham.xlsx` via openpyxl atau ExcelJS) untuk verifikasi posisi cell yang tepat.

#### A1. HOME → Sheet "HOME"
| Store Field | Type | Cell Excel (perlu diverifikasi) |
|---|---|---|
| `namaPerusahaan` | string | B4 |
| `npwp` | string | B5 |
| `jenisPerusahaan` | enum | B6 |
| `jumlahSahamBeredar` | number | B7 |
| `jumlahSahamYangDinilai` | number | B8 (atau field proporsi) |
| `tahunTransaksi` | number | B9 |
| `objekPenilaian` | enum | B10 |
| `nilaiNominalPerSaham` | number | B11 (BARU S017 — mungkin belum ada di Excel) |

**PENTING**: `dlomPercent` dan `dlocPercent` BUKAN input — auto-computed dari DLOM/DLOC questionnaire. Jangan include di upload mapping.

#### A2. Balance Sheet → Sheet "BALANCE SHEET"
| Store | Structure | Excel Mapping |
|---|---|---|
| `balanceSheet.rows` | `Record<excelRow, YearKeyedSeries>` | Leaf rows only (bukan subtotal/total). Year columns = C,D,E,F (4 tahun historis). Row number = excelRow dari manifest. |

**Cara mapping**: Baca manifest `src/data/manifests/balance-sheet.ts` untuk daftar leaf rows (rows tanpa `computedFrom`). Setiap leaf row di manifest punya `excelRow` property → ini jadi row number di Excel. Column mapping: tahun ke-1 → C, ke-2 → D, ke-3 → E, ke-4 → F.

#### A3. Income Statement → Sheet "INCOME STATEMENT"
Sama pattern dengan A2. Baca `src/data/manifests/income-statement.ts`.

#### A4. Fixed Asset → Sheet "FIXED ASSET"
Sama pattern. Baca `src/data/manifests/fixed-asset.ts`. Perhatikan: FA mungkin punya lebih banyak kolom atau row category berbeda.

#### A5. Key Drivers → Sheet "KEY DRIVERS" (HIDDEN di Excel)
| Store Field | Type | Notes |
|---|---|---|
| `keyDrivers.interestRateShortTerm` | decimal | Cek cell position di Excel |
| `keyDrivers.interestRateLongTerm` | decimal | |
| `keyDrivers.bankDepositRate` | decimal | |
| `keyDrivers.corporateTaxRate` | decimal | |
| `keyDrivers.salesVolumeBase` | number | |
| `keyDrivers.salesVolumeIncrements[]` | decimal[] (6) | 6 tahun proyeksi |
| `keyDrivers.salesPriceBase` | number | |
| `keyDrivers.salesPriceIncrements[]` | decimal[] (6) | |
| `keyDrivers.cogsRatio` | decimal | |
| `keyDrivers.sellingExpenseRatio` | decimal | |
| `keyDrivers.gaExpenseRatio` | decimal | |
| `keyDrivers.accReceivableDays[]` | number[] (7) | Working capital days |
| `keyDrivers.inventoryDays[]` | number[] (7) | |
| `keyDrivers.accPayableDays[]` | number[] (7) | |
| `keyDrivers.land[]` | number[] (7) | Additional capex |
| `keyDrivers.building[]` | number[] (7) | |
| `keyDrivers.equipment[]` | number[] (7) | |
| `keyDrivers.others[]` | number[] (7) | |

**KRITIS**: KEY DRIVERS adalah hidden sheet di Excel. CLI harus baca cell positions dari hidden sheet. Gunakan openpyxl dengan `data_only=False` untuk lihat raw values.

#### A6. WACC → Sheet "WACC"
| Store Field | Type | Notes |
|---|---|---|
| `wacc.equityRiskPremium` | decimal | |
| `wacc.ratingBasedDefaultSpread` | decimal | |
| `wacc.riskFree` | decimal | |
| `wacc.taxRate` | decimal | |
| `wacc.companies[]` | array | Dynamic: name, betaLevered, marketCap, debt |
| `wacc.bankRates[]` | array | Dynamic: name, rate |
| `wacc.waccOverride` | number/null | Optional override |

**Dynamic arrays**: Companies dan bankRates punya panjang variabel. CLI perlu tentukan strategy: fixed rows di Excel (misal max 10 companies) atau dynamic row insertion.

#### A7. Discount Rate → Sheet "DISCOUNT RATE"
| Store Field | Type |
|---|---|
| `discountRate.taxRate` | decimal |
| `discountRate.riskFree` | decimal |
| `discountRate.beta` | number |
| `discountRate.equityRiskPremium` | decimal |
| `discountRate.countryDefaultSpread` | decimal |
| `discountRate.derIndustry` | decimal |
| `discountRate.bankRates[]` | array (name, rate) |

#### A8. DLOM → Sheet "DLOM"
| Store Field | Type | Notes |
|---|---|---|
| `dlom.answers` | Record<1-10, string> | 10 factor answers (option labels) |
| `dlom.kepemilikan` | enum | 'mayoritas' / 'minoritas' |

**Output** (`dlom.percentage`) is AUTO-COMPUTED — jangan include sebagai input cell.

#### A9. DLOC (PFC) → Sheet "DLOC(PFC)"
| Store Field | Type | Notes |
|---|---|---|
| `dloc.answers` | Record<1-5, string> | 5 factor answers |
| `dloc.kepemilikan` | enum | 'mayoritas' / 'minoritas' |

#### A10. Borrowing Cap → Sheet "BORROWING CAP" atau di dalam EEM area
| Store Field | Type |
|---|---|
| `borrowingCapInput.piutangCalk` | number (Rp) |
| `borrowingCapInput.persediaanCalk` | number (Rp) |

#### A11. Scalar Fields (bukan di sheet tersendiri)
| Store Field | Excel Location | Notes |
|---|---|---|
| `faAdjustment` | Sheet "ADJUSTMENT TANAH" atau di AAM | Cek Excel |
| `nilaiPengalihanDilaporkan` | Sheet "SIMULASI POTENSI (AAM)" cell E11 | Verified dari analisa sebelumnya |

### Implementation

```typescript
// src/lib/export/cell-mapping.ts

interface CellMapping {
  storeSlice: string;          // 'home' | 'balanceSheet' | etc.
  storeField: string;          // 'namaPerusahaan' | 'rows.7.2021' | etc.
  excelSheet: string;          // 'HOME' | 'BALANCE SHEET' | etc.
  excelCell: string;           // 'B4' | 'C7' | etc.
  type: 'string' | 'number' | 'decimal' | 'enum' | 'array';
  transform?: 'percentToDecimal' | 'decimalToPercent' | 'none';
}

// Registry for all input cell mappings
export const INPUT_CELL_MAPPINGS: CellMapping[] = [
  // HOME
  { storeSlice: 'home', storeField: 'namaPerusahaan', excelSheet: 'HOME', excelCell: 'B4', type: 'string' },
  // ... all 642 input cells
];
```

### Verification
- Unit test: semua cell mappings reference valid store fields
- Unit test: semua excelSheet names exist di template
- Cross-check: jumlah mapped input cells ≈ 642 (sesuai analisa Excel)

---

## TASK B: Export .xlsx — Template-Based dengan Full Formula

### Why
Penilai DJP butuh output .xlsx yang bisa di-revisi manual. Formula harus tetap ada agar ketika 1 angka diubah, semua downstream ikut berubah.

### Strategi: Template-Based
Gunakan file Excel asli (`kka-penilaian-saham.xlsx`) sebagai template. Formula (3.084 buah) sudah benar di sana — ini source of truth kita. Kita hanya perlu:
1. Clone template
2. Clear input cells (hapus data PT Raja Voltama)
3. Inject data user dari Zustand store
4. Configure sheets (show/hide, rename jika perlu)
5. Generate download

### What
Buat `src/lib/export/export-xlsx.ts` + UI button di app.

### Implementation Steps

#### B1. Bundle Template Excel
- Copy `kka-penilaian-saham.xlsx` ke `public/templates/kka-template.xlsx` atau `src/data/templates/`
- Alternatif: load via fetch dari `/templates/kka-template.xlsx` saat export
- **File size ~1.3MB** — acceptable untuk client-side download

#### B2. Export Function
```typescript
// src/lib/export/export-xlsx.ts
import ExcelJS from 'exceljs';
import { INPUT_CELL_MAPPINGS } from './cell-mapping';

interface ExportOptions {
  includeHistoris: boolean;  // default: false (per user request)
}

export async function exportToXlsx(
  store: KkaState,
  options?: ExportOptions
): Promise<Blob> {
  // 1. Fetch template
  const response = await fetch('/templates/kka-template.xlsx');
  const arrayBuffer = await response.arrayBuffer();
  
  // 2. Load with ExcelJS
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  
  // 3. Clear prototype data from input cells
  clearInputCells(workbook, INPUT_CELL_MAPPINGS);
  
  // 4. Inject user data from store
  injectStoreData(workbook, store, INPUT_CELL_MAPPINGS);
  
  // 5. Configure sheet visibility
  configureSheets(workbook, options);
  
  // 6. Generate blob
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.xlsx' });
}
```

#### B3. Sheet Configuration
Sheets yang di-HIDE di output (karena user bilang exclude HISTORIS):
- Jangan hapus sheets — hanya HIDE. Formula yang reference sheet tersembunyi tetap berfungsi.
- HISTORIS sheets di Excel = sheet-sheet yang punya data historis view (bukan input). Tapi karena di Excel structure, "BALANCE SHEET" itu sendiri adalah sheet input + historis. Jadi approach-nya:
  - **Jangan hapus sheet apapun** — bisa break formula cross-references
  - **Re-order sheets** saja agar urutan sesuai website navigation
  - Sheet yang tidak relevan bisa di-hide (`worksheet.state = 'hidden'`)

#### B4. Handling Special Cases

**a. nilaiNominalPerSaham (field baru S017)**
Field ini BARU ditambah di Session 017 dan mungkin BELUM ADA di Excel asli. Solusi:
- Cek apakah cell tersedia di Excel
- Jika belum ada: inject value ke cell kosong terdekat di HOME sheet
- Atau: tambah baris baru di HOME sheet

**b. Dynamic arrays (WACC companies, bank rates)**
- Excel punya jumlah baris fixed untuk comparable companies
- Jika user punya lebih banyak/sedikit companies dari template → handle overflow/underflow
- Strategy: clear all company rows, fill dari atas, hide unused rows

**c. DLOM/DLOC questionnaire answers**
- Di Excel, jawaban DLOM/DLOC berupa dropdown/value di specific cells
- Map `answers[factorNumber]` → option label → cell value

**d. Decimal ↔ Percentage conversion**
- Store menyimpan desimal (0.30), Excel mungkin menampilkan persen (30%)
- Cek format cell di Excel: jika cell ber-format percentage → tulis 0.30, Excel tampilkan 30%
- Jika cell tanpa format → tulis sesuai format Excel (mungkin 30 bukan 0.30)
- **KRITIS**: Verify ini per cell. Salah konversi = semua formula downstream salah (re: debtRate 100× bug dari S016).

#### B5. UI Export Button
- Tambahkan tombol "Export ke Excel" di lokasi strategis:
  - Option 1: Di sidebar/header (accessible dari semua page)
  - Option 2: Di Dashboard page (karena Dashboard = ringkasan)
  - Option 3: Di HOME page (karena ini entry point)
  - **Rekomendasi**: Di header/sidebar — accessible dari mana saja
- Loading state saat export sedang proses (bisa 1-2 detik)
- Nama file download: `KKA-{namaPerusahaan}-{timestamp}.xlsx`

### Verification
- Export file bisa dibuka di Excel tanpa error
- Formulas di file export menghitung dengan benar (manual spot-check: cek 5 formula random)
- Input cells berisi data user (bukan PT Raja Voltama)
- Computed cells berisi formula (bukan static value)
- Sheet order sesuai website navigation
- HISTORIS sheets hidden (atau sesuai konfigurasi)
- File size reasonable (~1.5MB)
- Build clean

### TDD
- Test: export function returns valid Blob
- Test: cell mapping covers all store slices
- Test: decimal/percentage conversion correct for known cells
- Test: dynamic array handling (0, 3, 10 companies)

---

## TASK C: File Upload Template — Template Standar untuk Input

### Why
Pengguna saat ini harus input data satu-per-satu di website (10 form, 642+ fields). Dengan upload template, pengguna cukup isi 1 file .xlsx → upload → semua form terisi otomatis.

### What

#### C1. Buat Template File
Buat `public/templates/kka-upload-template.xlsx` — file .xlsx BERSIH yang berisi:
- **Hanya sheet-sheet INPUT** (bukan computed sheets)
- Setiap sheet punya label/header yang jelas
- Cell input diberi warna/border yang membedakan dari label
- Instruksi pengisian di row paling atas atau sheet pertama

**Sheets dalam template:**

| # | Sheet Name | Isi | Notes |
|---|---|---|---|
| 1 | PETUNJUK | Instruksi pengisian | Read-only, bold, formatted |
| 2 | HOME | 8 field master input | Validated: dropdown untuk enum fields |
| 3 | BALANCE SHEET | Leaf rows × 4 tahun | Row labels di kolom A, tahun di header |
| 4 | INCOME STATEMENT | Leaf rows × 4 tahun | Sama format dengan BS |
| 5 | FIXED ASSET | Leaf rows × 4 tahun | |
| 6 | KEY DRIVERS | Semua driver fields | Grouped: financial, operational, BS, capex |
| 7 | WACC | Market params + companies + bank rates | Max 10 companies, 10 banks |
| 8 | DISCOUNT RATE | CAPM params + bank rates | Max 10 banks |
| 9 | DLOM | 10 factor answers + kepemilikan | Dropdown validation per factor |
| 10 | DLOC | 5 factor answers + kepemilikan | Dropdown validation per factor |
| 11 | BORROWING CAP | piutangCalk, persediaanCalk | 2 fields |
| 12 | ADDITIONAL INPUT | faAdjustment, nilaiPengalihanDilaporkan | 2 fields |

**Template harus:**
- Cell input berwarna kuning/light blue (konvensi Excel untuk "isi di sini")
- Cell label berwarna abu-abu (read-only)
- Data validation di cell enum (dropdown): jenisPerusahaan, objekPenilaian, DLOM/DLOC answers
- Number format: Rp untuk angka besar, % untuk rate/ratio
- Header row: frozen (freeze panes)
- Sheet PETUNJUK berisi instruksi singkat + link ke website

**Pendekatan pembuatan template:**
- **REKOMENDASI**: Buat template secara PROGRAMMATIC dengan ExcelJS (bukan manual)
- Buat script: `scripts/generate-upload-template.ts` yang:
  1. Baca manifest files untuk row labels BS/IS/FA
  2. Baca DLOM_FACTORS dan DLOC_FACTORS untuk option lists
  3. Generate .xlsx dengan formatting, validation, dan labels
  4. Output ke `public/templates/kka-upload-template.xlsx`
- Benefit: template SELALU sinkron dengan codebase (jika manifest berubah, re-run script)

#### C2. Upload Parser
Buat `src/lib/upload/parse-upload.ts`:

```typescript
import ExcelJS from 'exceljs';
import { INPUT_CELL_MAPPINGS } from '../export/cell-mapping';

interface ParseResult {
  success: boolean;
  data: Partial<KkaState>;       // Parsed store slices
  errors: ParseError[];           // Validation errors
  warnings: ParseWarning[];       // Non-critical issues
}

interface ParseError {
  sheet: string;
  cell: string;
  field: string;
  message: string;               // e.g., "Expected number, got string"
}

export async function parseUploadedXlsx(file: File): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  
  const result: ParseResult = { success: true, data: {}, errors: [], warnings: [] };
  
  // Parse each sheet using INPUT_CELL_MAPPINGS
  for (const mapping of INPUT_CELL_MAPPINGS) {
    const worksheet = workbook.getWorksheet(mapping.excelSheet);
    if (!worksheet) {
      result.warnings.push({ ... });
      continue;
    }
    
    const cell = worksheet.getCell(mapping.excelCell);
    const value = extractValue(cell, mapping);
    
    if (value !== undefined) {
      setNestedValue(result.data, mapping.storeSlice, mapping.storeField, value);
    }
  }
  
  // Validate required fields
  validateRequiredFields(result);
  
  return result;
}
```

#### C3. Upload UI
- Tambahkan halaman/modal "Upload Data" atau di HOME page
- Drag-and-drop area + file picker button
- Accept: `.xlsx` only
- Flow:
  1. User pilih/drop file
  2. System parse → show preview (jumlah field terdeteksi, errors jika ada)
  3. User konfirmasi "Import"
  4. System inject ke Zustand store (replace existing data)
  5. Semua page auto-calculate dengan data baru
  6. Show success notification

- **Validasi pre-import:**
  - Sheet names harus match template
  - Required fields (namaPerusahaan, tahunTransaksi, dll.) harus terisi
  - Number fields harus berisi angka
  - Enum fields harus berisi value yang valid
  - Show error summary jika ada masalah

- **Konfirmasi destructive action:**
  - Jika store sudah ada data (user sebelumnya sudah input manual), tampilkan warning:
    "Data yang sudah ada akan di-replace. Lanjutkan?"
  - User harus klik konfirmasi

#### C4. Download Template Button
- Di halaman upload, sediakan tombol "Download Template"
- Download `kka-upload-template.xlsx` dari `/templates/`
- Label jelas: "Download template ini, isi datanya, lalu upload kembali"

### Verification
- Template .xlsx bisa dibuka di Excel tanpa error
- Semua cell input punya formatting yang benar (warna, border, number format)
- Dropdown validasi bekerja (jenisPerusahaan, DLOM factors, dll.)
- Upload parser: isi template dengan data test → parse → verify store slices terisi benar
- Upload parser: upload file dengan data tidak valid → error messages informatif
- Round-trip test: Export .xlsx → edit manual → Upload kembali → data preserved
- Build clean

### TDD
- Test: parseUploadedXlsx dengan fixture .xlsx → correct ParseResult
- Test: required field validation
- Test: type coercion (string→number, percentage handling)
- Test: partial upload (beberapa sheet kosong) → partial ParseResult with warnings

---

## TASK D: Navigation & UX Integration

### What
- Tambahkan link/button Export dan Upload di UI website
- Integrasi ke existing navigation flow

### Export Button
- **Lokasi**: Di sidebar bottom area ATAU di header bar
- **Icon**: Download icon
- **Label**: "Export ke Excel"
- **Behavior**: Klik → loading spinner → auto-download .xlsx
- **Disable condition**: `home === null` (seed mode — tidak ada data user untuk export)

### Upload Button/Page
- **Option A**: Dedicated page `/upload` dengan drag-drop area
- **Option B**: Modal dialog accessible dari HOME page
- **Rekomendasi**: Option A — dedicated page, karena upload flow punya multi-step (preview → confirm → success)
- **Link di sidebar**: Di grup "Input Data" atau di HOME area
- Tombol "Download Template" di halaman upload

### Template Download
- Di halaman upload: "Belum punya template? [Download Template]"
- Di HOME page: link ke template download (opsional)

### Verification
- Export button visible dan functional dari semua pages
- Upload page accessible dan flow lengkap bekerja
- Template download works
- Mobile responsive (upload area usable di mobile)
- Build clean

---

## URUTAN EKSEKUSI & COMMIT STRATEGY

```
Task A (Cell Mapping Registry)  → commit: "feat: add cell mapping registry for Excel ↔ store mapping"
Task B (Export .xlsx)           → commit: "feat: add template-based Excel export with full formulas"
Task C (File Upload + Template) → commit: "feat: add file upload parser and standardized input template"
Task D (Navigation & UX)       → commit: "feat: integrate export/upload buttons into navigation"
```

Atau jika lebih nyaman, boleh commit per sub-task (B1, B2, B3, dll.).

---

## FINAL VERIFICATION (setelah semua task)

```bash
npm run test 2>&1 | tail -25          # semua test passing
npm run build 2>&1 | tail -25         # zero errors
npm run typecheck 2>&1 | tail -5      # clean
npm run lint 2>&1 | tail -5           # zero warnings
```

### Manual Verification Checklist:
- [ ] Export: download .xlsx → buka di Excel → formulas ada dan bekerja
- [ ] Export: computed cells punya formula (bukan nilai statis)
- [ ] Export: input cells berisi data user (bukan PT Raja Voltama)
- [ ] Template: download template → buka di Excel → cell warna, validation, labels benar
- [ ] Upload: isi template → upload → semua form terisi otomatis
- [ ] Upload: data invalid → error messages jelas
- [ ] Round-trip: isi manual → export → edit di Excel → upload kembali → data preserved
- [ ] Seed mode: export button disabled (tidak ada data user)
- [ ] Live mode: export button enabled dan functional

Hitung total tests, total pages, store version — update progress.md.

---

## CRITICAL REMINDERS

1. **Decimal ↔ Percentage**: PALING KRITIS. Store pakai desimal (0.30), Excel bisa pakai persen (30%) atau desimal tergantung cell format. VERIFY per cell. Ingat debtRate 100× bug dari S016.
2. **Cell Mapping = single source of truth**: Export dan Upload HARUS pakai registry yang sama. Jangan mapping terpisah.
3. **Jangan hapus sheet dari template**: Hide saja. Hapus sheet = break formula cross-references.
4. **Dynamic arrays**: Companies/bank rates punya panjang variabel. Handle overflow gracefully.
5. **buildDiscountRateInput()** — tetap WAJIB pakai untuk page-level consumption (LESSON-043/046).
6. **ExcelJS formula preservation**: Saat load template dengan ExcelJS, pastikan `workbook.xlsx.load()` PRESERVE formulas. Test ini dulu sebelum build export function.
7. **File size**: Template ~1.3MB. Acceptable untuk client-side, tapi test performance di mobile.
8. **Browser compatibility**: ExcelJS di browser butuh polyfills? Test di Chrome + Safari.
9. **Next.js 16 static**: Template file di `public/` folder → served as static asset.
10. **Company-agnostic**: Template harus kosong — zero PT Raja Voltama data (LESSON-029).

---

## PENGEMBANGAN DITUNDA (untuk sesi mendatang)

- **RESUME page** — final summary comparing DCF/AAM/EEM results side by side
- **Polish Dashboard** — add projected FCF to FCF chart, more KPIs

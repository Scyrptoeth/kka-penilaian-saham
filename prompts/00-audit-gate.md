# PROMPT 0 — AUDIT GATE: INPUT DATA Integrity Check

## Konteks Proyek

Proyek: **KKA Penilaian Saham** (Kertas Kerja Analisis Penilaian Bisnis/Saham untuk Penilai DJP).
Working folder: `/Users/persiapantubel/Desktop/claude/superpowers/kka-penilaian-saham`
Source of truth: `kka-penilaian-saham.xlsx`

Kita baru saja menyelesaikan 3 bagian foundation yang paling kritis karena hasilnya akan dikonsumsi oleh hampir semua bagian ANALISIS, PROYEKSI, PENILAIAN, dan RINGKASAN:

1. **INPUT DATA - Fixed Asset**
2. **INPUT DATA - Balance Sheet**
3. **INPUT DATA - Income Statement**

Sebelum membangun bagian lanjutan, kita butuh **audit gate** untuk memastikan ketiga bagian di atas benar-benar siap menjadi fondasi.

## Tujuan Prompt Ini

Jalankan **audit menyeluruh (comprehensive audit)** terhadap ketiga bagian INPUT DATA di atas. Audit ini harus membuktikan bahwa setiap bagian:

1. **Pure system development** — semua nilai yang bisa dikalkulasi memang dikalkulasi oleh fungsi TypeScript di `src/lib/calculations/`, bukan hard-coded, bukan manual input yang seharusnya derived.
2. **Zero patching** — tidak ada workaround ad-hoc, tidak ada `// TODO`, tidak ada `// HACK`, tidak ada placeholder value.
3. **Zero manual fallback** — tidak ada field yang seharusnya auto tapi dibiarkan manual "sementara".
4. **Integration ready** — data yang dihasilkan siap dikonsumsi oleh bagian lain via Zustand store / hooks, dengan tipe yang jelas.

## Instruksi Eksekusi (Full Autonomous Mode)

Anda diberi otorisasi penuh untuk:
- ✅ Auto-fix semua issue yang ditemukan (minor maupun major)
- ✅ Refactor jika diperlukan untuk menghilangkan patching/manual fallback
- ✅ Menambah unit test untuk memperkuat verifikasi kalkulasi
- ✅ Auto commit + push ke GitHub (conventional commits)
- ✅ Auto deploy ke Vercel sampai website live
- ✅ Re-audit setelah fix sampai benar-benar clean

**No mistakes**: setiap fix harus disertai bukti (test pass, build pass, diff jelas).

## Langkah Kerja Wajib

### Step 1 — Baca Excel sebagai Golden Standard

1. Parse `kka-penilaian-saham.xlsx` dengan SheetJS, ekstrak struktur kolom + formula dari 3 sheet: `FIXED ASSET`, `BALANCE SHEET`, `INCOME STATEMENT`.
2. Catat ke file `audit-reports/excel-reference.md`:
   - Daftar semua field per sheet
   - Formula setiap cell yang dikalkulasi (jika ada)
   - Relasi/dependency antar field
   - Hidden sheet yang di-reference (ACC PAYABLES, ADJUSTMENT TANAH, KEY DRIVERS)

### Step 2 — Inventarisasi Kode Saat Ini

1. `Grep` + `Glob` untuk menemukan semua file terkait 3 bagian INPUT DATA:
   - Komponen: `src/app/input-data/**` dan `src/components/input-data/**`
   - Kalkulasi: `src/lib/calculations/input-data/**` (atau path sejenis)
   - Store: `src/lib/store/**` bagian input-data
   - Types: `src/types/**` bagian input-data
2. Catat di `audit-reports/codebase-inventory.md` — daftar file + fungsi + tanggung jawabnya.

### Step 3 — Audit Per Bagian

Untuk **setiap** bagian (Fixed Asset, Balance Sheet, Income Statement), jalankan checklist:

**A. Formula Fidelity**
- [ ] Setiap kalkulasi di UI punya fungsi pure di `src/lib/calculations/`
- [ ] Output fungsi tersebut IDENTIK dengan output Excel untuk input yang sama (tolerance: ≤ Rp 1 akibat rounding)
- [ ] Ada unit test di `__tests__/calculations/` yang memverifikasi ini

**B. System Development (bukan Manual/Patching)**
- [ ] Tidak ada field yang seharusnya derived tapi dibiarkan manual input
- [ ] Tidak ada `TODO`, `FIXME`, `HACK`, `@ts-ignore`, `any` di file yang diaudit
- [ ] Tidak ada hard-coded magic number yang seharusnya berasal dari input user
- [ ] Semua conditional/edge case di-handle eksplisit (division by zero, negative values, empty periods)

**C. Integration Readiness**
- [ ] State di Zustand store punya shape yang jelas + typed
- [ ] Ada selector/hook yang siap dikonsumsi bagian lain (Cash Flow Statement, Financial Ratio, NOPLAT, dll.)
- [ ] Dokumentasi singkat di JSDoc untuk public API

**D. UX Quality Gate**
- [ ] Input validation jelas (format IDR, periode, negative allowed/not)
- [ ] Error message informatif dan actionable
- [ ] Auto-save ke LocalStorage berfungsi
- [ ] Mobile-responsive (tabel scrollable horizontal)

### Step 4 — Laporkan Temuan di `audit-reports/findings.md`

Struktur laporan per bagian:

```markdown
## [Bagian: Fixed Asset / Balance Sheet / Income Statement]

### Status Awal
- Pass checklist: X/Y
- Issues ditemukan: N

### Issues & Fix
| # | Kategori | Severity | Deskripsi | File:Line | Fix Action |
|---|----------|----------|-----------|-----------|------------|
| 1 | Formula | Major    | ...       | ...       | Auto-fix applied |

### Status Setelah Fix
- Pass checklist: Y/Y ✅
- Test coverage: X%
- Build: PASS
```

### Step 5 — Auto-Fix Semua Issue

Jalankan fix untuk setiap issue:
- **Minor** (typo, inconsistent formatting, missing JSDoc): langsung fix.
- **Major** (missing integration, wrong formula, patching): refactor + tambah test + dokumentasi.
- Setelah setiap major fix: jalankan unit test + build, pastikan green.

### Step 6 — Verifikasi Akhir

1. Jalankan `npm run build 2>&1 | tail -25` — WAJIB zero errors.
2. Jalankan `npm run test 2>&1 | tail -40` — WAJIB all green, terutama test kalkulasi INPUT DATA.
3. Jalankan `npm run lint 2>&1 | tail -20` — WAJIB zero warnings di file INPUT DATA.
4. Manual smoke test: buka halaman INPUT DATA di localhost, input sample data dari Excel, verify output sama persis.

### Step 7 — Commit + Push + Deploy

Hanya jika Step 6 semua PASS:
1. `git add` hanya file yang relevan (jangan `-A`).
2. Commit dengan conventional message:
   ```
   refactor(input-data): full audit + fix for system development integrity

   - Remove patching in [specific file]
   - Replace manual field with derived calculation in [specific file]
   - Add unit tests for [formula names]
   - Ensure zero manual fallback across Fixed Asset, Balance Sheet, Income Statement

   Audit gate passed: ready for Cash Flow Statement deployment.
   ```
3. `git push`.
4. Monitor Vercel deploy via `npx vercel ls` atau GitHub Actions sampai status **Ready**.
5. Fetch URL production + smoke test bahwa website live dan halaman INPUT DATA render tanpa error.

### Step 8 — Finalisasi

1. Update `progress.md` di working folder:
   - Tanggal audit
   - Issue yang di-fix (ringkasan)
   - Status ketiga bagian INPUT DATA: **AUDIT PASSED**
   - Next step: Deploy Cash Flow Statement (Prompt 1)

2. Laporkan ke user dengan format:
   ```
   ✅ AUDIT GATE PASSED
   - Fixed Asset: clean (N issues fixed)
   - Balance Sheet: clean (N issues fixed)
   - Income Statement: clean (N issues fixed)
   - Tests: X passing
   - Build: PASS
   - Deploy: LIVE at [vercel-url]
   Ready for Prompt 1: Cash Flow Statement deployment.
   ```

## Aturan Non-Negotiable

1. **Bahasa**: komunikasi Bahasa Indonesia, code & comments Bahasa Inggris.
2. **No lying**: jangan pernah bilang "selesai" tanpa bukti verifikasi (test output, build status, Vercel URL).
3. **TDD**: jika nambah/ubah formula, test dulu (RED → GREEN → REFACTOR).
4. **Token efficiency**: `| tail -N` untuk semua command panjang; `Grep` dulu sebelum `Read` file besar.
5. **Read Next.js docs**: stack proyek ini punya breaking changes, baca `node_modules/next/dist/docs/` sebelum nulis kode Next.js yang Anda tidak 100% yakin.
6. **Jangan touch HISTORIS** di fase ini — fokus hanya INPUT DATA.
7. **Source of truth**: `kka-penilaian-saham.xlsx` adalah golden standard. Jika ragu, re-parse Excel.

## Kriteria Sukses Prompt Ini

Prompt ini SUKSES ketika:
- ✅ Tiga bagian INPUT DATA terbukti pure system development (zero patching/manual fallback)
- ✅ Semua test kalkulasi INPUT DATA hijau dengan data Excel sebagai golden standard
- ✅ Build + lint zero errors/warnings di file INPUT DATA
- ✅ Commit + push berhasil
- ✅ Vercel deploy LIVE
- ✅ Laporan di `audit-reports/findings.md` lengkap
- ✅ `progress.md` terupdate

Setelah semua di atas PASS, STOP dan laporkan ke user untuk memulai Prompt 1 (Cash Flow Statement).

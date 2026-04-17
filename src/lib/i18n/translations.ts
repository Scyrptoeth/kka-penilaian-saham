/**
 * Comprehensive EN/ID translation dictionary for the entire website.
 * Session 027 — full i18n implementation.
 *
 * Key naming convention: `area.context.specificKey`
 * Technical accounting terms (DLOM, DLOC, WACC, DCF, NOPLAT, ROIC, etc.)
 * remain unchanged in both languages.
 */

export type Lang = 'en' | 'id'

const dict = {
  // ═══════════════════════════════════════════════════════════════════
  // NAVIGATION
  // ═══════════════════════════════════════════════════════════════════
  'nav.group.inputMaster': { en: 'Input Master', id: 'Input Master' },
  'nav.group.inputData': { en: 'Input Data', id: 'Input Data' },
  'nav.group.analysis': { en: 'Analysis', id: 'Analisis' },
  'nav.group.projection': { en: 'Projection', id: 'Proyeksi' },
  'nav.group.valuation': { en: 'Valuation', id: 'Penilaian' },
  'nav.group.summary': { en: 'Summary', id: 'Ringkasan' },
  'nav.item.home': { en: 'HOME', id: 'HOME' },
  'nav.item.fixedAsset': { en: 'Fixed Asset', id: 'Aset Tetap' },
  'nav.item.balanceSheet': { en: 'Balance Sheet', id: 'Neraca' },
  'nav.item.incomeStatement': { en: 'Income Statement', id: 'Laba Rugi' },
  'nav.item.keyDrivers': { en: 'Key Drivers', id: 'Asumsi Proyeksi' },
  'nav.item.accPayables': { en: 'Acc Payables', id: 'Utang Usaha' },
  'nav.item.financialRatio': { en: 'Financial Ratio', id: 'Rasio Keuangan' },
  'nav.item.fcf': { en: 'FCF', id: 'FCF' },
  'nav.item.noplat': { en: 'NOPLAT', id: 'NOPLAT' },
  'nav.item.growthRevenue': { en: 'Growth Revenue', id: 'Pertumbuhan Pendapatan' },
  'nav.item.roic': { en: 'ROIC', id: 'ROIC' },
  'nav.item.growthRate': { en: 'Growth Rate', id: 'Tingkat Pertumbuhan' },
  'nav.item.cashFlowStatement': { en: 'Cash Flow Statement', id: 'Laporan Arus Kas' },
  'nav.item.proyLR': { en: 'Proy. P&L', id: 'Proy. L/R' },
  'nav.item.proyFixedAsset': { en: 'Proy. Fixed Asset', id: 'Proy. Aset Tetap' },
  'nav.item.proyBalanceSheet': { en: 'Proy. Balance Sheet', id: 'Proy. Neraca' },
  'nav.item.proyNoplat': { en: 'Proy. NOPLAT', id: 'Proy. NOPLAT' },
  'nav.item.proyCashFlow': { en: 'Proy. Cash Flow', id: 'Proy. Arus Kas' },
  'nav.item.dlom': { en: 'DLOM', id: 'DLOM' },
  'nav.item.dlocPfc': { en: 'DLOC (PFC)', id: 'DLOC (PFC)' },
  'nav.item.wacc': { en: 'WACC', id: 'WACC' },
  'nav.item.discountRate': { en: 'Discount Rate', id: 'Tingkat Diskonto' },
  'nav.item.borrowingCap': { en: 'Borrowing Cap', id: 'Kapasitas Pinjaman' },
  'nav.item.dcf': { en: 'DCF', id: 'DCF' },
  'nav.item.aam': { en: 'AAM', id: 'AAM' },
  'nav.item.eem': { en: 'EEM', id: 'EEM' },
  'nav.item.cfi': { en: 'CFI', id: 'CFI' },
  'nav.item.simulasiPotensi': { en: 'Tax Simulation', id: 'Simulasi Potensi' },
  'nav.item.dashboard': { en: 'Dashboard', id: 'Dashboard' },

  // ═══════════════════════════════════════════════════════════════════
  // COMMON / SHARED
  // ═══════════════════════════════════════════════════════════════════
  'common.loading': { en: 'Loading…', id: 'Memuat…' },
  'common.loadingData': { en: 'Loading data…', id: 'Memuat data…' },
  'common.description': { en: 'Description', id: 'Keterangan' },
  'common.value': { en: 'Value', id: 'Nilai' },
  'common.total': { en: 'Total', id: 'Total' },
  'common.average': { en: 'Average', id: 'Rata-rata' },
  'common.cancel': { en: 'Cancel', id: 'Batal' },
  'common.remove': { en: 'Remove', id: 'Hapus' },
  'common.add': { en: 'Add', id: 'Tambah' },
  'common.autoSaved': { en: 'Auto-saved', id: 'Otomatis tersimpan' },
  'common.resetPage': { en: 'Reset This Page', id: 'Reset Halaman Ini' },
  'common.resetAll': { en: 'Reset All Data', id: 'Reset Seluruh Data' },
  'common.resetAllTitle': { en: 'Reset All Data', id: 'Reset Seluruh Data' },
  'common.resetAllMessage': { en: 'Are you sure you want to reset ALL data? This action cannot be undone.', id: 'Yakin ingin mereset SELURUH data? Tindakan ini tidak dapat dibatalkan.' },
  'common.resetAllConfirm': { en: 'Reset All', id: 'Reset Semua' },
  'common.noData': { en: 'Data not available.', id: 'Data belum tersedia.' },
  'common.debt': { en: 'Debt', id: 'Hutang' },
  'common.equity': { en: 'Equity', id: 'Ekuitas' },
  'common.histSuffix': { en: ' (hist)', id: ' (hist)' },
  'common.historical': { en: 'Historical', id: 'Historis' },
  'common.projection': { en: 'Projection', id: 'Proyeksi' },
  'common.year': { en: 'year', id: 'tahun' },
  'common.years': { en: 'years', id: 'tahun' },

  // ═══════════════════════════════════════════════════════════════════
  // LAYOUT / CHROME
  // ═══════════════════════════════════════════════════════════════════
  'sidebar.brand.line1': { en: 'KKA Valuation', id: 'KKA Penilaian' },
  'sidebar.brand.line2': { en: 'Business II', id: 'Bisnis II' },
  'sidebar.privacyBadge': { en: 'All Processing Runs on Your Device', id: 'Seluruh Proses Berjalan di Perangkat Anda' },
  'sidebar.navAriaLabel': { en: 'Sheet navigation', id: 'Navigasi sheet' },
  'sidebar.navAriaLabelDesktop': { en: 'Sheet navigation (desktop)', id: 'Navigasi sheet (desktop)' },
  'sidebar.wipBadge': { en: 'WIP', id: 'WIP' },

  'footer.githubAriaLabel': { en: 'KKA Penilaian Saham GitHub Repository', id: 'Repository GitHub KKA Penilaian Saham' },
  'footer.contactLine': { en: 'Feedback & Issues: 0822-9411-6001 (Dedek)', id: 'Saran & Kendala: 0822-9411-6001 (Dedek)' },
  'footer.copyright': { en: 'Made with ❤ for You.', id: 'Dibuat dengan ❤ untuk Kamu.' },

  'export.buttonLabel': { en: 'Export to Excel', id: 'Export ke Excel' },
  'export.exporting': { en: 'Exporting…', id: 'Mengekspor…' },
  'export.enabledTitle': { en: 'Export to Excel (.xlsx)', id: 'Export ke Excel (.xlsx)' },
  'export.disabledTitle': { en: 'Fill HOME data before exporting', id: 'Isi data di HOME dulu sebelum export' },
  'export.errorFallback': { en: 'Export failed', id: 'Export gagal' },

  'logout.label': { en: 'Logout', id: 'Keluar' },
  'logout.pending': { en: 'Logging out…', id: 'Keluar…' },
  'logout.ariaLabel': { en: 'Log out of KKA session', id: 'Keluar dari sesi KKA' },

  'theme.loading': { en: 'Display Mode', id: 'Mode Tampilan' },
  'theme.switchToDark': { en: 'Click to switch to Dark Mode', id: 'Klik untuk Ganti ke Dark Mode' },
  'theme.switchToLight': { en: 'Click to switch to Light Mode', id: 'Klik untuk Ganti ke Light Mode' },

  'lang.loading': { en: 'Language', id: 'Bahasa' },
  'lang.switchToId': { en: 'EN — Click for Bahasa Indonesia', id: 'EN — Klik untuk Bahasa Indonesia' },
  'lang.switchToEn': { en: 'ID — Click for English', id: 'ID — Klik untuk English' },

  'mobile.openMenu': { en: 'Open navigation menu', id: 'Buka menu navigasi' },
  'mobile.closeMenu': { en: 'Close menu', id: 'Tutup menu' },
  'mobile.brand': { en: 'KKA Valuation', id: 'KKA Penilaian Saham' },
  'mobile.org': { en: 'Directorate General of Taxes', id: 'Direktorat Jenderal Pajak' },
  'mobile.navAriaLabel': { en: 'Sheet navigation', id: 'Navigasi sheet' },

  // ═══════════════════════════════════════════════════════════════════
  // EMPTY STATE
  // ═══════════════════════════════════════════════════════════════════
  'emptyState.description': { en: 'This page requires data from other pages. Please complete the following inputs first:', id: 'Halaman ini membutuhkan data dari halaman lain. Lengkapi input berikut terlebih dahulu:' },
  'emptyState.filled': { en: 'Filled', id: 'Terisi' },
  'emptyState.ctaPrefix': { en: 'Complete', id: 'Lengkapi' },

  // ═══════════════════════════════════════════════════════════════════
  // TABLE HEADERS
  // ═══════════════════════════════════════════════════════════════════
  'table.lineItemHeader': { en: 'Line Item', id: 'Pos-Pos' },
  'table.commonSize': { en: 'Common Size', id: 'Common Size' },
  'table.growthYoY': { en: 'Growth YoY', id: 'Pertumbuhan YoY' },

  // ═══════════════════════════════════════════════════════════════════
  // DATA SOURCE HEADER
  // ═══════════════════════════════════════════════════════════════════
  'dataSource.seedTitle': { en: 'Demo Mode · Prototype Workbook', id: 'Mode Demo · Workbook Prototipe' },
  'dataSource.seedDescription': { en: 'The data on this page is sample data from the workbook prototype (PT Raja Voltama Elektrik).', id: 'Data pada halaman ini adalah angka contoh dari workbook prototipe (PT Raja Voltama Elektrik).' },
  'dataSource.seedCta': { en: 'Complete Input Data to see your company data.', id: 'Lengkapi Input Data untuk melihat data perusahaan Anda.' },
  'dataSource.loading': { en: 'loading…', id: 'memuat…' },
  'dataSource.notFilled': { en: 'not filled (complete HOME form)', id: 'belum diisi (lengkapi HOME form)' },
  'dataSource.liveTitle': { en: 'Share Valuation', id: 'Penilaian Saham' },
  'dataSource.seedBannerAriaLabel': { en: 'Demo Mode — prototype data', id: 'Mode demo — data prototipe' },
  'dataSource.companyNameAriaLabel': { en: 'Name of the company being valued', id: 'Nama perusahaan yang sedang dinilai' },

  // ═══════════════════════════════════════════════════════════════════
  // DROPDOWN / CATALOG UI
  // ═══════════════════════════════════════════════════════════════════
  'dropdown.manualEntry': { en: 'Manual Entry...', id: 'Isi Manual...' },
  'dropdown.allAdded': { en: 'All accounts have been added', id: 'Semua akun sudah ditambahkan' },
  'dropdown.namePlaceholder': { en: 'Account name...', id: 'Nama akun...' },
  'dropdown.cancel': { en: 'Cancel', id: 'Batal' },
  'dropdown.add': { en: 'Add', id: 'Tambah' },

  // ═══════════════════════════════════════════════════════════════════
  // EDITOR COMMON (BS, IS, FA editors)
  // ═══════════════════════════════════════════════════════════════════
  'editor.sectionLabel': { en: 'Input Data', id: 'Input Data' },
  'editor.yearAxisInfo': { en: 'Historical years:', id: 'Tahun historis:' },
  'editor.autoSaved': { en: 'Auto-saved', id: 'Otomatis tersimpan' },
  'editor.descriptionWithYears': { en: 'Enter data for {count} historical years ({first}–{last}). Subtotals and totals are calculated automatically during rendering. Data is auto-saved to your device.', id: 'Masukkan data untuk {count} tahun historis ({first}–{last}). Subtotal dan total akan dihitung otomatis saat rendering. Data tersimpan otomatis ke perangkat Anda.' },
  'editor.descriptionNoYears': { en: 'Enter historical data. Data is auto-saved to your device.', id: 'Masukkan data historis. Data tersimpan otomatis ke perangkat Anda.' },

  // ═══════════════════════════════════════════════════════════════════
  // AKSES (LOGIN) PAGE
  // ═══════════════════════════════════════════════════════════════════
  'akses.title': { en: 'KKA Business Valuation II', id: 'KKA Penilaian Bisnis II' },
  'akses.subtitle': { en: 'Built with Prototype from "KKP Saham Irwan Djaja"', id: 'Dibuat dengan Prototipe dari "KKP Saham Irwan Djaja"' },
  'akses.restrictedAccess': { en: 'Restricted Access · For Assessor Officials Only', id: 'Akses Terbatas · Hanya untuk Fungsional Penilai' },
  'akses.privacyLine1': { en: 'All Processes and Data Only Run and Are Stored on Your Device.', id: 'Seluruh Proses dan Data Hanya Berjalan dan Disimpan di Perangkat Anda.' },
  'akses.privacyLine2': { en: 'No Data is Sent or Stored on the Server.', id: 'Tidak Ada Data Apapun yang Dikirim atau Disimpan di Server.' },
  'akses.field.nipLabel': { en: 'Short NIP (Assessor)', id: 'NIP Pendek Penilai' },
  'akses.placeholder.nip': { en: 'Enter your Short NIP', id: 'Masukkan NIP Pendek Anda' },
  'akses.button.login': { en: 'Login', id: 'Masuk' },
  'akses.button.verifying': { en: 'Verifying…', id: 'Memverifikasi…' },
  'akses.error.nipRequired': { en: 'Short NIP is required', id: 'NIP Pendek Wajib Diisi' },
  'akses.error.verifyFailed': { en: 'Failed to Verify Short NIP. Try Again', id: 'Gagal Memverifikasi NIP Pendek. Coba Lagi' },
  'akses.error.networkError': { en: 'Network Error. Try Again', id: 'Terjadi Kesalahan Jaringan. Coba Lagi' },

  // ═══════════════════════════════════════════════════════════════════
  // HOME PAGE
  // ═══════════════════════════════════════════════════════════════════
  'home.section': { en: 'Input Master', id: 'Input Master' },
  'home.title': { en: 'Business Valuation Worksheet', id: 'Kertas Kerja Penilaian Bisnis' },
  'home.privacyNotice': { en: 'All data is stored locally in your browser. No data is sent anywhere.', id: 'Seluruh data disimpan lokal di browser Anda. Tidak ada data yang dikirim ke manapun.' },
  'home.field.namaObjekPajak': { en: 'Tax Object Name', id: 'Nama Objek Pajak' },
  'home.placeholder.namaPerusahaan': { en: 'PT Example Corp', id: 'PT Contoh Sejahtera' },
  'home.field.npwp': { en: 'NPWP', id: 'NPWP' },
  'home.placeholder.npwp': { en: '01.234.567.8-901.000', id: '01.234.567.8-901.000' },
  'home.field.namaSubjekPajak': { en: 'Taxpayer Name', id: 'Nama Subjek Pajak' },
  'home.placeholder.namaSubjekPajak': { en: 'Name of transferring party', id: 'Nama pihak yang mengalihkan' },
  'home.field.npwpSubjekPajak': { en: 'Taxpayer NPWP', id: 'NPWP Subjek Pajak' },
  'home.field.jenisSubjekPajak': { en: 'Taxpayer Type', id: 'Jenis Subjek Pajak' },
  'home.option.orangPribadi': { en: 'Individual', id: 'Orang Pribadi' },
  'home.option.badan': { en: 'Corporate', id: 'Badan' },
  'home.field.jenisInfoPeralihan': { en: 'Transfer Information Type', id: 'Jenis Informasi Peralihan' },
  'home.option.lembarSaham': { en: 'Shares', id: 'Lembar Saham' },
  'home.option.modalDisetor': { en: 'Paid-up Capital', id: 'Modal Disetor' },
  'home.field.jenisPerusahaan': { en: 'Company Type', id: 'Jenis Perusahaan' },
  'home.option.tertutup': { en: 'Private (Closed)', id: 'Tertutup (Private)' },
  'home.option.terbuka': { en: 'Public (Listed)', id: 'Terbuka (Public)' },
  'home.field.objekPenilaian': { en: 'Valuation Object', id: 'Objek Penilaian' },
  'home.option.saham': { en: 'Shares', id: 'Saham' },
  'home.option.bisnis': { en: 'Business (Entire)', id: 'Bisnis (Seluruh)' },
  'home.field.jumlahBeredar': { en: 'Outstanding Shares', id: 'Jumlah Saham Beredar' },
  'home.field.jumlahModalDisetor': { en: '100% Paid-up Capital', id: 'Jumlah Modal Disetor 100%' },
  'home.field.jumlahDinilai': { en: 'Shares Valued', id: 'Jumlah Saham yang Dinilai' },
  'home.field.jumlahModalDinilai': { en: 'Paid-up Capital Valued', id: 'Jumlah Modal Disetor yang Dinilai' },
  'home.field.nilaiNominal': { en: 'Par Value Per Share (Rp)', id: 'Nilai Nominal Per Saham (Rp)' },
  'home.hint.nilaiNominal': { en: 'Required for AAM and EEM methods. If unknown, use Rp 1.', id: 'Diperlukan untuk metode AAM dan EEM. Jika tidak diketahui, gunakan Rp 1.' },
  'home.field.tahunTransaksi': { en: 'Share Transfer Transaction Year', id: 'Tahun Transaksi Pengalihan Saham' },
  'home.derived.header': { en: 'Derived Values (Automatic)', id: 'Nilai Turunan (Otomatis)' },
  'home.derived.proporsiSaham': { en: 'Proportion of Shares Valued', id: 'Proporsi Saham yang Dinilai' },
  'home.derived.proporsiModal': { en: 'Proportion of Paid-up Capital Valued', id: 'Proporsi Modal Disetor yang Dinilai' },
  'home.derived.cutOffDate': { en: 'Cut-off Date', id: 'Cut-off Date' },
  'home.derived.akhirProyeksi': { en: 'End of Projection Period 1', id: 'Akhir Periode Proyeksi 1' },
  'home.resetTitle': { en: 'Reset HOME Data', id: 'Reset Data HOME' },
  'home.resetMessage': { en: 'Are you sure you want to reset HOME data? Other page data will remain.', id: 'Yakin ingin mereset data HOME? Data halaman lain akan tetap ada.' },
  'home.resetConfirm': { en: 'Reset HOME', id: 'Reset HOME' },

  // ═══════════════════════════════════════════════════════════════════
  // QUESTIONNAIRE (DLOM / DLOC)
  // ═══════════════════════════════════════════════════════════════════
  'questionnaire.factorLabel': { en: 'Factor', id: 'Faktor' },
  'questionnaire.companyType': { en: 'Company Type:', id: 'Jenis Perusahaan:' },
  'questionnaire.ownership': { en: 'Ownership of shares valued:', id: 'Kepemilikan saham yang dinilai:' },
  'questionnaire.ownershipLabel': { en: 'Ownership of Shares Valued', id: 'Kepemilikan Saham yang Dinilai' },
  'questionnaire.option.majority': { en: 'Majority', id: 'Mayoritas' },
  'questionnaire.option.minority': { en: 'Minority', id: 'Minoritas' },
  'questionnaire.ownershipHint': { en: 'Affects percentage range. Source: HOME form.', id: 'Mempengaruhi range persentase. Sumber: form HOME.' },
  'questionnaire.totalScore': { en: 'Total Score', id: 'Total Skor' },
  'questionnaire.rangeLabel': { en: 'Applicable Range', id: 'Range Berlaku' },
  'questionnaire.factorsFilled': { en: 'Factors Filled', id: 'Faktor Terisi' },
  'questionnaire.autoSyncNotice': { en: 'Auto-saved to HOME store and synced to valuation calculations.', id: 'Tersimpan otomatis ke HOME store dan ter-sync ke perhitungan valuasi.' },

  // ═══════════════════════════════════════════════════════════════════
  // DLOM PAGE
  // ═══════════════════════════════════════════════════════════════════
  'dlom.loading': { en: 'Loading DLOM data…', id: 'Memuat data DLOM…' },
  'dlom.title': { en: 'DLOM — Discount for Lack of Marketability', id: 'DLOM — Discount for Lack of Marketability' },
  'dlom.disclaimer': { en: 'Select the best option for each factor. Your scores will determine the DLOM percentage.', id: 'Pilih opsi terbaik untuk setiap faktor. Skor Anda menentukan persentase DLOM.' },
  'dlom.resultLabel': { en: 'DLOM Valuation Object', id: 'DLOM Objek Penilaian' },

  // ═══════════════════════════════════════════════════════════════════
  // DLOC PAGE
  // ═══════════════════════════════════════════════════════════════════
  'dloc.loading': { en: 'Loading DLOC data…', id: 'Memuat data DLOC…' },
  'dloc.title': { en: 'DLOC (PFC) — Premium for Control / Discount for Lack of Control', id: 'DLOC (PFC) — Premium for Control / Discount for Lack of Control' },
  'dloc.disclaimer': { en: 'Select the best option for each factor. Your scores will determine the DLOC percentage.', id: 'Pilih opsi terbaik untuk setiap faktor. Skor Anda menentukan persentase DLOC.' },
  'dloc.resultLabel': { en: 'DLOC Valuation Object', id: 'DLOC Objek Penilaian' },

  // ═══════════════════════════════════════════════════════════════════
  // AAM PAGE
  // ═══════════════════════════════════════════════════════════════════
  'aam.title': { en: 'Adjusted Asset Method (AAM)', id: 'Adjusted Asset Method (AAM)' },
  'aam.subtitle': { en: 'Net Adjusted Asset Method — click a number in the Adjustment (D) column to edit.', id: 'Metode Penyesuaian Aset Bersih — klik angka di kolom Penyesuaian (D) untuk mengedit.' },
  'aam.editAdjustment': { en: 'Click to edit adjustment', id: 'Klik untuk edit penyesuaian' },
  'aam.section.currentAssets': { en: 'CURRENT ASSETS', id: 'AKTIVA LANCAR' },
  'aam.section.nonCurrentAssets': { en: 'NON-CURRENT ASSETS', id: 'AKTIVA TIDAK LANCAR' },
  'aam.section.currentLiabilities': { en: 'CURRENT LIABILITIES', id: 'KEWAJIBAN LANCAR' },
  'aam.section.nonCurrentLiabilities': { en: 'NON-CURRENT LIABILITIES', id: 'KEWAJIBAN JANGKA PANJANG' },
  'aam.section.equity': { en: 'SHAREHOLDERS\' EQUITY', id: 'EKUITAS PEMEGANG SAHAM' },
  'aam.subtotal.currentAssets': { en: 'Total Current Assets', id: 'Total Aset Lancar' },
  'aam.subtotal.nonCurrentAssets': { en: 'Total Non-Current Assets', id: 'Total Aset Tidak Lancar' },
  'aam.subtotal.currentLiabilities': { en: 'Total Current Liabilities', id: 'Total Liabilitas Jangka Pendek' },
  'aam.subtotal.nonCurrentLiabilities': { en: 'Total Non-Current Liabilities', id: 'Total Liabilitas Jangka Panjang' },
  'aam.subtotal.equity': { en: 'Shareholders\' Equity', id: 'Ekuitas Pemegang Saham' },
  'aam.totalAssets': { en: 'TOTAL ASSETS', id: 'TOTAL ASET' },
  'aam.totalLiabilitiesEquity': { en: 'TOTAL LIABILITIES & EQUITY', id: 'TOTAL LIABILITAS & EKUITAS' },
  'aam.fixedAssetNet': { en: 'Fixed Asset Net', id: 'Aset Tetap, Neto' },
  'aam.table.description': { en: 'Description', id: 'Keterangan' },
  'aam.table.historical': { en: 'Historical (C)', id: 'Historis (C)' },
  'aam.table.adjustment': { en: 'Adjustment (D)', id: 'Penyesuaian (D)' },
  'aam.table.adjusted': { en: 'Adjusted (E)', id: 'Disesuaikan (E)' },
  'aam.valuation': { en: 'Valuation', id: 'Valuasi' },
  'aam.netAssetValue': { en: 'Net Asset Value', id: 'Nilai Aset Bersih' },
  'aam.interestBearingDebt': { en: 'Interest Bearing Debt', id: 'Utang Berbunga' },
  'aam.equityValue': { en: 'Equity Value', id: 'Nilai Ekuitas' },
  'aam.equityLessDlom': { en: 'Equity Less DLOM', id: 'Ekuitas Setelah DLOM' },
  'aam.marketValue100': { en: 'Market Value of Equity (100%)', id: 'Nilai Pasar Ekuitas (100%)' },
  'aam.dlomLabel': { en: 'DLOM', id: 'DLOM' },
  'aam.dlocPfcLabel': { en: 'DLOC/PFC', id: 'DLOC/PFC' },
  'aam.marketValuePortion': { en: 'Market Value', id: 'Nilai Pasar' },

  // ═══════════════════════════════════════════════════════════════════
  // DCF PAGE
  // ═══════════════════════════════════════════════════════════════════
  'dcf.title': { en: 'Discounted Cash Flow (DCF)', id: 'Discounted Cash Flow (DCF)' },
  'dcf.subtitle': { en: 'Discounted cash flow method to determine share value.', id: 'Metode arus kas terdiskonto untuk menentukan nilai saham.' },
  'dcf.section.fcf': { en: 'Free Cash Flow', id: 'Arus Kas Bebas' },
  'dcf.section.discounting': { en: 'Discounting', id: 'Diskonto' },
  'dcf.section.terminalValue': { en: 'Terminal Value', id: 'Nilai Terminal' },
  'dcf.section.equityShare': { en: 'Equity → Share Value', id: 'Ekuitas → Nilai Saham' },
  'dcf.totalPvFcf': { en: 'Total PV of FCF', id: 'Total PV dari FCF' },
  'dcf.growthRate': { en: 'Growth Rate', id: 'Tingkat Pertumbuhan' },
  'dcf.terminalValue': { en: 'Terminal Value', id: 'Nilai Terminal' },
  'dcf.pvTerminal': { en: 'PV of Terminal Value', id: 'PV Nilai Terminal' },
  'dcf.enterpriseValue': { en: 'Enterprise Value', id: 'Nilai Perusahaan' },
  'dcf.equityValue100': { en: 'Equity Value (100%)', id: 'Nilai Ekuitas (100%)' },
  'dcf.marketValue100': { en: 'Market Value (100%)', id: 'Nilai Pasar (100%)' },
  'dcf.rounded': { en: 'Rounded', id: 'Pembulatan' },
  'dcf.perShare': { en: 'Value Per Share (DCF)', id: 'Nilai Per Saham (DCF)' },
  'dcf.fcfYearRow': { en: 'FCF ({year})', id: 'FCF ({year})' },
  'dcf.discountFactorYearRow': { en: 'Discount Factor ({year})', id: 'Faktor Diskon ({year})' },
  'dcf.dlomWithPercentRow': { en: 'DLOM ({pct})', id: 'DLOM ({pct})' },
  'dcf.marketValuePortionRow': { en: 'Market Value ({pct} Equity)', id: 'Nilai Pasar ({pct} Ekuitas)' },

  // ═══════════════════════════════════════════════════════════════════
  // EEM PAGE
  // ═══════════════════════════════════════════════════════════════════
  'eem.title': { en: 'Excess Earnings Method (EEM)', id: 'Excess Earnings Method (EEM)' },
  'eem.subtitle': { en: 'Excess earnings capitalization method to determine share value.', id: 'Metode Kapitalisasi Kelebihan Pendapatan untuk menentukan nilai saham.' },
  'eem.section.nta': { en: 'Net Tangible Asset', id: 'Aset Berwujud Bersih' },
  'eem.section.histFcf': { en: 'Historical Free Cash Flow', id: 'Arus Kas Bebas Historis' },
  'eem.section.excessEarning': { en: 'Excess Earning', id: 'Kelebihan Pendapatan' },
  'eem.section.enterpriseEquity': { en: 'Enterprise & Equity Value', id: 'Nilai Perusahaan & Ekuitas' },
  'eem.ntaValue': { en: 'Net Tangible Asset Value', id: 'Nilai Aset Berwujud Bersih' },
  'eem.returnRate': { en: 'Return Rate (Borrowing Cap)', id: 'Tingkat Balikan (Kapasitas Pinjaman)' },
  'eem.earningReturn': { en: 'Earning Return on NTA', id: 'Pendapatan dari NTA' },
  'eem.grossCashFlow': { en: 'Gross Cash Flow', id: 'Arus Kas Bruto' },
  'eem.grossInvestment': { en: 'Gross Investment', id: 'Investasi Bruto' },
  'eem.fcf': { en: 'Free Cash Flow', id: 'Arus Kas Bebas' },
  'eem.excessEarning': { en: 'Excess Earning (FCF - Normal Return)', id: 'Kelebihan Pendapatan (FCF - Return Normal)' },
  'eem.capitalizedExcess': { en: 'Capitalized Excess Earning (/ WACC)', id: 'Kapitalisasi Kelebihan Pendapatan (/ WACC)' },
  'eem.enterpriseValue': { en: 'Enterprise Value (NTA + Capitalized Excess)', id: 'Nilai Perusahaan (NTA + Kapitalisasi Excess)' },
  'eem.equityValue100': { en: 'Equity Value (100%)', id: 'Nilai Ekuitas (100%)' },
  'eem.equityLessDlom': { en: 'Equity Less DLOM', id: 'Ekuitas Setelah DLOM' },
  'eem.marketValue100': { en: 'Market Value (100%)', id: 'Nilai Pasar (100%)' },
  'eem.rounded': { en: 'Rounded (ROUNDUP)', id: 'Pembulatan (ROUNDUP)' },
  'eem.perShare': { en: 'Value Per Share (EEM)', id: 'Nilai Per Saham (EEM)' },

  // ═══════════════════════════════════════════════════════════════════
  // WACC PAGE
  // ═══════════════════════════════════════════════════════════════════
  'wacc.pageTitle': { en: 'WACC — Weighted Average Cost of Capital', id: 'WACC — Weighted Average Cost of Capital' },
  'wacc.subtitle': { en: 'Comparable companies approach to determine WACC.', id: 'Pendekatan perusahaan pembanding untuk menentukan WACC.' },
  'wacc.loading': { en: 'Loading WACC data…', id: 'Memuat data WACC…' },
  'wacc.marketParams': { en: 'Market Parameters', id: 'Parameter Pasar' },
  'wacc.erp': { en: 'Equity Risk Premium', id: 'Equity Risk Premium' },
  'wacc.rbds': { en: 'Rating Based Default Spread', id: 'Rating Based Default Spread' },
  'wacc.riskFree': { en: 'Risk Free (SUN)', id: 'Risk Free (SUN)' },
  'wacc.taxRateHamada': { en: 'Tax Rate (Hamada)', id: 'Tarif Pajak (Hamada)' },
  'wacc.comparableCompanies': { en: 'Comparable Companies', id: 'Perusahaan Pembanding' },
  'wacc.table.companyName': { en: 'Company Name', id: 'Nama Perusahaan' },
  'wacc.companyPlaceholder': { en: 'PT Example, Tbk', id: 'PT Contoh, Tbk' },
  'wacc.removeCompanyAria': { en: 'Remove company {n}', id: 'Hapus perusahaan {n}' },
  'wacc.removeBankAria': { en: 'Remove bank {n}', id: 'Hapus bank {n}' },
  'wacc.table.betaLevered': { en: 'Beta Levered', id: 'Beta Levered' },
  'wacc.table.marketCap': { en: 'Market Cap', id: 'Market Cap' },
  'wacc.table.debt': { en: 'Debt', id: 'Hutang' },
  'wacc.table.betaUnlevered': { en: 'Beta Unlevered', id: 'Beta Unlevered' },
  'wacc.avgTotal': { en: 'Average / Total', id: 'Rata-rata / Total' },
  'wacc.addCompany': { en: '+ Add Company', id: '+ Tambah Perusahaan' },
  'wacc.relleveredBeta': { en: 'Relevered Beta: ', id: 'Relevered Beta: ' },
  'wacc.investmentLoanRate': { en: 'Investment Loan Rate', id: 'Bunga Pinjaman Investasi' },
  'wacc.addBank': { en: '+ Add Bank', id: '+ Tambah Bank' },
  'wacc.avgRate': { en: 'Average Rate: ', id: 'Rata-rata Bunga: ' },
  'wacc.capitalStructure': { en: 'Capital Structure & WACC', id: 'Struktur Kapital & WACC' },
  'wacc.table.component': { en: 'Component', id: 'Komponen' },
  'wacc.table.weight': { en: 'Weight (%)', id: 'Bobot (%)' },
  'wacc.table.costOfCapital': { en: 'Cost of Capital (%)', id: 'Biaya Modal (%)' },
  'wacc.table.waccPercent': { en: 'WACC (%)', id: 'WACC (%)' },
  'wacc.computedLabel': { en: 'WACC (Computed): ', id: 'WACC (Komputasi): ' },
  'wacc.overrideLabel': { en: 'Override WACC (Per Taxpayer)', id: 'Override WACC (Menurut Wajib Pajak)' },
  'wacc.finalLabel': { en: 'WACC Final: ', id: 'WACC Final: ' },

  // ═══════════════════════════════════════════════════════════════════
  // DISCOUNT RATE PAGE
  // ═══════════════════════════════════════════════════════════════════
  'discountRate.pageTitle': { en: 'Discount Rate Analysis (CAPM)', id: 'Analisis Tingkat Diskonto (CAPM)' },
  'discountRate.subtitle': { en: 'Capital Asset Pricing Model — determines WACC for DCF method.', id: 'Capital Asset Pricing Model — menentukan WACC untuk metode DCF.' },
  'discountRate.loading': { en: 'Loading Discount Rate data…', id: 'Memuat data Discount Rate…' },
  'discountRate.capmParams': { en: 'CAPM Parameters', id: 'Parameter CAPM' },
  'discountRate.taxRate': { en: 'Tax Rate', id: 'Tarif Pajak' },
  'discountRate.riskFree': { en: 'Risk Free', id: 'Risk Free' },
  'discountRate.betaLevered': { en: 'Beta (Levered)', id: 'Beta (Levered)' },
  'discountRate.erp': { en: 'Equity Risk Premium', id: 'Equity Risk Premium' },
  'discountRate.countrySpread': { en: 'Country Default Spread', id: 'Country Default Spread' },
  'discountRate.derIndustry': { en: 'DER Industry', id: 'DER Industry' },
  'discountRate.investmentLoanRate': { en: 'Investment Loan Rate', id: 'Bunga Pinjaman Investasi' },
  'discountRate.rateHint': { en: 'Input rate as decimal (e.g. 0.05 = 5%).', id: 'Input rate dalam format angka (misal 0.05 = 5%).' },
  'discountRate.addBank': { en: '+ Add Bank', id: '+ Tambah Bank' },
  'discountRate.avgLabel': { en: 'Average: ', id: 'Rata-rata: ' },
  'discountRate.debtRateLabel': { en: 'Debt Rate (C7): ', id: 'Debt Rate (C7): ' },
  'discountRate.capmResults': { en: 'CAPM Analysis Results', id: 'Hasil Analisis CAPM' },
  'discountRate.result.bu': { en: 'BU (Beta Unlevered)', id: 'BU (Beta Unlevered)' },
  'discountRate.result.bl': { en: 'BL (Beta Levered)', id: 'BL (Beta Levered)' },
  'discountRate.result.ke': { en: 'Ke (Cost of Equity)', id: 'Ke (Cost of Equity)' },
  'discountRate.result.kd': { en: 'Kd (Cost of Debt)', id: 'Kd (Cost of Debt)' },
  'discountRate.table.structure': { en: 'Capital Structure', id: 'Struktur Kapital' },
  'discountRate.table.weight': { en: 'Weight (%)', id: 'Bobot (%)' },
  'discountRate.table.costOfCapital': { en: 'Cost of Capital (%)', id: 'Biaya Modal (%)' },
  'discountRate.table.waccPercent': { en: 'WACC (%)', id: 'WACC (%)' },
  'discountRate.waccLabel': { en: 'Weighted Average Cost of Capital (WACC): ', id: 'Weighted Average Cost of Capital (WACC): ' },
  'discountRate.summary.debtRate': { en: 'Debt Rate', id: 'Debt Rate' },

  // ═══════════════════════════════════════════════════════════════════
  // BORROWING CAP PAGE
  // ═══════════════════════════════════════════════════════════════════
  'borrowingCap.title': { en: 'Rate of Return on Net Tangible Assets', id: 'Tingkat Balikan Aset Berwujud Bersih' },
  'borrowingCap.subtitle': { en: 'Borrowing Capacity — input from CALK (Notes to Financial Statements).', id: 'Kapasitas Pinjaman — input dari CALK (Catatan Atas Laporan Keuangan).' },
  'borrowingCap.sectionBc': { en: 'Borrowing Capacity', id: 'Kapasitas Pinjaman' },
  'borrowingCap.table.assetType': { en: 'Asset Type', id: 'Jenis Aktiva' },
  'borrowingCap.table.amount': { en: 'Amount (CALK)', id: 'Jumlah (CALK)' },
  'borrowingCap.table.borrowingPct': { en: 'Borrowing %', id: 'Borrowing %' },
  'borrowingCap.table.capacity': { en: 'Borrowing Capacity', id: 'Kapasitas Pinjaman' },
  'borrowingCap.receivables': { en: 'Receivables', id: 'Piutang' },
  'borrowingCap.inventory': { en: 'Inventory', id: 'Persediaan' },
  'borrowingCap.fixedAsset': { en: 'Fixed Assets', id: 'Aktiva Tetap' },
  'borrowingCap.weightedAvgTitle': { en: 'Weighted Average Rate of Return', id: 'Tingkat Balikan Rata-rata Tertimbang' },
  'borrowingCap.table2.capitalType': { en: 'Capital Type', id: 'Jenis Modal' },
  'borrowingCap.table2.costOfCapital': { en: 'Cost of Capital', id: 'Biaya Modal' },
  'borrowingCap.table2.weight': { en: 'Weight', id: 'Bobot' },
  'borrowingCap.table2.weightedCost': { en: 'Weighted Cost of Capital', id: 'Biaya Modal Tertimbang' },

  // ═══════════════════════════════════════════════════════════════════
  // CFI PAGE
  // ═══════════════════════════════════════════════════════════════════
  'cfi.title': { en: 'Cash Flow to Investor (CFI)', id: 'Cash Flow to Investor (CFI)' },
  'cfi.subtitle': { en: 'Cash flow available to investors from historical and projected FCF.', id: 'Arus kas yang tersedia untuk investor dari FCF historis dan proyeksi.' },
  'cfi.row.fcf': { en: 'Free Cash Flow', id: 'Arus Kas Bebas' },
  'cfi.row.addNonOp': { en: 'Add: Cash Flow from Non Operational', id: 'Tambah: Arus Kas Non Operasional' },
  'cfi.row.cfiTotal': { en: 'Cash Flow Available to Investor', id: 'Arus Kas Tersedia untuk Investor' },

  // ═══════════════════════════════════════════════════════════════════
  // SIMULASI POTENSI PAGE
  // ═══════════════════════════════════════════════════════════════════
  'simulasi.title': { en: 'Potential Tax Simulation', id: 'Simulasi Potensi PPh' },
  'simulasi.subtitle': { en: 'Simulation of potential income tax underpayment from share transfer.', id: 'Simulasi potensi Pajak Penghasilan kurang bayar dari pengalihan saham.' },
  'simulasi.methodLabel': { en: 'Valuation Method', id: 'Metode Valuasi' },
  'simulasi.method.aam': { en: 'AAM (Adjusted Asset Method)', id: 'AAM (Adjusted Asset Method)' },
  'simulasi.method.dcf': { en: 'DCF (Discounted Cash Flow)', id: 'DCF (Discounted Cash Flow)' },
  'simulasi.method.eem': { en: 'EEM (Excess Earnings Method)', id: 'EEM (Excess Earnings Method)' },
  'simulasi.dataIncomplete': { en: ' — data incomplete', id: ' — data belum lengkap' },
  'simulasi.nilaiPengalihanLabel': { en: 'Reported Transfer Value (Rp)', id: 'Nilai Pengalihan yang Dilaporkan (Rp)' },
  'simulasi.table.method': { en: 'Method', id: 'Metode' },
  'simulasi.table.equityValue': { en: 'Equity Value (100%)', id: 'Equity Value (100%)' },
  'simulasi.active': { en: '● active', id: '● aktif' },
  'simulasi.equityLessDlom': { en: 'Equity Less DLOM', id: 'Ekuitas Setelah DLOM' },
  'simulasi.dlocWithPercentRow': { en: 'DLOC/PFC ({pct})', id: 'DLOC/PFC ({pct})' },
  'simulasi.proporsiSahamRow': { en: 'Share Proportion ({pct})', id: 'Proporsi Saham ({pct})' },
  'simulasi.resistensiWp': { en: 'Taxpayer Resistance', id: 'Resistensi WP' },
  'simulasi.mvEquity100': { en: 'Market Value of Equity (100%)', id: 'Nilai Pasar Ekuitas (100%)' },
  'simulasi.nilaiPengalihanDilaporkan': { en: 'Reported Transfer Value', id: 'Nilai Pengalihan Dilaporkan' },
  'simulasi.potensiPengalihan': { en: 'Potential Untaxed Transfer', id: 'Potensi Pengalihan Belum Dikenakan Pajak' },
  'simulasi.pphProgressive': { en: 'Income Tax Art. 17 — Progressive Rate', id: 'PPh Pasal 17 — Tarif Progresif' },
  'simulasi.totalPPh': { en: 'Total Potential Tax Underpayment', id: 'Total Potensi PPh Kurang Bayar' },
  'simulasi.methodNotAvailable': { en: 'data not yet available. Complete the required inputs.', id: 'data belum tersedia. Lengkapi input yang diperlukan.' },

  // ═══════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════════════
  'dashboard.section': { en: 'SUMMARY', id: 'RINGKASAN' },
  'dashboard.title': { en: 'Dashboard', id: 'Dashboard' },
  'dashboard.heading': { en: 'Dashboard', id: 'Dashboard' },
  'dashboard.subtitle': { en: 'Visual summary of financial analysis and valuation results.', id: 'Ringkasan visual analisis keuangan dan hasil penilaian.' },
  'dashboard.chart.revenueNetIncome': { en: 'Revenue & Net Income', id: 'Pendapatan & Laba Bersih' },
  'dashboard.chart.balanceComposition': { en: 'Balance Sheet Composition', id: 'Komposisi Neraca' },
  'dashboard.chart.valuationComparison': { en: 'Value Per Share Comparison', id: 'Perbandingan Nilai Per Saham' },
  'dashboard.chart.fcf': { en: 'Free Cash Flow', id: 'Arus Kas Bebas' },
  'dashboard.chart.perShareLabel': { en: 'Per Share (Rp)', id: 'Per Saham (Rp)' },
  'dashboard.chart.noValuation': { en: 'No valuation data available.', id: 'Belum ada data valuasi.' },
  'dashboard.chart.noFcf': { en: 'No FCF data available.', id: 'Belum ada data FCF.' },
  'dashboard.legend.revenue': { en: 'Revenue', id: 'Pendapatan' },
  'dashboard.legend.netIncome': { en: 'Net Income', id: 'Laba Bersih' },
  'dashboard.legend.totalAssets': { en: 'Total Assets', id: 'Total Aset' },
  'dashboard.legend.totalLiabilities': { en: 'Total Liabilities', id: 'Total Liabilitas' },
  'dashboard.legend.totalEquity': { en: 'Total Equity', id: 'Total Ekuitas' },

  // ═══════════════════════════════════════════════════════════════════
  // KEY DRIVERS PAGE
  // ═══════════════════════════════════════════════════════════════════
  'keyDrivers.pageTitle': { en: 'Key Drivers — Projection Assumptions', id: 'Key Drivers — Asumsi Proyeksi' },
  'keyDrivers.subtitle': { en: 'Assumptions used for financial performance projections. Changes are auto-saved.', id: 'Asumsi-asumsi yang digunakan untuk proyeksi kinerja keuangan. Perubahan otomatis tersimpan.' },
  'keyDrivers.financialDrivers': { en: 'Financial Drivers', id: 'Driver Keuangan' },
  'keyDrivers.field.interestRateST': { en: 'Interest Rate (Short Term Loan)', id: 'Suku Bunga (Pinjaman Jangka Pendek)' },
  'keyDrivers.field.interestRateLT': { en: 'Interest Rate (Long Term Loan)', id: 'Suku Bunga (Pinjaman Jangka Panjang)' },
  'keyDrivers.field.depositRate': { en: 'Bank Deposit Rate', id: 'Suku Bunga Deposito' },
  'keyDrivers.field.taxRate': { en: 'Corporate Tax Rate', id: 'Tarif Pajak Badan' },
  'keyDrivers.operationalDrivers': { en: 'Operational Drivers', id: 'Driver Operasional' },
  'keyDrivers.salesVolume': { en: 'Sales Volume (unit)', id: 'Volume Penjualan (unit)' },
  'keyDrivers.salesPrice': { en: 'Sales Price (IDR/unit)', id: 'Harga Jual (IDR/unit)' },
  'keyDrivers.volume': { en: 'Volume', id: 'Volume' },
  'keyDrivers.increment': { en: 'Increment', id: 'Kenaikan' },
  'keyDrivers.price': { en: 'Price', id: 'Harga' },
  'keyDrivers.costRatios': { en: 'Cost & Expense Ratios (% of Revenue)', id: 'Rasio Biaya (% dari Pendapatan)' },
  'keyDrivers.costRatiosHint': { en: 'Input as positive numbers. Ratios will be applied to projected revenue.', id: 'Input sebagai angka positif. Rasio akan diterapkan ke pendapatan proyeksi.' },
  'keyDrivers.field.cogs': { en: 'COGS (% of Revenue)', id: 'HPP (% dari Pendapatan)' },
  'keyDrivers.field.sellingExp': { en: 'Selling Expense (% of Revenue)', id: 'Beban Penjualan (% dari Pendapatan)' },
  'keyDrivers.field.gaExp': { en: 'G&A Expense (% of Revenue)', id: 'Beban Umum & Admin (% dari Pendapatan)' },
  'keyDrivers.bsDrivers': { en: 'Balance Sheet Drivers (Working Capital Days)', id: 'Driver Neraca (Hari Modal Kerja)' },
  'keyDrivers.field.arDays': { en: 'Acc. Receivable (days)', id: 'Piutang Usaha (hari)' },
  'keyDrivers.field.invDays': { en: 'Inventory (days)', id: 'Persediaan (hari)' },
  'keyDrivers.field.apDays': { en: 'Acc. Payable (days)', id: 'Utang Usaha (hari)' },
  'keyDrivers.additionalCapex': { en: 'Additional Capex', id: 'Capex Tambahan' },
  'keyDrivers.capex.land': { en: 'Land', id: 'Tanah' },
  'keyDrivers.capex.building': { en: 'Building', id: 'Bangunan' },
  'keyDrivers.capex.equipment': { en: 'Equipment', id: 'Peralatan' },
  'keyDrivers.capex.others': { en: 'Others', id: 'Lainnya' },

  // ═══════════════════════════════════════════════════════════════════
  // ACC PAYABLES PAGE
  // ═══════════════════════════════════════════════════════════════════
  'accPayables.title': { en: 'Acc Payables', id: 'Utang Usaha' },
  'accPayables.subtitle': { en: 'Bank Loan Schedules', id: 'Jadwal Pinjaman Bank' },
  'accPayables.shortTerm': { en: 'Short-Term Bank Loan', id: 'Pinjaman Bank Jangka Pendek' },
  'accPayables.longTerm': { en: 'Long-Term Bank Loan', id: 'Pinjaman Bank Jangka Panjang' },
  'accPayables.footerNote': { en: 'Bank loan data is used by Cash Flow Statement, NOPLAT, and projection pages for interest and principal calculations.', id: 'Data hutang bank digunakan oleh Laporan Arus Kas, NOPLAT, dan halaman proyeksi untuk perhitungan bunga dan pokok.' },
  'accPayables.row.beginning': { en: 'Beginning', id: 'Saldo Awal' },
  'accPayables.row.addition': { en: 'Addition', id: 'Penambahan' },
  'accPayables.row.repayment': { en: 'Repayment', id: 'Pembayaran' },
  'accPayables.row.ending': { en: 'Ending', id: 'Saldo Akhir' },
  'accPayables.row.interestPayable': { en: 'Interest Payable', id: 'Bunga Dibayar' },

  // ═══════════════════════════════════════════════════════════════════
  // GROWTH RATE PAGE
  // ═══════════════════════════════════════════════════════════════════
  'growthRate.title': { en: 'Growth Rate', id: 'Tingkat Pertumbuhan' },
  'growthRate.subtitle': { en: 'Net Investment / Invested Capital — derived from BS and FA data.', id: 'Investasi Bersih / Modal Investasi — diturunkan dari data Neraca dan Aset Tetap.' },
  'growthRate.row.netFA': { en: 'Net Fixed Assets at End of Year', id: 'Aset Tetap Bersih Akhir Tahun' },
  'growthRate.row.netCA': { en: 'Net Current Assets at End of Year', id: 'Aset Lancar Bersih Akhir Tahun' },
  'growthRate.row.lessNetFABeg': { en: 'Less: Net Fixed Assets at Beginning of Year', id: 'Kurang: Aset Tetap Bersih Awal Tahun' },
  'growthRate.row.lessNetCABeg': { en: 'Less: Net Current Assets at Beginning of Year', id: 'Kurang: Aset Lancar Bersih Awal Tahun' },
  'growthRate.row.totalNetInvestment': { en: 'Total Net Investment', id: 'Total Investasi Bersih' },
  'growthRate.row.totalIC': { en: 'Total Invested Capital at Beginning of Year', id: 'Total Modal Investasi Awal Tahun' },
  'growthRate.row.growthRate': { en: 'Growth Rate', id: 'Tingkat Pertumbuhan' },
  'growthRate.average': { en: 'Average Growth Rate', id: 'Rata-rata Tingkat Pertumbuhan' },

  // ═══════════════════════════════════════════════════════════════════
  // PROJECTION PAGES
  // ═══════════════════════════════════════════════════════════════════
  'proyLR.title': { en: 'Projected P&L', id: 'Proy. Laba Rugi' },
  'proyLR.subtitle': { en: 'Projected income statement based on Key Drivers assumptions.', id: 'Proyeksi laporan laba rugi berdasarkan asumsi Key Drivers.' },
  'proyFA.title': { en: 'Projected Fixed Asset', id: 'Proy. Aset Tetap' },
  'proyFA.subtitle': { en: 'Fixed asset projection based on historical growth rates.', id: 'Proyeksi aset tetap berdasarkan tingkat pertumbuhan historis.' },
  'proyBS.title': { en: 'Projected Balance Sheet', id: 'Proy. Neraca' },
  'proyBS.subtitle': { en: 'Projected balance sheet based on average historical growth.', id: 'Proyeksi neraca berdasarkan rata-rata pertumbuhan historis.' },
  'proyNoplat.title': { en: 'Projected NOPLAT', id: 'Proy. NOPLAT' },
  'proyNoplat.subtitle': { en: 'Projected NOPLAT (Net Operating Profit Less Adjusted Taxes).', id: 'Proyeksi NOPLAT (Net Operating Profit Less Adjusted Taxes).' },
  'proyCF.title': { en: 'Projected Cash Flow', id: 'Proy. Arus Kas' },
  'proyCF.subtitle': { en: 'Projected cash flow from Proy. P&L, Proy. Balance Sheet, and Proy. Fixed Asset.', id: 'Proyeksi arus kas dari Proy. L/R, Proy. Neraca, dan Proy. Aset Tetap.' },

  // Projection row labels
  'proy.revenue': { en: 'Revenue', id: 'Pendapatan' },
  'proy.cogs': { en: 'Cost of Goods Sold', id: 'Harga Pokok Penjualan' },
  'proy.grossProfit': { en: 'Gross Profit', id: 'Laba Kotor' },
  'proy.grossMargin': { en: 'Gross Profit Margin', id: 'Margin Laba Kotor' },
  'proy.sellingOpEx': { en: 'Selling/Others OpEx', id: 'Beban Penjualan/Lainnya' },
  'proy.gaAdmin': { en: 'General & Admin', id: 'Umum & Admin' },
  'proy.totalOpEx': { en: 'Total Operating Expenses', id: 'Total Beban Operasi' },
  'proy.ebitda': { en: 'EBITDA', id: 'EBITDA' },
  'proy.ebitdaMargin': { en: 'EBITDA Margin', id: 'Margin EBITDA' },
  'proy.depreciation': { en: 'Depreciation', id: 'Penyusutan' },
  'proy.ebit': { en: 'EBIT', id: 'EBIT' },
  'proy.ebitMargin': { en: 'EBIT Margin', id: 'Margin EBIT' },
  'proy.interestIncome': { en: 'Interest Income', id: 'Pendapatan Bunga' },
  'proy.interestExpense': { en: 'Interest Expense', id: 'Beban Bunga' },
  'proy.otherIncome': { en: 'Other Income/(Charges)', id: 'Pendapatan/(Beban) Lainnya' },
  'proy.nonOpIncome': { en: 'Non Operating Income', id: 'Pendapatan Non Operasional' },
  'proy.pbt': { en: 'Profit Before Tax', id: 'Laba Sebelum Pajak' },
  'proy.tax': { en: 'Corporate Tax', id: 'Pajak Badan' },
  'proy.netProfit': { en: 'Net Profit After Tax', id: 'Laba Bersih Setelah Pajak' },
  'proy.netMargin': { en: 'Net Profit Margin', id: 'Margin Laba Bersih' },

  // Proy FA specific
  'proyFA.acquisitionCost': { en: 'Acquisition Cost', id: 'Harga Perolehan' },
  'proyFA.accDepreciation': { en: 'Depreciation', id: 'Penyusutan' },
  'proyFA.netValue': { en: 'Net Value Fixed Assets', id: 'Nilai Bersih Aset Tetap' },
  'proyFA.beginning': { en: 'Beginning', id: 'Saldo Awal' },
  'proyFA.additions': { en: 'Additions', id: 'Penambahan' },
  'proyFA.ending': { en: 'Ending', id: 'Saldo Akhir' },
  'proyFA.category.land': { en: 'Land', id: 'Tanah' },
  'proyFA.category.building': { en: 'Building & CIP', id: 'Bangunan & BDP' },
  'proyFA.category.equipment': { en: 'Equipment, Lab & Machinery', id: 'Peralatan, Lab & Mesin' },
  'proyFA.category.vehicle': { en: 'Vehicle & Heavy Equip.', id: 'Kendaraan & Alat Berat' },
  'proyFA.category.office': { en: 'Office Inventory', id: 'Inventaris Kantor' },
  'proyFA.category.electrical': { en: 'Electrical', id: 'Listrik' },

  // Proy BS specific
  'proyBS.row.cashOnHands': { en: 'Cash on Hands', id: 'Kas' },
  'proyBS.row.growth': { en: 'Growth', id: 'Pertumbuhan' },
  'proyBS.row.cashInBanks': { en: 'Cash in Banks', id: 'Bank' },
  'proyBS.row.accountReceivable': { en: 'Account Receivable', id: 'Piutang Usaha' },
  'proyBS.row.otherReceivable': { en: 'Other Receivable', id: 'Piutang Lainnya' },
  'proyBS.row.inventory': { en: 'Inventory', id: 'Persediaan' },
  'proyBS.row.others': { en: 'Others', id: 'Lainnya' },
  'proyBS.row.totalCurrentAssets': { en: 'Total Current Assets', id: 'Total Aset Lancar' },
  'proyBS.row.faBeginning': { en: 'Fixed Assets (Beginning)', id: 'Aset Tetap (Awal)' },
  'proyBS.row.accDepreciation': { en: 'Accumulated Depreciation', id: 'Akumulasi Penyusutan' },
  'proyBS.row.faNet': { en: 'Fixed Assets, Net', id: 'Aset Tetap, Neto' },
  'proyBS.row.otherNCA': { en: 'Other Non-Current Asset', id: 'Aset Tidak Lancar Lainnya' },
  'proyBS.row.intangible': { en: 'Intangible Assets', id: 'Aset Tak Berwujud' },
  'proyBS.row.totalNCA': { en: 'Total Non-Current Assets', id: 'Total Aset Tidak Lancar' },
  'proyBS.row.totalAssets': { en: 'TOTAL ASSETS', id: 'TOTAL ASET' },
  'proyBS.row.bankLoanST': { en: 'Bank Loan — Short Term', id: 'Pinjaman Bank — Jangka Pendek' },
  'proyBS.row.accountPayables': { en: 'Account Payables', id: 'Utang Usaha' },
  'proyBS.row.taxPayable': { en: 'Tax Payable', id: 'Utang Pajak' },
  'proyBS.row.totalCL': { en: 'Total Current Liabilities', id: 'Total Liabilitas Jangka Pendek' },
  'proyBS.row.bankLoanLT': { en: 'Bank Loan — Long Term', id: 'Pinjaman Bank — Jangka Panjang' },
  'proyBS.row.otherNCL': { en: 'Other Non-Current Liabilities', id: 'Liabilitas Tidak Lancar Lainnya' },
  'proyBS.row.totalNCL': { en: 'Total Non-Current Liabilities', id: 'Total Liabilitas Jangka Panjang' },
  'proyBS.row.paidUpCapital': { en: 'Paid-Up Capital', id: 'Modal Disetor' },
  'proyBS.row.surplus': { en: 'Surplus', id: 'Surplus' },
  'proyBS.row.currentProfit': { en: 'Current Profit', id: 'Laba Tahun Berjalan' },
  'proyBS.row.retainedEarnings': { en: 'Retained Earnings', id: 'Laba Ditahan' },
  'proyBS.row.shareholdersEquity': { en: "Shareholders' Equity", id: 'Ekuitas Pemegang Saham' },
  'proyBS.row.totalLE': { en: 'TOTAL LIABILITIES & EQUITY', id: 'TOTAL LIABILITAS & EKUITAS' },
  'proyBS.row.balanceControl': { en: 'Balance Control', id: 'Kontrol Keseimbangan' },
  'proyBS.section.nca': { en: 'Non-Current Assets', id: 'Aset Tidak Lancar' },
  'proyBS.section.liabilities': { en: 'Liabilities', id: 'Liabilitas' },
  'proyBS.section.equity': { en: 'Equity', id: 'Ekuitas' },

  // Proy NOPLAT
  'proyNoplat.row.pbt': { en: 'Profit Before Tax', id: 'Laba Sebelum Pajak' },
  'proyNoplat.row.addInterestExp': { en: 'Add: Interest Expenses', id: 'Tambah: Beban Bunga' },
  'proyNoplat.row.lessInterestInc': { en: 'Less: Interest Income', id: 'Kurang: Pendapatan Bunga' },
  'proyNoplat.row.nonOpIncome': { en: 'Non Operating Income', id: 'Pendapatan Non Operasional' },
  'proyNoplat.row.ebit': { en: 'EBIT', id: 'EBIT' },
  'proyNoplat.row.taxProvision': { en: 'Tax Provision', id: 'Provisi Pajak' },
  'proyNoplat.row.taxShield': { en: 'Tax Shield on Interest Expenses', id: 'Tax Shield atas Beban Bunga' },
  'proyNoplat.row.taxOnInterest': { en: 'Tax on Interest Income', id: 'Pajak atas Pendapatan Bunga' },
  'proyNoplat.row.taxOnNonOp': { en: 'Tax on Non-Operating Income', id: 'Pajak atas Pendapatan Non Operasional' },
  'proyNoplat.row.totalTaxesEBIT': { en: 'Total Taxes on EBIT', id: 'Total Pajak atas EBIT' },
  'proyNoplat.row.noplat': { en: 'NOPLAT', id: 'NOPLAT' },

  // Proy Cash Flow
  'proyCF.row.ebitda': { en: 'EBITDA', id: 'EBITDA' },
  'proyCF.row.corpTax': { en: 'Corporate Tax', id: 'Pajak Badan' },
  'proyCF.row.changesCA': { en: 'Changes in Current Assets', id: 'Perubahan Aset Lancar' },
  'proyCF.row.changesCL': { en: 'Changes in Current Liabilities', id: 'Perubahan Liabilitas Lancar' },
  'proyCF.row.workingCapital': { en: 'Working Capital', id: 'Modal Kerja' },
  'proyCF.section.cfOps': { en: 'Cash Flow from Operations', id: 'Arus Kas Operasi' },
  'proyCF.row.cfOps': { en: 'Cash Flow from Operations', id: 'Arus Kas Operasi' },
  'proyCF.section.nonOps': { en: 'Non-Operations', id: 'Non Operasi' },
  'proyCF.row.cfNonOps': { en: 'Cash Flow from Non-Operations', id: 'Arus Kas Non Operasi' },
  'proyCF.section.investment': { en: 'Investment', id: 'Investasi' },
  'proyCF.row.cfInvestment': { en: 'Cash Flow from Investment (CapEx)', id: 'Arus Kas Investasi (CapEx)' },
  'proyCF.row.cfBeforeFinancing': { en: 'Cash Flow before Financing', id: 'Arus Kas Sebelum Pendanaan' },
  'proyCF.section.financing': { en: 'Financing', id: 'Pendanaan' },
  'proyCF.row.equityInjection': { en: 'Equity Injection', id: 'Injeksi Ekuitas' },
  'proyCF.row.newLoan': { en: 'New Loan', id: 'Pinjaman Baru' },
  'proyCF.row.interestExpense': { en: 'Interest Expense', id: 'Beban Bunga' },
  'proyCF.row.interestIncome': { en: 'Interest Income', id: 'Pendapatan Bunga' },
  'proyCF.row.principalRepayment': { en: 'Principal Repayment', id: 'Pembayaran Pokok' },
  'proyCF.section.cfFinancing': { en: 'Cash Flow from Financing', id: 'Arus Kas Pendanaan' },
  'proyCF.row.cfFinancing': { en: 'Cash Flow from Financing', id: 'Arus Kas Pendanaan' },
  'proyCF.section.netCash': { en: 'Net Cash', id: 'Kas Bersih' },
  'proyCF.row.netCashFlow': { en: 'Net Cash Flow', id: 'Arus Kas Bersih' },
  'proyCF.row.cashBeginning': { en: 'Cash — Beginning Balance', id: 'Kas — Saldo Awal' },
  'proyCF.row.cashEnding': { en: 'Cash — Ending Balance', id: 'Kas — Saldo Akhir' },
  'proyCF.row.cashOnHand': { en: 'Cash on Hand', id: 'Kas' },
  'proyCF.row.cashInBank': { en: 'Cash in Bank', id: 'Bank' },

  // ═══════════════════════════════════════════════════════════════════
  // PLACEHOLDER PAGES
  // ═══════════════════════════════════════════════════════════════════
  'placeholder.comingSoon': { en: 'This page will be implemented in the next development session.', id: 'Halaman ini akan diimplementasikan di sesi pengembangan berikutnya.' },
  'placeholder.analysis.area': { en: 'Analysis', id: 'Analisis' },
  'placeholder.analysis.title': { en: 'Financial Analysis', id: 'Analisis Keuangan' },
  'placeholder.analysis.description': { en: 'Financial Ratio, FCF, NOPLAT, Growth Revenue, ROIC, Growth Rate, Cash Flow Statement', id: 'Rasio Keuangan, FCF, NOPLAT, Pertumbuhan Pendapatan, ROIC, Tingkat Pertumbuhan, Laporan Arus Kas' },
  'placeholder.historical.area': { en: 'Historical', id: 'Historis' },
  'placeholder.historical.title': { en: 'Historical Financial Statements', id: 'Laporan Keuangan Historis' },
  'placeholder.historical.description': { en: 'Balance Sheet, Income Statement, Cash Flow, and Fixed Asset for 4 historical years displayed as interactive financial tables. Data fed from automatic calculation engine.', id: 'Balance Sheet, Income Statement, Cash Flow, dan Fixed Asset untuk 4 tahun historis akan tampil di sini sebagai financial tables interaktif. Data di-feed dari perhitungan otomatis di calculation engine.' },
  'placeholder.projection.area': { en: 'Projection', id: 'Proyeksi' },
  'placeholder.projection.title': { en: 'Financial Projections', id: 'Proyeksi Keuangan' },
  'placeholder.projection.description': { en: 'P&L, Balance Sheet, Cash Flow, Fixed Assets, and NOPLAT projections based on Key Drivers (COGS ratio, expense ratio, tax rate). 3-year forward projection.', id: 'Proyeksi L/R, Balance Sheet, Cash Flow, Fixed Assets, dan NOPLAT berdasarkan Key Drivers (COGS ratio, expense ratio, tax rate). Proyeksi 3 tahun ke depan.' },
  'placeholder.valuation.area': { en: 'Valuation', id: 'Penilaian' },
  'placeholder.valuation.title': { en: 'Valuation Methods', id: 'Metode Penilaian' },
  'placeholder.valuation.description': { en: 'WACC & Discount Rate (CAPM), DCF (FCFF), AAM (Adjusted Asset Method), EEM (Excess Earning Method), Borrowing Capacity, and Dividend Discount Model. Primary output: proportion of shares valued.', id: 'WACC & Discount Rate (CAPM), DCF (FCFF), AAM (Adjusted Asset Method), EEM (Excess Earning Method), Borrowing Capacity, dan Dividend Discount Model. Output utama proporsi saham yang dinilai.' },
} as const

export type TranslationKey = keyof typeof dict
export type TVars = Record<string, string | number>

/**
 * Get translated string for a given key and language. Falls back to English
 * if the key's `id` value is missing. Supports `{name}` placeholder
 * interpolation when `vars` is provided.
 */
export function t(key: TranslationKey, lang: Lang, vars?: TVars): string {
  const entry = dict[key]
  if (!entry) return key
  let result = entry[lang] ?? entry.en
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      result = result.split(`{${k}}`).join(String(v))
    }
  }
  return result
}

/**
 * Create a bound translation function for a given language. The returned
 * function accepts optional vars for placeholder interpolation.
 */
export function createT(
  lang: Lang,
): (key: TranslationKey, vars?: TVars) => string {
  return (key, vars) => t(key, lang, vars)
}

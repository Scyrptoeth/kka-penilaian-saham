# Design — KKA Penilaian Saham

> Kertas Kerja Analisis Penilaian Bisnis/Saham: website interaktif yang menggantikan Excel workbook untuk Fungsional Penilai DJP. Source of truth: `kka-penilaian-saham.xlsx` (34 sheet relevan).

## Problem Statement

Penilai DJP saat ini bekerja dengan Excel workbook kompleks berisi 30 sheet visible + 4 hidden dependency sheet, dengan formula cross-sheet yang padat (dependency chain 4+ level). Excel sebagai medium: (1) rawan error manual, (2) sulit di-share antar penilai, (3) tidak ada validation input, (4) UX buruk untuk navigasi antar sheet, (5) tidak ada formula transparency. Target: website yang menghasilkan output **identik** dengan Excel, tapi dengan UX superior, privasi 100% client-side, dan auto-save via LocalStorage.

## Chosen Approach

Next.js 15 App Router dengan Server Components sebagai default. Calculation engine sebagai **pure TypeScript functions** yang testable (TDD dengan fixtures extracted dari Excel asli). State management via Zustand + persist middleware (LocalStorage). Export ke .xlsx via ExcelJS (client-side, MIT, zero known vulnerabilities). Ground truth untuk test di-extract via Python openpyxl script sekali di awal, hasil JSON di-commit sebagai fixtures.

## Key Technical Decisions

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Framework | Next.js 15 App Router | Latest stable, SSG-friendly, skill-mandated |
| Language | TypeScript strict | Non-negotiable untuk financial calc |
| Testing | Vitest + Testing Library + jsdom | Faster than Jest, native ESM, first-class TS |
| State | Zustand + persist middleware | Lightweight, LocalStorage built-in |
| Forms | react-hook-form + zod | Type-safe validation, industry-standard |
| Charts | Recharts | Server-component-friendly |
| Excel export | ExcelJS (bukan SheetJS) | Zero known vulnerabilities (SheetJS npm ada 2 high-severity) |
| Excel ground truth | Python openpyxl → JSON fixtures | One-shot extraction, formula preserved, committed fixtures |
| Fonts | IBM Plex Sans + IBM Plex Mono | Institutional, tabular-figures, bukan tren default (Inter/Roboto dihindari) |
| Palette | Navy base + muted gold accent | Trust/finance character, DJP-adjacent |
| Package mgr | npm | User preference |

## Design Character

**Product character**: Authoritative institutional financial tool — "Bloomberg Terminal meets Stripe Dashboard". Internal DJP tool, bukan consumer-facing.

**Typography**:
- `IBM Plex Sans` — UI, headings, labels (tabular-figures native)
- `IBM Plex Mono` — semua angka di tabel keuangan
- Body min 16px, heading tight tracking, tabular-nums untuk financial data

**Palette (CSS variables)**:
```
--bg:        #fafaf9  (warm off-white)
--bg-dark:   #0a0a0a
--ink:       #0a1628  (deep navy)
--ink-soft:  #1e293b
--accent:    #b8860b  (muted gold)
--positive:  #15803d  (emerald-700)
--negative:  #b91c1c  (red-700)
--grid:      #e7e5e4  (stone-200)
--muted:     #78716c  (stone-500)
```

**Spatial**:
- 8px base unit untuk semua spacing
- Sidebar navigation (250px) + main content data-dense
- Sticky table headers, alternating rows subtle, right-aligned numbers
- Border-radius konsisten 4px (tajam, tidak rounded-2xl)
- Negative numbers dalam parentheses (akuntansi convention)

**Motion**: Minimal. 150ms micro-interactions, 250ms navigation. Hanya `transform` dan `opacity`. `prefers-reduced-motion` respected.

## Out of Scope (This Session)

- Implementasi semua 30 sheet (hanya scaffold routes + 2 calculation modules terverifikasi)
- Export .xlsx functional (scaffold lib saja, implementasi full di sesi berikut)
- Dashboard charts (skeleton saja)
- Projection sheets (PROY LR, PROY BALANCE SHEET, dll.)
- Valuation methods (DCF, WACC, AAM, EEM)
- Custom theme showcase / artifacts builder
- Deploy ke Vercel
- Dark mode toggle (single theme dulu)
- Mobile optimization detail (responsive baseline saja)

## Non-Negotiables

1. **Kalkulasi identik dengan Excel** — setiap calculation function wajib punya test yang membandingkan output dengan fixture ground truth dari xlsx asli
2. **Privacy-first** — zero network calls untuk data user, semua di client + LocalStorage
3. **No telemetry, no tracking, no login**
4. **Zero build warnings, zero lint errors, zero type errors** saat verify

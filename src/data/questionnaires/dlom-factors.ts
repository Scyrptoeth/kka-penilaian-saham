/**
 * DLOM factor catalogue — 10 factors, each with 3 options scored 0 / 0.5 / 1.
 *
 * Sourced from `DLOM!B7..G25` in the reference workbook. Option pertama
 * (score 0) selalu kondisi paling positif (DLOM rendah → discount kecil).
 * Option ketiga (score 1) selalu kondisi paling negatif (DLOM tinggi).
 *
 * Each factor's `description` is the verbatim question rendered to Penilai
 * DJP, including parenthetical option hints.
 */

import type { QuestionnaireFactor } from '@/types/questionnaire'

export const DLOM_FACTORS: readonly QuestionnaireFactor[] = [
  {
    number: 1,
    label: 'Entry Barier — Perijinan Usaha',
    description:
      'Apakah terdapat hambatan perijinan usaha yang menyulitkan kompetitor baru memasuki industri perusahaan? (Ada / Terbatas / Tidak Ada)',
    options: [
      { label: 'Ada', score: 0 },
      { label: 'Terbatas', score: 0.5 },
      { label: 'Tidak Ada', score: 1 },
    ],
  },
  {
    number: 2,
    label: 'Entry Barier — Skala Ekonomis Usaha',
    description:
      'Apakah skala ekonomis usaha yang dibutuhkan untuk masuk ke industri perusahaan tinggi? (Tidak Terbatas / Segmen Tertentu / Skala Besar)',
    options: [
      { label: 'Tidak Terbatas', score: 0 },
      { label: 'Segmen Tertentu', score: 0.5 },
      { label: 'Skala Besar', score: 1 },
    ],
  },
  {
    number: 3,
    label: 'Dividen',
    description:
      'Apakah perusahaan secara konsisten membagikan dividen kepada pemegang saham? (Ya / Kadang-kadang / Tidak Ada)',
    options: [
      { label: 'Ya', score: 0 },
      { label: 'Kadang-kadang', score: 0.5 },
      { label: 'Tidak Ada', score: 1 },
    ],
  },
  {
    number: 4,
    label: 'Profitabilitas (EBITDA)',
    description:
      'Bagaimana profitabilitas EBITDA perusahaan dibandingkan dengan rata-rata industri? (Diatas / Rata-rata / Dibawah)',
    options: [
      { label: 'Diatas', score: 0 },
      { label: 'Rata-rata', score: 0.5 },
      { label: 'Dibawah', score: 1 },
    ],
  },
  {
    number: 5,
    label: 'Fluktuasi Laba Bersih',
    description:
      'Bagaimana stabilitas laba bersih perusahaan? (Tidak fluktuatif & meningkat / Sedang & stabil / Ya, fluktuatif & menurun)',
    options: [
      { label: 'Tidak, Meningkat', score: 0 },
      { label: 'Sedang, Stabil', score: 0.5 },
      { label: 'Ya, Menurun', score: 1 },
    ],
  },
  {
    number: 6,
    label: 'Struktur Permodalan',
    description:
      'Bagaimana rasio leverage perusahaan dibandingkan rata-rata industri? (Dibawah / Rata-rata / Diatas)',
    options: [
      { label: 'Dibawah', score: 0 },
      { label: 'Rata-rata', score: 0.5 },
      { label: 'Diatas', score: 1 },
    ],
  },
  {
    number: 7,
    label: 'Liquiditas',
    description:
      'Bagaimana posisi likuiditas perusahaan dibandingkan rata-rata industri? (Diatas / Rata-rata / Dibawah)',
    options: [
      { label: 'Diatas', score: 0 },
      { label: 'Rata-rata', score: 0.5 },
      { label: 'Dibawah', score: 1 },
    ],
  },
  {
    number: 8,
    label: 'Pertumbuhan Penjualan',
    description:
      'Bagaimana pertumbuhan penjualan perusahaan dibandingkan industri? (Lebih Besar / Rata-rata / Lebih Kecil)',
    options: [
      { label: 'Lebih Besar', score: 0 },
      { label: 'Rata-rata', score: 0.5 },
      { label: 'Lebih Kecil', score: 1 },
    ],
  },
  {
    number: 9,
    label: 'Prospek Perusahaan dan Industri',
    description:
      'Bagaimana prospek perusahaan dan industri ke depan? (Meningkat / Seperti Saat Ini / Menurun)',
    options: [
      { label: 'Meningkat', score: 0 },
      { label: 'Seperti Saat Ini', score: 0.5 },
      { label: 'Menurun', score: 1 },
    ],
  },
  {
    number: 10,
    label: 'Kualitas Manajemen',
    description:
      'Apakah kualitas manajemen perusahaan dapat di-andalkan? (Ya / Seperti Saat Ini / Tidak)',
    options: [
      { label: 'Ya', score: 0 },
      { label: 'Seperti Saat Ini', score: 0.5 },
      { label: 'Tidak', score: 1 },
    ],
  },
] as const

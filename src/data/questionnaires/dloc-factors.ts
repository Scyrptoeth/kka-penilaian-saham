/**
 * DLOC (Premium for Control / PFC) factor catalogue — 5 factors.
 *
 * Sourced from `DLOC(PFC)!A7..F15`. Factor 1 unik karena binary
 * (Ada / Tidak Ada → 0 / 1), 4 faktor lainnya mengikuti pola
 * 3-opsi standar (0 / 0.5 / 1).
 */

import type { QuestionnaireFactor } from '@/types/questionnaire'

export const DLOC_FACTORS: readonly QuestionnaireFactor[] = [
  {
    number: 1,
    label: 'Perjanjian antara Pemegang Saham',
    description:
      'Apakah terdapat perjanjian dari pemegang saham yang mengatur posisi dalam susunan manajemen, bagi hasil, atau hak veto? (Ada → premium rendah / Tidak Ada → premium tinggi)',
    options: [
      { label: 'Ada', score: 0 },
      { label: 'Tidak Ada', score: 1 },
    ],
  },
  {
    number: 2,
    label: 'Kerugian Saham Minoritas',
    description:
      'Besarnya kerugian pemegang saham minoritas dari perusahaan tertutup apabila dibandingkan dengan pemegang saham mayoritas? (Rendah / Sedang / Tinggi)',
    options: [
      { label: 'Rendah', score: 0 },
      { label: 'Sedang', score: 0.5 },
      { label: 'Tinggi', score: 1 },
    ],
  },
  {
    number: 3,
    label: 'Pemegang Saham Pengendali',
    description:
      'Hal-hal yang dilakukan oleh pemegang saham pengendali terhadap perusahaan yang dikendalikan? (Rendah / Moderat / Dominan)',
    options: [
      { label: 'Rendah', score: 0 },
      { label: 'Moderat', score: 0.5 },
      { label: 'Dominan', score: 1 },
    ],
  },
  {
    number: 4,
    label: 'Penunjukkan Manajemen',
    description:
      'Apakah manajemen perusahaan ditunjuk oleh pemegang saham mayoritas? (Tidak Ada / Sebagian / Seluruhnya)',
    options: [
      { label: 'Tidak Ada', score: 0 },
      { label: 'Sebagian', score: 0.5 },
      { label: 'Seluruhnya', score: 1 },
    ],
  },
  {
    number: 5,
    label: 'Pengendalian Operasional Perusahaan',
    description:
      'Apakah pemegang saham mayoritas sebagai pengendali operasional perusahaan? (Tidak / Sebagian / Ya)',
    options: [
      { label: 'Tidak', score: 0 },
      { label: 'Sebagian', score: 0.5 },
      { label: 'Ya', score: 1 },
    ],
  },
] as const

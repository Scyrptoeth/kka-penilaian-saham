import { describe, expect, it } from 'vitest'
import { computeSimulasiPotensi, computeResistensiWp, TARIF_PPH_BADAN } from '@/lib/calculations/simulasi-potensi'

/**
 * SIMULASI POTENSI (AAM) fixture from kka-penilaian-saham.xlsx.
 *
 * Row 1: NAV = AAM!E51 = 27,435,841,103
 * Row 2: IBD = AAM!E52 = 1,000,000,000
 * Row 3: Equity = AAM!E53 = 26,435,841,103
 * Row 4: DLOM = -30% → discount = -7,930,752,330.9
 * Row 5: Equity less DLOM = 18,505,088,772.1
 * Row 6: DLOC/PFC = -50% → discount = -9,252,544,386.05
 * Row 8: MV Equity 100% = 9,252,544,386.05
 * Row 9: Proportion = 30%
 * Row 10: MV 30% = 2,775,763,315.815
 * Row 11: Reported = 600,000,000
 * Row 12: Potensi = 2,175,763,315.815
 *
 * PPh Pasal 17 progressive brackets:
 * Row 13: 5%  × min(potensi, 60M)  = 3,000,000
 * Row 14: 15% × min(remaining, 190M) = 28,500,000
 * Row 15: 25% × min(remaining, 250M) = 62,500,000
 * Row 16: 30% × min(remaining, 4.5B) = 502,728,994.74
 * Row 17: 35% × 0 = 0
 * Row 18: TOTAL = 596,728,994.74
 */

const PRECISION = 2

describe('computeSimulasiPotensi — Orang Pribadi (progressive PPh Pasal 17)', () => {
  const result = computeSimulasiPotensi({
    equityValue100: 26_435_841_103,
    dlomPercent: -0.30,
    dlocPercent: -0.50,
    proporsiKepemilikan: 0.30,
    nilaiPengalihanDilaporkan: 600_000_000,
    jenisSubjekPajak: 'orang_pribadi',
  })

  it('computes DLOM discount', () => {
    expect(result.dlomAmount).toBeCloseTo(-7_930_752_330.9, PRECISION)
  })

  it('computes equity less DLOM', () => {
    expect(result.equityLessDlom).toBeCloseTo(18_505_088_772.1, PRECISION)
  })

  it('computes DLOC discount', () => {
    expect(result.dlocAmount).toBeCloseTo(-9_252_544_386.05, PRECISION)
  })

  it('computes market value equity 100%', () => {
    expect(result.marketValueEquity100).toBeCloseTo(9_252_544_386.05, PRECISION)
  })

  it('computes market value portion (30%)', () => {
    expect(result.marketValuePortion).toBeCloseTo(2_775_763_315.815, PRECISION)
  })

  it('computes potensi pengalihan', () => {
    expect(result.potensiPengalihan).toBeCloseTo(2_175_763_315.815, PRECISION)
  })

  it('computes PPh bracket 5%', () => {
    expect(result.taxBrackets[0]!.rate).toBe(0.05)
    expect(result.taxBrackets[0]!.taxableAmount).toBeCloseTo(60_000_000, PRECISION)
    expect(result.taxBrackets[0]!.tax).toBeCloseTo(3_000_000, PRECISION)
  })

  it('computes PPh bracket 15%', () => {
    expect(result.taxBrackets[1]!.rate).toBe(0.15)
    expect(result.taxBrackets[1]!.taxableAmount).toBeCloseTo(190_000_000, PRECISION)
    expect(result.taxBrackets[1]!.tax).toBeCloseTo(28_500_000, PRECISION)
  })

  it('computes PPh bracket 25%', () => {
    expect(result.taxBrackets[2]!.rate).toBe(0.25)
    expect(result.taxBrackets[2]!.taxableAmount).toBeCloseTo(250_000_000, PRECISION)
    expect(result.taxBrackets[2]!.tax).toBeCloseTo(62_500_000, PRECISION)
  })

  it('computes PPh bracket 30%', () => {
    expect(result.taxBrackets[3]!.rate).toBe(0.30)
    expect(result.taxBrackets[3]!.taxableAmount).toBeCloseTo(1_675_763_315.815, PRECISION)
    expect(result.taxBrackets[3]!.tax).toBeCloseTo(502_728_994.7445, PRECISION)
  })

  it('computes PPh bracket 35% (zero in this case)', () => {
    expect(result.taxBrackets[4]!.rate).toBe(0.35)
    expect(result.taxBrackets[4]!.taxableAmount).toBeCloseTo(0, PRECISION)
    expect(result.taxBrackets[4]!.tax).toBeCloseTo(0, PRECISION)
  })

  it('computes total PPh kurang bayar', () => {
    expect(result.totalPPhKurangBayar).toBeCloseTo(596_728_994.7445, PRECISION)
  })
})

describe('computeSimulasiPotensi — Badan (flat 22%)', () => {
  it('applies flat 22% rate on positive potensi', () => {
    const result = computeSimulasiPotensi({
      equityValue100: 26_435_841_103,
      dlomPercent: -0.30,
      dlocPercent: -0.50,
      proporsiKepemilikan: 0.30,
      nilaiPengalihanDilaporkan: 600_000_000,
      jenisSubjekPajak: 'badan',
    })

    // Potensi = 2,175,763,315.815 (same as OP case)
    expect(result.potensiPengalihan).toBeCloseTo(2_175_763_315.815, PRECISION)

    // Single bracket at 22%
    expect(result.taxBrackets).toHaveLength(1)
    expect(result.taxBrackets[0]!.rate).toBe(TARIF_PPH_BADAN)
    expect(result.taxBrackets[0]!.taxableAmount).toBeCloseTo(2_175_763_315.815, PRECISION)
    expect(result.taxBrackets[0]!.tax).toBeCloseTo(2_175_763_315.815 * 0.22, PRECISION)

    expect(result.totalPPhKurangBayar).toBeCloseTo(478_667_929.4793, PRECISION)
  })

  it('returns zero tax when potensi is negative', () => {
    const result = computeSimulasiPotensi({
      equityValue100: 100_000_000,
      dlomPercent: -0.50,
      dlocPercent: -0.50,
      proporsiKepemilikan: 1,
      nilaiPengalihanDilaporkan: 999_999_999,
      jenisSubjekPajak: 'badan',
    })
    expect(result.potensiPengalihan).toBeLessThan(0)
    expect(result.totalPPhKurangBayar).toBe(0)
    expect(result.taxBrackets[0]!.taxableAmount).toBe(0)
  })

  it('returns zero tax when potensi is exactly zero', () => {
    const result = computeSimulasiPotensi({
      equityValue100: 100_000_000,
      dlomPercent: 0,
      dlocPercent: 0,
      proporsiKepemilikan: 1,
      nilaiPengalihanDilaporkan: 100_000_000,
      jenisSubjekPajak: 'badan',
    })
    expect(result.potensiPengalihan).toBe(0)
    expect(result.totalPPhKurangBayar).toBe(0)
  })
})

describe('computeSimulasiPotensi — Orang Pribadi edge cases', () => {
  it('handles potensi = 0 (reported >= market)', () => {
    const result = computeSimulasiPotensi({
      equityValue100: 1_000_000_000,
      dlomPercent: -0.30,
      dlocPercent: -0.50,
      proporsiKepemilikan: 1,
      nilaiPengalihanDilaporkan: 999_999_999_999,
      jenisSubjekPajak: 'orang_pribadi',
    })
    expect(result.potensiPengalihan).toBeLessThan(0)
    expect(result.totalPPhKurangBayar).toBe(0)
  })

  it('handles small potensi within first bracket only', () => {
    const result = computeSimulasiPotensi({
      equityValue100: 100_000_000,
      dlomPercent: 0,
      dlocPercent: 0,
      proporsiKepemilikan: 1,
      nilaiPengalihanDilaporkan: 50_000_000,
      jenisSubjekPajak: 'orang_pribadi',
    })
    expect(result.potensiPengalihan).toBe(50_000_000)
    expect(result.totalPPhKurangBayar).toBe(2_500_000)
    expect(result.taxBrackets[0]!.taxableAmount).toBe(50_000_000)
    expect(result.taxBrackets[1]!.taxableAmount).toBe(0)
  })
})

describe('TARIF_PPH_BADAN constant', () => {
  it('is 0.22', () => {
    expect(TARIF_PPH_BADAN).toBe(0.22)
  })
})

describe('computeResistensiWp', () => {
  it('returns "Moderat" for Moderat + Moderat', () => {
    expect(computeResistensiWp('Moderat', 'Moderat')).toBe('Moderat')
  })

  it('returns "Resiko Tinggi" for low DLOM + low DLOC', () => {
    expect(computeResistensiWp('Paling Rendah (Resiko Tinggi)', 'Paling Rendah (Resiko Tinggi)')).toBe('Resiko Tinggi')
  })

  it('returns "Resiko Rendah" for high DLOM + high DLOC', () => {
    expect(computeResistensiWp('Paling Tinggi (Resiko Rendah)', 'Paling Tinggi (Resiko Rendah)')).toBe('Resiko Rendah')
  })
})

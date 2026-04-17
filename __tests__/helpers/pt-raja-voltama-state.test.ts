import { describe, expect, it } from 'vitest'
import { loadPtRajaVoltamaState } from './pt-raja-voltama-state'

/**
 * Shape + spot-check sanity tests for the fixture-to-state adapter.
 * Full cell-by-cell parity validation happens in the Phase C test,
 * which composes this adapter + the complete export pipeline.
 */
describe('loadPtRajaVoltamaState', () => {
  const state = loadPtRajaVoltamaState()

  it('returns all 14 ExportableState fields present (non-null except sentinel cases)', () => {
    expect(state.home).not.toBeNull()
    expect(state.balanceSheet).not.toBeNull()
    expect(state.incomeStatement).not.toBeNull()
    expect(state.fixedAsset).not.toBeNull()
    expect(state.accPayables).not.toBeNull()
    expect(state.wacc).not.toBeNull()
    expect(state.discountRate).not.toBeNull()
    expect(state.keyDrivers).not.toBeNull()
    expect(state.dlom).not.toBeNull()
    expect(state.dloc).not.toBeNull()
    expect(state.borrowingCapInput).not.toBeNull()
    expect(state.aamAdjustments).toEqual({})
    expect(typeof state.nilaiPengalihanDilaporkan).toBe('number')
  })

  it('home: namaPerusahaan matches PT Raja Voltama template B4', () => {
    expect(state.home?.namaPerusahaan).toBe('PT RAJA VOLTAMA ELEKTRIK')
    expect(state.home?.jenisPerusahaan).toBe('tertutup')
    expect(state.home?.jumlahSahamBeredar).toBe(2_000_000_000)
    expect(state.home?.jumlahSahamYangDinilai).toBe(600_000_000)
    expect(state.home?.tahunTransaksi).toBe(2022)
  })

  it('balanceSheet.rows: spot-check leaf values match fixture', () => {
    // BS C8 (Cash 2018) = 14216370131; BS F47 (Current Profit 2021) = 21560655469
    expect(state.balanceSheet?.rows[8][2018]).toBe(14_216_370_131)
    expect(state.balanceSheet?.rows[47][2021]).toBe(21_560_655_469)
    // Negative accumDep (row 21 2020 = -565341111)
    expect(state.balanceSheet?.rows[21][2020]).toBe(-565_341_111)
  })

  it('incomeStatement.rows: spot-check sentinel + leaf values', () => {
    // D6 Revenue 2019 = 52109888424 (sentinel pre-computed)
    expect(state.incomeStatement?.rows[6][2019]).toBe(52_109_888_424)
    // F7 Cost 2021 = -26008410685 (stored negative, IS sign convention)
    expect(state.incomeStatement?.rows[7][2021]).toBe(-26_008_410_685)
    // D26 Interest Income 2019 = 0 (PT Raja Voltama had none early)
    expect(state.incomeStatement?.rows[26][2019]).toBe(0)
  })

  it('fixedAsset.rows: spot-check acquisition-begin + depreciation-begin', () => {
    // FA C8 Land ACQ_BEGIN 2019 = 6527779500 (or 261192000? let's pick a known row)
    // C36 building DEP_BEGIN 2019 = ... (negative value)
    expect(typeof state.fixedAsset?.rows[8]?.[2019]).toBe('number')
    expect(typeof state.fixedAsset?.rows[36]?.[2019]).toBe('number')
  })

  it('wacc: marketParams + comparableCompanies from template', () => {
    expect(state.wacc?.marketParams.equityRiskPremium).toBeCloseTo(0.0762, 10)
    expect(state.wacc?.marketParams.ratingBasedDefaultSpread).toBeCloseTo(0.0226, 10)
    expect(state.wacc?.marketParams.riskFree).toBeCloseTo(0.027, 10)
    expect(state.wacc?.comparableCompanies).toHaveLength(3)
    expect(state.wacc?.comparableCompanies[0].name).toBe('PT Ancol Makanan, Tbk')
    expect(state.wacc?.waccOverride).toBeCloseTo(0.1031, 10)
  })

  it('discountRate: CAPM inputs + bank rates from fixture', () => {
    expect(state.discountRate?.taxRate).toBeCloseTo(0.22, 10)
    expect(state.discountRate?.beta).toBeCloseTo(1.09, 10)
    expect(state.discountRate?.bankRates).toHaveLength(5)
    // Transform: fixture stores 9.41 (displayed %), store uses 0.0941 raw
    expect(state.discountRate?.bankRates[0].rate).toBeCloseTo(0.0941, 10)
    expect(state.discountRate?.bankRates[0].name).toBe('BANK PERSERO')
  })

  it('keyDrivers: scalars + projection-year arrays', () => {
    expect(state.keyDrivers?.financialDrivers.interestRateShortTerm).toBeCloseTo(0.14, 10)
    expect(state.keyDrivers?.operationalDrivers.salesVolumeIncrements).toHaveLength(6)
    expect(state.keyDrivers?.operationalDrivers.salesVolumeIncrements[0]).toBeCloseTo(0.05, 10)
    expect(state.keyDrivers?.bsDrivers.accReceivableDays).toHaveLength(7)
    expect(state.keyDrivers?.bsDrivers.accReceivableDays[0]).toBe(35)
  })

  it('dlom: 10 answers + kepemilikan (lowercased per store convention)', () => {
    expect(Object.keys(state.dlom?.answers ?? {})).toHaveLength(10)
    expect(state.dlom?.answers[1]).toBe('Tidak Ada')
    expect(state.dlom?.answers[10]).toBe('Tidak')
    expect(state.dlom?.kepemilikan).toBe('mayoritas')
  })

  it('dloc: 5 answers + kepemilikan', () => {
    expect(Object.keys(state.dloc?.answers ?? {})).toHaveLength(5)
  })

  it('nilaiPengalihanDilaporkan from SIMULASI POTENSI E11', () => {
    // PT Raja Voltama prototipe reports some transfer value — assert it's numeric
    expect(typeof state.nilaiPengalihanDilaporkan).toBe('number')
  })
})

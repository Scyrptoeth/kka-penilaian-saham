import { describe, expect, it } from 'vitest'
import { migratePersistedState } from '@/lib/store/useKkaStore'

const HOME_FIXTURE = {
  namaPerusahaan: 'PT Test Sejahtera',
  npwp: '01.234.567.8-901.000',
  jenisPerusahaan: 'tertutup' as const,
  jumlahSahamBeredar: 100_000,
  jumlahSahamYangDinilai: 50_000,
  tahunTransaksi: 2024,
  objekPenilaian: 'saham' as const,
  dlomPercent: 0,
  dlocPercent: 0,
}

describe('migratePersistedState — v1 → v6 (chained)', () => {
  it('preserves home and initializes all slices as null', () => {
    const v1State = { home: HOME_FIXTURE }
    const migrated = migratePersistedState(v1State, 1) as Record<string, unknown>
    expect(migrated.home).toEqual(HOME_FIXTURE)
    expect(migrated.dlom).toBeNull()
    expect(migrated.dloc).toBeNull()
    expect(migrated.balanceSheet).toBeNull()
    expect(migrated.accPayables).toBeNull()
    expect(migrated.wacc).toBeNull()
    expect(migrated.discountRate).toBeNull()
    expect(migrated.keyDrivers).toBeNull()
  })
})

describe('migratePersistedState — v4 → v6', () => {
  it('adds wacc + discountRate + keyDrivers as null', () => {
    const v4State = {
      home: HOME_FIXTURE,
      dlom: null,
      dloc: null,
      balanceSheet: null,
      incomeStatement: null,
      fixedAsset: null,
      accPayables: null,
    }
    const migrated = migratePersistedState(v4State, 4) as Record<string, unknown>
    expect(migrated.wacc).toBeNull()
    expect(migrated.discountRate).toBeNull()
    expect(migrated.keyDrivers).toBeNull()
  })
})

describe('migratePersistedState — v5 → v6', () => {
  it('preserves existing slices and adds keyDrivers as null', () => {
    const v5State = {
      home: HOME_FIXTURE,
      dlom: null,
      dloc: null,
      balanceSheet: null,
      incomeStatement: null,
      fixedAsset: null,
      accPayables: null,
      wacc: null,
      discountRate: null,
    }
    const migrated = migratePersistedState(v5State, 5) as Record<string, unknown>
    expect(migrated.home).toEqual(HOME_FIXTURE)
    expect(migrated.wacc).toBeNull()
    expect(migrated.discountRate).toBeNull()
    expect(migrated.keyDrivers).toBeNull()
  })
})

describe('migratePersistedState — v6 and future', () => {
  it('v6 → v6 passes through unchanged (no-op)', () => {
    const v6State = {
      home: HOME_FIXTURE,
      dlom: null,
      dloc: null,
      balanceSheet: null,
      incomeStatement: null,
      fixedAsset: null,
      accPayables: null,
      wacc: null,
      discountRate: null,
      keyDrivers: null,
    }
    const migrated = migratePersistedState(v6State, 6)
    expect(migrated).toBe(v6State)
  })

  it('passes future versions through unchanged', () => {
    const v7State = { home: null, futureSlice: {} }
    const migrated = migratePersistedState(v7State, 7)
    expect(migrated).toBe(v7State)
  })

  it('passes non-object payloads through unchanged', () => {
    expect(migratePersistedState(null, 1)).toBeNull()
    expect(migratePersistedState('garbage', 1)).toBe('garbage')
  })
})

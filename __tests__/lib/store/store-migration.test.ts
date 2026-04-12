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

const DLOM_FIXTURE = {
  answers: { 1: 'A' },
  kepemilikan: 'minoritas' as const,
  percentage: 0.15,
}

const DLOC_FIXTURE = {
  answers: { 1: 'B' },
  kepemilikan: 'mayoritas' as const,
  percentage: 0.05,
}

describe('migratePersistedState — v1 → v4 (chained)', () => {
  it('preserves home and initializes all slices as null', () => {
    const v1State = { home: HOME_FIXTURE }
    const migrated = migratePersistedState(v1State, 1) as Record<string, unknown>
    expect(migrated.home).toEqual(HOME_FIXTURE)
    expect(migrated.dlom).toBeNull()
    expect(migrated.dloc).toBeNull()
    expect(migrated.balanceSheet).toBeNull()
    expect(migrated.incomeStatement).toBeNull()
    expect(migrated.fixedAsset).toBeNull()
    expect(migrated.accPayables).toBeNull()
  })

  it('preserves null home gracefully when v1 was empty', () => {
    const migrated = migratePersistedState({ home: null }, 1) as Record<string, unknown>
    expect(migrated.home).toBeNull()
    expect(migrated.balanceSheet).toBeNull()
    expect(migrated.accPayables).toBeNull()
  })
})

describe('migratePersistedState — v2 → v4', () => {
  it('preserves home/dlom/dloc and adds all new slices as null', () => {
    const v2State = {
      home: HOME_FIXTURE,
      dlom: DLOM_FIXTURE,
      dloc: DLOC_FIXTURE,
    }
    const migrated = migratePersistedState(v2State, 2) as Record<string, unknown>
    expect(migrated.home).toEqual(HOME_FIXTURE)
    expect(migrated.dlom).toEqual(DLOM_FIXTURE)
    expect(migrated.dloc).toEqual(DLOC_FIXTURE)
    expect(migrated.balanceSheet).toBeNull()
    expect(migrated.incomeStatement).toBeNull()
    expect(migrated.fixedAsset).toBeNull()
    expect(migrated.accPayables).toBeNull()
  })

  it('handles v2 with null dlom/dloc', () => {
    const v2State = { home: HOME_FIXTURE, dlom: null, dloc: null }
    const migrated = migratePersistedState(v2State, 2) as Record<string, unknown>
    expect(migrated.home).toEqual(HOME_FIXTURE)
    expect(migrated.balanceSheet).toBeNull()
    expect(migrated.accPayables).toBeNull()
  })
})

describe('migratePersistedState — v3 → v4', () => {
  it('preserves existing slices and adds accPayables as null', () => {
    const v3State = {
      home: HOME_FIXTURE,
      dlom: null,
      dloc: null,
      balanceSheet: { rows: { 8: { 2023: 1_000_000 } } },
      incomeStatement: null,
      fixedAsset: null,
    }
    const migrated = migratePersistedState(v3State, 3) as Record<string, unknown>
    expect(migrated.home).toEqual(HOME_FIXTURE)
    expect(migrated.balanceSheet).toEqual({ rows: { 8: { 2023: 1_000_000 } } })
    expect(migrated.accPayables).toBeNull()
  })
})

describe('migratePersistedState — v4 and future', () => {
  it('v4 → v4 passes through unchanged (no-op)', () => {
    const v4State = {
      home: HOME_FIXTURE,
      dlom: null,
      dloc: null,
      balanceSheet: null,
      incomeStatement: null,
      fixedAsset: null,
      accPayables: null,
    }
    const migrated = migratePersistedState(v4State, 4)
    expect(migrated).toBe(v4State)
  })

  it('passes future versions through unchanged (no false-positive downgrade)', () => {
    const v5FutureState = {
      home: null,
      dlom: null,
      dloc: null,
      balanceSheet: null,
      incomeStatement: null,
      fixedAsset: null,
      accPayables: null,
      futureSlice: {},
    }
    const migrated = migratePersistedState(v5FutureState, 5)
    expect(migrated).toBe(v5FutureState)
  })

  it('passes unknown / non-object payloads through unchanged', () => {
    expect(migratePersistedState(null, 1)).toBeNull()
    expect(migratePersistedState('garbage', 1)).toBe('garbage')
    expect(migratePersistedState(undefined, 1)).toBeUndefined()
  })
})

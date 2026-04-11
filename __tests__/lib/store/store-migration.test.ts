import { describe, expect, it } from 'vitest'
import { migratePersistedState } from '@/lib/store/useKkaStore'

describe('migratePersistedState — v1 → v2', () => {
  it('preserves home data and initializes dlom/dloc as null', () => {
    const v1State = {
      home: {
        namaPerusahaan: 'PT Test Sejahtera',
        npwp: '01.234.567.8-901.000',
        jenisPerusahaan: 'tertutup' as const,
        jumlahSahamBeredar: 100_000,
        jumlahSahamYangDinilai: 50_000,
        tahunTransaksi: 2024,
        objekPenilaian: 'saham' as const,
        dlomPercent: 0,
        dlocPercent: 0,
      },
    }

    const migrated = migratePersistedState(v1State, 1) as {
      home: typeof v1State.home
      dlom: null
      dloc: null
    }

    expect(migrated.home).toEqual(v1State.home)
    expect(migrated.dlom).toBeNull()
    expect(migrated.dloc).toBeNull()
  })

  it('preserves null home gracefully when v1 had not been filled', () => {
    const v1Empty = { home: null }
    const migrated = migratePersistedState(v1Empty, 1) as {
      home: null
      dlom: null
      dloc: null
    }
    expect(migrated.home).toBeNull()
    expect(migrated.dlom).toBeNull()
    expect(migrated.dloc).toBeNull()
  })

  it('passes future versions through unchanged (no false-positive downgrade)', () => {
    const v3FutureState = { home: null, dlom: null, dloc: null, futureSlice: {} }
    const migrated = migratePersistedState(v3FutureState, 3)
    expect(migrated).toBe(v3FutureState)
  })

  it('passes unknown / non-object payloads through unchanged', () => {
    expect(migratePersistedState(null, 1)).toBeNull()
    expect(migratePersistedState('garbage', 1)).toBe('garbage')
    expect(migratePersistedState(undefined, 1)).toBeUndefined()
  })
})

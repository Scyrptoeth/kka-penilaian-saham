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

describe('migratePersistedState — v1 → v9 (chained)', () => {
  it('preserves home, initializes all slices, adds v8+v9 fields', () => {
    const v1State = { home: HOME_FIXTURE }
    const migrated = migratePersistedState(v1State, 1) as Record<string, unknown>
    const home = migrated.home as Record<string, unknown>
    expect(home.namaPerusahaan).toBe('PT Test Sejahtera')
    expect(home.nilaiNominalPerSaham).toBe(1)
    // v9 fields
    expect(home.namaSubjekPajak).toBe('')
    expect(home.npwpSubjekPajak).toBe('')
    expect(home.jenisSubjekPajak).toBe('orang_pribadi')
    expect(home.jenisInformasiPeralihan).toBe('lembar_saham')
    expect(migrated.dlom).toBeNull()
    expect(migrated.dloc).toBeNull()
    expect(migrated.balanceSheet).toBeNull()
    expect(migrated.accPayables).toBeNull()
    expect(migrated.wacc).toBeNull()
    expect(migrated.discountRate).toBeNull()
    expect(migrated.keyDrivers).toBeNull()
    expect(migrated.borrowingCapInput).toBeNull()
    expect(migrated.faAdjustment).toBe(0)
    expect(migrated.nilaiPengalihanDilaporkan).toBe(0)
  })
})

describe('migratePersistedState — v4 → v8 (chained)', () => {
  it('adds wacc + discountRate + keyDrivers + v7/v8 fields', () => {
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
    expect(migrated.borrowingCapInput).toBeNull()
    expect(migrated.faAdjustment).toBe(0)
    const home = migrated.home as Record<string, unknown>
    expect(home.nilaiNominalPerSaham).toBe(1)
  })
})

describe('migratePersistedState — v5 → v8 (chained)', () => {
  it('preserves existing slices, adds keyDrivers + v7/v8 fields', () => {
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
    const home = migrated.home as Record<string, unknown>
    expect(home.namaPerusahaan).toBe('PT Test Sejahtera')
    expect(home.nilaiNominalPerSaham).toBe(1)
    expect(migrated.keyDrivers).toBeNull()
    expect(migrated.borrowingCapInput).toBeNull()
    expect(migrated.faAdjustment).toBe(0)
  })
})

describe('migratePersistedState — v6 → v8 (chained)', () => {
  it('v6 → v7 → v8: adds borrowingCapInput + v8 fields', () => {
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
    const migrated = migratePersistedState(v6State, 6) as Record<string, unknown>
    expect(migrated.borrowingCapInput).toBeNull()
    expect(migrated.faAdjustment).toBe(0)
    const home = migrated.home as Record<string, unknown>
    expect(home.nilaiNominalPerSaham).toBe(1)
  })
})

describe('migratePersistedState — v7 → v8', () => {
  it('adds nilaiNominalPerSaham to home + faAdjustment + nilaiPengalihanDilaporkan', () => {
    const v7State = {
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
      borrowingCapInput: null,
    }
    const migrated = migratePersistedState(v7State, 7) as Record<string, unknown>
    const home = migrated.home as Record<string, unknown>
    expect(home.nilaiNominalPerSaham).toBe(1)
    expect(home.namaPerusahaan).toBe('PT Test Sejahtera')
    expect(migrated.faAdjustment).toBe(0)
    expect(migrated.nilaiPengalihanDilaporkan).toBe(0)
  })

  it('preserves existing nilaiNominalPerSaham if already present', () => {
    const v7WithNilai = {
      home: { ...HOME_FIXTURE, nilaiNominalPerSaham: 100 },
      borrowingCapInput: null,
    }
    const migrated = migratePersistedState(v7WithNilai, 7) as Record<string, unknown>
    const home = migrated.home as Record<string, unknown>
    expect(home.nilaiNominalPerSaham).toBe(100)
  })

  it('handles null home during v7→v8 migration', () => {
    const v7NullHome = {
      home: null,
      borrowingCapInput: null,
    }
    const migrated = migratePersistedState(v7NullHome, 7) as Record<string, unknown>
    expect(migrated.home).toBeNull()
    expect(migrated.faAdjustment).toBe(0)
    expect(migrated.nilaiPengalihanDilaporkan).toBe(0)
  })
})

describe('migratePersistedState — v8 → v9', () => {
  it('adds subjek pajak + jenisInformasiPeralihan to home', () => {
    const v8State = {
      home: { ...HOME_FIXTURE, nilaiNominalPerSaham: 1 },
      dlom: null,
      dloc: null,
      balanceSheet: null,
      incomeStatement: null,
      fixedAsset: null,
      accPayables: null,
      wacc: null,
      discountRate: null,
      keyDrivers: null,
      borrowingCapInput: null,
      faAdjustment: 0,
      nilaiPengalihanDilaporkan: 0,
    }
    const migrated = migratePersistedState(v8State, 8) as Record<string, unknown>
    const home = migrated.home as Record<string, unknown>
    expect(home.namaSubjekPajak).toBe('')
    expect(home.npwpSubjekPajak).toBe('')
    expect(home.jenisSubjekPajak).toBe('orang_pribadi')
    expect(home.jenisInformasiPeralihan).toBe('lembar_saham')
    // Existing fields preserved
    expect(home.namaPerusahaan).toBe('PT Test Sejahtera')
    expect(home.nilaiNominalPerSaham).toBe(1)
  })

  it('handles null home during v8→v9 migration', () => {
    const v8NullHome = {
      home: null,
      faAdjustment: 0,
      nilaiPengalihanDilaporkan: 0,
    }
    const migrated = migratePersistedState(v8NullHome, 8) as Record<string, unknown>
    expect(migrated.home).toBeNull()
  })

  it('preserves existing v9 fields if already present', () => {
    const v8WithFields = {
      home: {
        ...HOME_FIXTURE,
        nilaiNominalPerSaham: 1,
        namaSubjekPajak: 'Existing Subjek',
        npwpSubjekPajak: '11.111.111.1-111.111',
        jenisSubjekPajak: 'badan',
        jenisInformasiPeralihan: 'modal_disetor',
      },
    }
    const migrated = migratePersistedState(v8WithFields, 8) as Record<string, unknown>
    const home = migrated.home as Record<string, unknown>
    // ?? operator: existing values preserved over defaults
    expect(home.namaSubjekPajak).toBe('Existing Subjek')
    expect(home.jenisSubjekPajak).toBe('badan')
    expect(home.jenisInformasiPeralihan).toBe('modal_disetor')
  })
})

describe('migratePersistedState — v9 and future', () => {
  it('v9 → v9 passes through unchanged (no-op)', () => {
    const v9State = { home: null, futureSlice: {} }
    const migrated = migratePersistedState(v9State, 9)
    expect(migrated).toBe(v9State)
  })

  it('passes future versions through unchanged', () => {
    const v10State = { home: null, futureSlice: {} }
    const migrated = migratePersistedState(v10State, 10)
    expect(migrated).toBe(v10State)
  })

  it('passes non-object payloads through unchanged', () => {
    expect(migratePersistedState(null, 1)).toBeNull()
    expect(migratePersistedState('garbage', 1)).toBe('garbage')
  })
})

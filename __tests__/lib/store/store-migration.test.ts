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

describe('migratePersistedState — v9 → v10 (BS dynamic accounts)', () => {
  it('extends balanceSheet with accounts, yearCount, language', () => {
    const v9State = {
      home: { ...HOME_FIXTURE, namaSubjekPajak: '', npwpSubjekPajak: '', jenisSubjekPajak: 'orang_pribadi', jenisInformasiPeralihan: 'lembar_saham', nilaiNominalPerSaham: 1 },
      balanceSheet: { rows: { 8: { 2020: 100 } } },
    }
    const migrated = migratePersistedState(v9State, 9) as Record<string, unknown>
    const bs = migrated.balanceSheet as Record<string, unknown>
    expect(bs.accounts).toEqual([])
    expect(bs.yearCount).toBe(1)
    expect(bs.language).toBe('en')
    expect(bs.rows).toEqual({ 8: { 2020: 100 } })
  })

  it('handles null balanceSheet during v9→v10 migration', () => {
    const v9Null = { home: null, balanceSheet: null }
    const migrated = migratePersistedState(v9Null, 9) as Record<string, unknown>
    expect(migrated.balanceSheet).toBeNull()
  })
})

describe('migratePersistedState — v10 → v11 (remove FA from BS)', () => {
  it('strips fixed_assets accounts and rows from balanceSheet', () => {
    const v10State = {
      home: null,
      balanceSheet: {
        accounts: [
          { catalogId: 'cash', excelRow: 8, section: 'current_assets' },
          { catalogId: 'fixed_assets_beginning', excelRow: 20, section: 'fixed_assets' },
          { catalogId: 'accum_depreciation', excelRow: 21, section: 'fixed_assets' },
          { catalogId: 'land', excelRow: 120, section: 'fixed_assets' },
        ],
        yearCount: 2,
        language: 'en',
        rows: {
          8: { 2021: 100 },
          20: { 2021: 500 },
          21: { 2021: 200 },
          120: { 2021: 300 },
        },
      },
    }
    const migrated = migratePersistedState(v10State, 10) as Record<string, unknown>
    const bs = migrated.balanceSheet as Record<string, unknown>
    const accounts = bs.accounts as Array<{ section: string }>
    // Only current_assets account remains
    expect(accounts).toHaveLength(1)
    expect(accounts[0].section).toBe('current_assets')
    // FA rows removed, CA row preserved
    const rows = bs.rows as Record<string, unknown>
    expect(rows['8']).toEqual({ 2021: 100 })
    expect(rows['20']).toBeUndefined()
    expect(rows['21']).toBeUndefined()
    expect(rows['120']).toBeUndefined()
  })

  it('handles null balanceSheet during v10→v11 migration', () => {
    const v10Null = { home: null, balanceSheet: null }
    const migrated = migratePersistedState(v10Null, 10) as Record<string, unknown>
    expect(migrated.balanceSheet).toBeNull()
  })
})

describe('migratePersistedState — v11 → v12 (FA dynamic accounts)', () => {
  it('extends fixedAsset with accounts, yearCount, language and default 6 accounts', () => {
    const v11State = {
      home: null,
      fixedAsset: { rows: { 8: { 2020: 100 }, 9: { 2020: 200 } } },
    }
    const migrated = migratePersistedState(v11State, 11) as Record<string, unknown>
    const fa = migrated.fixedAsset as Record<string, unknown>
    const accounts = fa.accounts as Array<{ catalogId: string; excelRow: number }>
    expect(accounts).toHaveLength(6)
    expect(accounts[0].catalogId).toBe('land')
    expect(accounts[0].excelRow).toBe(8)
    expect(accounts[5].catalogId).toBe('electrical_installation')
    expect(accounts[5].excelRow).toBe(13)
    expect(fa.yearCount).toBe(3)
    expect(fa.language).toBe('id')
    // Existing row data preserved
    expect(fa.rows).toEqual({ 8: { 2020: 100 }, 9: { 2020: 200 } })
  })

  it('handles null fixedAsset during v11→v12 migration', () => {
    const v11Null = { home: null, fixedAsset: null }
    const migrated = migratePersistedState(v11Null, 11) as Record<string, unknown>
    expect(migrated.fixedAsset).toBeNull()
  })

  it('does not overwrite if accounts already present', () => {
    const v11WithAccounts = {
      home: null,
      fixedAsset: {
        accounts: [{ catalogId: 'land', excelRow: 8, section: 'fixed_asset' }],
        yearCount: 4,
        language: 'en',
        rows: {},
      },
    }
    const migrated = migratePersistedState(v11WithAccounts, 11) as Record<string, unknown>
    const fa = migrated.fixedAsset as Record<string, unknown>
    // Should not overwrite — accounts key already exists
    expect((fa.accounts as unknown[]).length).toBe(1)
    expect(fa.yearCount).toBe(4)
  })
})

describe('migratePersistedState — v12 → v13 (IS dynamic accounts)', () => {
  it('migrates IS leaf data to extended rows + sentinels', () => {
    const v12State = {
      home: null,
      incomeStatement: {
        rows: {
          6: { 2020: 100, 2021: 120 },   // Revenue
          7: { 2020: 60, 2021: 70 },      // COGS
          12: { 2020: 5, 2021: 6 },       // Others OpEx
          13: { 2020: 10, 2021: 12 },     // G&A
          21: { 2020: 4, 2021: 5 },       // Depreciation (fixed)
          26: { 2020: 1, 2021: 2 },       // Interest Income
          27: { 2020: 0.5, 2021: 1 },     // Interest Expense
          30: { 2020: 2, 2021: 3 },       // Non-Op
          33: { 2020: 5, 2021: 7 },       // Tax (fixed)
        },
      },
    }
    const migrated = migratePersistedState(v12State, 12) as Record<string, unknown>
    const is = migrated.incomeStatement as Record<string, unknown>

    // accounts populated with 7 defaults
    expect((is.accounts as unknown[]).length).toBe(7)
    expect(is.yearCount).toBe(4)
    expect(is.language).toBe('id')

    const rows = is.rows as Record<string, Record<string, number>>
    // Extended leaf rows
    expect(rows['100']).toEqual({ 2020: 100, 2021: 120 }) // Revenue → 100
    expect(rows['200']).toEqual({ 2020: 60, 2021: 70 })   // COGS → 200
    expect(rows['300']).toEqual({ 2020: 5, 2021: 6 })     // Others → 300
    expect(rows['301']).toEqual({ 2020: 10, 2021: 12 })   // G&A → 301
    expect(rows['500']).toEqual({ 2020: 1, 2021: 2 })     // II → 500
    expect(rows['501']).toEqual({ 2020: 0.5, 2021: 1 })   // IE → 501
    expect(rows['400']).toEqual({ 2020: 2, 2021: 3 })     // Non-Op → 400

    // Fixed leaves at original positions
    expect(rows['21']).toEqual({ 2020: 4, 2021: 5 })
    expect(rows['33']).toEqual({ 2020: 5, 2021: 7 })

    // Sentinel subtotals at original positions (for downstream compat)
    expect(rows['6']).toEqual({ 2020: 100, 2021: 120 })   // Revenue sentinel
    expect(rows['7']).toEqual({ 2020: 60, 2021: 70 })     // COGS sentinel
    expect(rows['15']?.['2020']).toBe(15)                   // OpEx = 5 + 10
    expect(rows['15']?.['2021']).toBe(18)                   // OpEx = 6 + 12

    // Higher-level computed sentinels
    expect(rows['8']?.['2020']).toBe(40)                    // GP = 100 - 60
    expect(rows['35']?.['2020']).toBeCloseTo(18.5, 10)     // NP = PBT(23.5) - Tax(5)
  })

  it('handles null incomeStatement', () => {
    const v12Null = { home: null, incomeStatement: null }
    const migrated = migratePersistedState(v12Null, 12) as Record<string, unknown>
    expect(migrated.incomeStatement).toBeNull()
  })

  it('does not overwrite if accounts already present', () => {
    const v12WithAccounts = {
      home: null,
      incomeStatement: {
        accounts: [{ catalogId: 'revenue', excelRow: 100, section: 'revenue' }],
        yearCount: 3,
        language: 'en',
        rows: {},
      },
    }
    const migrated = migratePersistedState(v12WithAccounts, 12) as Record<string, unknown>
    const is = migrated.incomeStatement as Record<string, unknown>
    expect((is.accounts as unknown[]).length).toBe(1)
    expect(is.yearCount).toBe(3)
  })
})

describe('migratePersistedState — v13 and future', () => {
  it('v13 → v13 passes through unchanged (no-op)', () => {
    const v13State = { home: null, futureSlice: {} }
    const migrated = migratePersistedState(v13State, 13)
    expect(migrated).toBe(v13State)
  })

  it('passes future versions through unchanged', () => {
    const v14State = { home: null, futureSlice: {} }
    const migrated = migratePersistedState(v14State, 14)
    expect(migrated).toBe(v14State)
  })

  it('passes non-object payloads through unchanged', () => {
    expect(migratePersistedState(null, 1)).toBeNull()
    expect(migratePersistedState('garbage', 1)).toBe('garbage')
  })
})

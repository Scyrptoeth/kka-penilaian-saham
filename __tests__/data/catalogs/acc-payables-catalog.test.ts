import { describe, expect, it } from 'vitest'
import {
  AP_BANDS,
  apRowFor,
  computeApSentinels,
  createDefaultApState,
  DEFAULT_AP_SCHEDULES,
} from '@/data/catalogs/acc-payables-catalog'
import type { ApSchedule } from '@/data/live/types'

describe('AP catalog — band layout', () => {
  it('ST bands start at 9/10/12 baseline and 100/140/180 extended', () => {
    expect(AP_BANDS.st_bank_loans.beg.baselineRow).toBe(9)
    expect(AP_BANDS.st_bank_loans.add.baselineRow).toBe(10)
    expect(AP_BANDS.st_bank_loans.end.baselineRow).toBe(12)
    expect(AP_BANDS.st_bank_loans.beg.extendedStart).toBe(100)
    expect(AP_BANDS.st_bank_loans.add.extendedStart).toBe(140)
    expect(AP_BANDS.st_bank_loans.end.extendedStart).toBe(180)
  })

  it('LT bands start at 18/19/21 baseline and 220/260/300 extended', () => {
    expect(AP_BANDS.lt_bank_loans.beg.baselineRow).toBe(18)
    expect(AP_BANDS.lt_bank_loans.add.baselineRow).toBe(19)
    expect(AP_BANDS.lt_bank_loans.end.baselineRow).toBe(21)
    expect(AP_BANDS.lt_bank_loans.beg.extendedStart).toBe(220)
    expect(AP_BANDS.lt_bank_loans.add.extendedStart).toBe(260)
    expect(AP_BANDS.lt_bank_loans.end.extendedStart).toBe(300)
  })

  it('apRowFor slot 0 returns baseline rows', () => {
    expect(apRowFor('st_bank_loans', 0, 'beg')).toBe(9)
    expect(apRowFor('st_bank_loans', 0, 'add')).toBe(10)
    expect(apRowFor('st_bank_loans', 0, 'end')).toBe(12)
    expect(apRowFor('lt_bank_loans', 0, 'beg')).toBe(18)
  })

  it('apRowFor slot 1+ returns synthetic extended rows', () => {
    expect(apRowFor('st_bank_loans', 1, 'beg')).toBe(100)
    expect(apRowFor('st_bank_loans', 1, 'add')).toBe(140)
    expect(apRowFor('st_bank_loans', 1, 'end')).toBe(180)
    expect(apRowFor('st_bank_loans', 3, 'add')).toBe(142)
    expect(apRowFor('lt_bank_loans', 5, 'end')).toBe(304)
  })
})

describe('AP catalog — default state', () => {
  it('DEFAULT_AP_SCHEDULES seeds 1 ST + 1 LT', () => {
    expect(DEFAULT_AP_SCHEDULES.length).toBe(2)
    expect(DEFAULT_AP_SCHEDULES[0].section).toBe('st_bank_loans')
    expect(DEFAULT_AP_SCHEDULES[0].slotIndex).toBe(0)
    expect(DEFAULT_AP_SCHEDULES[1].section).toBe('lt_bank_loans')
  })

  it('createDefaultApState returns mutable schedules array + empty rows', () => {
    const state = createDefaultApState()
    expect(state.schedules.length).toBe(2)
    expect(Object.keys(state.rows).length).toBe(0)
  })
})

describe('AP catalog — sentinel pre-compute', () => {
  it('computes Beg (prior End) + End (Beg + Addition) for a single ST schedule', () => {
    const schedules: ApSchedule[] = [
      { id: 'st_default', section: 'st_bank_loans', slotIndex: 0 },
    ]
    const rows = {
      10: { 2019: 1000, 2020: 500, 2021: -200 },
    }
    const years = [2019, 2020, 2021]
    const sentinels = computeApSentinels(schedules, rows, years)
    // Beginning year 0 = 0 → End = 1000
    expect(sentinels[9][2019]).toBe(0)
    expect(sentinels[12][2019]).toBe(1000)
    // Beginning year 1 = prior End 1000 → End = 1500
    expect(sentinels[9][2020]).toBe(1000)
    expect(sentinels[12][2020]).toBe(1500)
    // Beginning year 2 = prior End 1500 → End = 1300 (1500 - 200)
    expect(sentinels[9][2021]).toBe(1500)
    expect(sentinels[12][2021]).toBe(1300)
  })

  it('handles multiple schedules independently', () => {
    const schedules: ApSchedule[] = [
      { id: 'st1', section: 'st_bank_loans', slotIndex: 0 },
      { id: 'st2', section: 'st_bank_loans', slotIndex: 1 },
    ]
    const rows = {
      10: { 2019: 100 },      // ST slot 0 Addition
      140: { 2019: 500 },     // ST slot 1 Addition (extended)
    }
    const sentinels = computeApSentinels(schedules, rows, [2019])
    expect(sentinels[12][2019]).toBe(100)   // slot 0 ending
    expect(sentinels[180][2019]).toBe(500)  // slot 1 extended ending
  })

  it('returns 0 for missing Addition data', () => {
    const schedules: ApSchedule[] = [
      { id: 'lt_default', section: 'lt_bank_loans', slotIndex: 0 },
    ]
    const sentinels = computeApSentinels(schedules, {}, [2019, 2020])
    expect(sentinels[18][2019]).toBe(0)
    expect(sentinels[21][2019]).toBe(0)
    expect(sentinels[18][2020]).toBe(0)
    expect(sentinels[21][2020]).toBe(0)
  })

  // ─── Session 053: Beginning is user-overrideable with roll-forward fallback ───
  describe('Session 053 Beginning user override (Q1=C)', () => {
    it('uses user Beginning when present; End = Beg + Add', () => {
      const schedules: ApSchedule[] = [
        { id: 'st_default', section: 'st_bank_loans', slotIndex: 0 },
      ]
      const rows = {
        9:  { 2019: 5000 }, // User entered Beg for 2019 — opening balance
        10: { 2019: 1000 }, // Addition
      }
      const sentinels = computeApSentinels(schedules, rows, [2019, 2020, 2021])
      // Beg[0] from user override, End = Beg + Add
      expect(sentinels[9][2019]).toBe(5000)
      expect(sentinels[12][2019]).toBe(6000)
      // Beg[1] no user override → roll-forward from End[0] = 6000
      expect(sentinels[9][2020]).toBe(6000)
      expect(sentinels[12][2020]).toBe(6000)
    })

    it('user can override Beginning mid-stream; roll-forward resumes on next year', () => {
      const schedules: ApSchedule[] = [
        { id: 'st_default', section: 'st_bank_loans', slotIndex: 0 },
      ]
      const rows = {
        9:  { 2020: 9999 },   // User override mid-stream (2020 only)
        10: { 2019: 100, 2020: 50, 2021: 30 },
      }
      const sentinels = computeApSentinels(schedules, rows, [2019, 2020, 2021])
      // 2019: no Beg override → fallback 0. End = 100.
      expect(sentinels[9][2019]).toBe(0)
      expect(sentinels[12][2019]).toBe(100)
      // 2020: user override 9999. End = 9999 + 50 = 10049.
      expect(sentinels[9][2020]).toBe(9999)
      expect(sentinels[12][2020]).toBe(10049)
      // 2021: no override → fallback prev End = 10049. End = 10049 + 30 = 10079.
      expect(sentinels[9][2021]).toBe(10049)
      expect(sentinels[12][2021]).toBe(10079)
    })

    it('respects explicit zero at Beginning (user typed 0, not blank)', () => {
      const schedules: ApSchedule[] = [
        { id: 'st_default', section: 'st_bank_loans', slotIndex: 0 },
      ]
      const rows = {
        9:  { 2020: 0 }, // User explicitly typed 0 — NOT roll-forward
        10: { 2019: 100, 2020: 50 },
      }
      const sentinels = computeApSentinels(schedules, rows, [2019, 2020])
      // 2020: Beg = 0 explicit. End = 0 + 50 = 50. (Despite prev End = 100.)
      expect(sentinels[9][2020]).toBe(0)
      expect(sentinels[12][2020]).toBe(50)
    })

    it('backward compat: no Beginning entries → pure roll-forward (Session 042 behavior)', () => {
      const schedules: ApSchedule[] = [
        { id: 'st_default', section: 'st_bank_loans', slotIndex: 0 },
      ]
      const rows = {
        10: { 2019: 1000, 2020: 500 },
      }
      const sentinels = computeApSentinels(schedules, rows, [2019, 2020])
      expect(sentinels[9][2019]).toBe(0)
      expect(sentinels[12][2019]).toBe(1000)
      expect(sentinels[9][2020]).toBe(1000)
      expect(sentinels[12][2020]).toBe(1500)
    })
  })
})

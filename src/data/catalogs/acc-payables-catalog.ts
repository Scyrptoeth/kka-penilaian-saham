/**
 * Acc Payables dynamic catalog — bank loan schedules.
 *
 * Session 042 Task 4: converts the static AP sheet into a dynamic catalog
 * with user-addable schedules per section. 2 fixed sections, 3 bands per
 * schedule. See `src/data/live/types.ts` for the full encoding rationale.
 */

import type { ApSchedule, ApSection, AccPayablesInputState } from '@/data/live/types'
import type { YearKeyedSeries } from '@/types/financial'

// ---------------------------------------------------------------------------
// Band layout
// ---------------------------------------------------------------------------

export interface ApBandEncoding {
  /** Row for slot 0 (baseline schedule uses a template-native row). */
  readonly baselineRow: number
  /** First row of the synthetic extended range (slot 1 lands here). */
  readonly extendedStart: number
  /** Last row of the synthetic extended range (inclusive). */
  readonly extendedEnd: number
}

export interface ApSectionBands {
  readonly beg: ApBandEncoding
  readonly add: ApBandEncoding
  readonly end: ApBandEncoding
}

export const AP_BANDS: Readonly<Record<ApSection, ApSectionBands>> = {
  st_bank_loans: {
    beg: { baselineRow: 9, extendedStart: 100, extendedEnd: 139 },
    add: { baselineRow: 10, extendedStart: 140, extendedEnd: 179 },
    end: { baselineRow: 12, extendedStart: 180, extendedEnd: 219 },
  },
  lt_bank_loans: {
    beg: { baselineRow: 18, extendedStart: 220, extendedEnd: 259 },
    add: { baselineRow: 19, extendedStart: 260, extendedEnd: 299 },
    end: { baselineRow: 21, extendedStart: 300, extendedEnd: 339 },
  },
}

/**
 * Resolve the excel row for a given schedule + band.
 *
 * Slot 0 → band baseline row. Slot N≥1 → extended start + (N-1).
 */
export function apRowFor(
  section: ApSection,
  slotIndex: number,
  band: 'beg' | 'add' | 'end',
): number {
  const enc = AP_BANDS[section][band]
  if (slotIndex === 0) return enc.baselineRow
  return enc.extendedStart + (slotIndex - 1)
}

// ---------------------------------------------------------------------------
// Default schedules
// ---------------------------------------------------------------------------

export const DEFAULT_AP_SCHEDULES: readonly ApSchedule[] = [
  { id: 'st_default', section: 'st_bank_loans', slotIndex: 0 },
  { id: 'lt_default', section: 'lt_bank_loans', slotIndex: 0 },
]

export function createDefaultApState(): AccPayablesInputState {
  return {
    schedules: [...DEFAULT_AP_SCHEDULES],
    rows: {},
  }
}

// ---------------------------------------------------------------------------
// Sentinel pre-compute (Beg [user override or roll-forward] + End derived at
// persist time).
//
// Session 053 semantic (Q1=C):
//   Beg[year N] = user input at rows[begRow][year] IF defined (including 0),
//                 else roll-forward: Beg[0] = 0, Beg[N≥1] = End[N-1].
//   End[year N] = Beg[year N] + Addition[year N]
//
// The explicit-zero vs undefined distinction is intentional: `rows[begRow][y]
// != null` respects user-typed 0 (which means "no opening balance"), while
// truly-missing entries fall back to roll-forward. Same principle as
// LESSON-146 (INPUT is strict source of truth — distinguish `!= null`).
//
// Write Beg + End into `rows` so downstream consumers (CFS via cross-sheet
// refs, export formula bands via live formulas) see consistent values
// regardless of whether they read the store or evaluate an Excel formula.
// ---------------------------------------------------------------------------

export function computeApSentinels(
  schedules: readonly ApSchedule[],
  rows: Record<number, YearKeyedSeries>,
  years: readonly number[],
): Record<number, YearKeyedSeries> {
  const out: Record<number, YearKeyedSeries> = {}

  for (const schedule of schedules) {
    const begRow = apRowFor(schedule.section, schedule.slotIndex, 'beg')
    const addRow = apRowFor(schedule.section, schedule.slotIndex, 'add')
    const endRow = apRowFor(schedule.section, schedule.slotIndex, 'end')

    const beg: YearKeyedSeries = {}
    const end: YearKeyedSeries = {}
    for (let i = 0; i < years.length; i++) {
      const year = years[i]
      const begUser = rows[begRow]?.[year]
      const begFallback = i === 0 ? 0 : (end[years[i - 1]] ?? 0)
      const begValue = begUser != null ? begUser : begFallback
      beg[year] = begValue
      const addValue = rows[addRow]?.[year] ?? 0
      end[year] = begValue + addValue
    }

    out[begRow] = beg
    out[endRow] = end
  }

  return out
}

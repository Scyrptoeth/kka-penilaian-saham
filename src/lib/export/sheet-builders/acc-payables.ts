import type ExcelJS from 'exceljs'
import type { SheetBuilder } from './types'
import type { ExportableState } from '@/lib/export/export-xlsx'
import type { ApSchedule, ApSection } from '@/data/live/types'
import {
  AP_BANDS,
  apRowFor,
} from '@/data/catalogs/acc-payables-catalog'

const SHEET_NAME = 'ACC PAYABLES'

// Hardcoded year columns — matches ACC_PAYABLES_GRID yearColumns.
// AP template uses 3 historical years C/D/E = 2019/2020/2021.
const AP_YEAR_COLUMNS: ReadonlyArray<readonly [number, string]> = [
  [2019, 'C'],
  [2020, 'D'],
  [2021, 'E'],
]

function resolveScheduleLabel(
  schedule: ApSchedule,
  schedulesInSection: readonly ApSchedule[],
  sectionLabel: string,
): string {
  if (schedule.customLabel) return schedule.customLabel
  const sortedIndex =
    schedulesInSection
      .slice()
      .sort((a, b) => a.slotIndex - b.slotIndex)
      .findIndex((s) => s.id === schedule.id) + 1
  return `${sectionLabel} ${sortedIndex}`
}

function writeScheduleRows(
  ws: ExcelJS.Worksheet,
  schedule: ApSchedule,
  schedulesInSection: readonly ApSchedule[],
  sectionLabel: string,
  rows: Record<number, Record<number, number>>,
): void {
  const begRow = apRowFor(schedule.section, schedule.slotIndex, 'beg')
  const addRow = apRowFor(schedule.section, schedule.slotIndex, 'add')
  const endRow = apRowFor(schedule.section, schedule.slotIndex, 'end')

  const label = resolveScheduleLabel(schedule, schedulesInSection, sectionLabel)

  // Labels at col B only for synthetic (extended) slots; baseline slot (0)
  // has template label that should be preserved / overwritten with custom label.
  if (schedule.slotIndex === 0 && !schedule.customLabel) {
    // Leave template label — do nothing
  } else {
    ws.getCell(`B${begRow}`).value = label
    ws.getCell(`B${addRow}`).value = label
    ws.getCell(`B${endRow}`).value = label
  }

  for (const [year, col] of AP_YEAR_COLUMNS) {
    // Beginning (sentinel)
    const begValue = rows[begRow]?.[year]
    if (begValue !== undefined && begValue !== null) {
      ws.getCell(`${col}${begRow}`).value = begValue
    }
    // Addition (user leaf)
    const addValue = rows[addRow]?.[year]
    if (addValue !== undefined && addValue !== null) {
      ws.getCell(`${col}${addRow}`).value = addValue
    }
    // Ending: live formula `=<col>{beg}+<col>{add}` with cached result.
    const endValue = rows[endRow]?.[year]
    ws.getCell(`${col}${endRow}`).value = {
      formula: `${col}${begRow}+${col}${addRow}`,
      result: endValue !== undefined && endValue !== null ? endValue : 0,
    }
  }
}

/**
 * Resolve section label once per export (avoids t() import at module load).
 * Uses state.accPayables.schedules language via the store — but AP doesn't
 * carry its own language field, so fall back to i18n.
 */
function getSectionLabels(): Record<ApSection, string> {
  // Synchronous access to the useT singleton via direct import access.
  // useT() is a hook; we need a side-channel. Use the store's language directly.
  // Since this is export path (not React), we inline simple bilingual fallback.
  return {
    st_bank_loans: 'Short-Term Bank Loan',
    lt_bank_loans: 'Long-Term Bank Loan',
  }
}

export const AccPayablesBuilder: SheetBuilder = {
  sheetName: SHEET_NAME,
  upstream: ['accPayables'],
  build(workbook: ExcelJS.Workbook, state: ExportableState): void {
    const ap = state.accPayables
    if (!ap) return
    const ws = workbook.getWorksheet(SHEET_NAME)
    if (!ws) return

    const sectionLabels = getSectionLabels()
    const sections: ApSection[] = ['st_bank_loans', 'lt_bank_loans']

    for (const section of sections) {
      const schedulesInSection = ap.schedules.filter((s) => s.section === section)
      for (const schedule of schedulesInSection) {
        // Skip out-of-band slots defensively
        const band = AP_BANDS[section].add
        const addRow = apRowFor(section, schedule.slotIndex, 'add')
        if (schedule.slotIndex > 0 && addRow > band.extendedEnd) continue
        writeScheduleRows(
          ws,
          schedule,
          schedulesInSection,
          sectionLabels[section],
          ap.rows as Record<number, Record<number, number>>,
        )
      }
    }
  },
}


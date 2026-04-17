import type { SheetBuilder } from './types'
import {
  writeScalarsForSheet,
  injectDlocAnswers,
} from '@/lib/export/export-xlsx'

const SHEET_NAME = 'DLOC(PFC)'

/**
 * DlocBuilder — state-driven DLOC(PFC) sheet owner.
 *
 * Upstream: `['dloc']`. Simpler than DLOM — DLOC has no home-derived
 * jenisPerusahaan cell (formula B22 depends only on A20). When
 * state.dloc is null the orchestrator clears the sheet.
 *
 * build() composes:
 *   1. writeScalarsForSheet — B21 kepemilikan from state.dloc
 *   2. injectDlocAnswers — E7..E15 from state.dloc.answers
 */
export const DlocBuilder: SheetBuilder = {
  sheetName: SHEET_NAME,
  upstream: ['dloc'],
  build(workbook, state) {
    writeScalarsForSheet(workbook, state, SHEET_NAME)
    injectDlocAnswers(workbook, state)
  },
}

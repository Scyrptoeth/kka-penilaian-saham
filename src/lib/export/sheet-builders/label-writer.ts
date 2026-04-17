import type ExcelJS from 'exceljs'
import { BS_CATALOG_ALL } from '@/data/catalogs/balance-sheet-catalog'
import type { BsAccountEntry } from '@/data/catalogs/balance-sheet-catalog'
import { IS_CATALOG } from '@/data/catalogs/income-statement-catalog'
import type { IsAccountEntry } from '@/data/catalogs/income-statement-catalog'
import { FA_CATALOG } from '@/data/catalogs/fixed-asset-catalog'
import type { FaAccountEntry } from '@/data/catalogs/fixed-asset-catalog'
import { BS_ROW_TO_AAM_D_ROW } from '@/lib/export/cell-mapping'

/**
 * Generic label resolver shared by all catalog-driven sheet builders.
 * Precedence: customLabel > catalog label per language > catalogId fallback.
 *
 * Kept generic over catalog entry shape because BsCatalogAccount,
 * IsCatalogAccount, and FaCatalogAccount all share { id, labelEn, labelId }
 * but differ in their section unions. Accepting a minimal structural
 * constraint avoids forcing a shared interface across catalogs.
 */
export function resolveLabel<C extends { id: string; labelEn: string; labelId: string }>(
  account: { catalogId: string; customLabel?: string },
  catalog: readonly C[],
  language: 'en' | 'id',
): string {
  if (account.customLabel) return account.customLabel
  const entry = catalog.find((c) => c.id === account.catalogId)
  if (!entry) return account.catalogId
  return language === 'en' ? entry.labelEn : entry.labelId
}

/**
 * Write col B labels for BS accounts at their excelRow positions.
 * Caller is responsible for clearing prototipe labels first (via
 * `clearSheetCompletely` or explicit null-writes). This helper only
 * touches cells named in the provided accounts array — rows not in
 * accounts remain whatever the caller set.
 */
export function writeBsLabels(
  ws: ExcelJS.Worksheet,
  accounts: readonly BsAccountEntry[],
  language: 'en' | 'id',
): void {
  for (const acc of accounts) {
    ws.getCell(`B${acc.excelRow}`).value = resolveLabel(acc, BS_CATALOG_ALL, language)
  }
}

/**
 * Write col B labels for IS accounts at their excelRow positions.
 */
export function writeIsLabels(
  ws: ExcelJS.Worksheet,
  accounts: readonly IsAccountEntry[],
  language: 'en' | 'id',
): void {
  for (const acc of accounts) {
    ws.getCell(`B${acc.excelRow}`).value = resolveLabel(acc, IS_CATALOG, language)
  }
}

/**
 * Write col B labels for FA accounts at their excelRow positions.
 * FA has a 7-band mirror structure — extended-row labels are written
 * across all bands by `injectExtendedFaAccounts`. This helper handles
 * the baseline rows (8-13) which the template's own block repeats.
 */
export function writeFaLabels(
  ws: ExcelJS.Worksheet,
  accounts: readonly FaAccountEntry[],
  language: 'en' | 'id',
): void {
  for (const acc of accounts) {
    ws.getCell(`B${acc.excelRow}`).value = resolveLabel(acc, FA_CATALOG, language)
  }
}

/**
 * Write col B labels for AAM sheet by translating each BS account's
 * excelRow via BS_ROW_TO_AAM_D_ROW. Accounts without a mapping
 * (e.g. extended excelRow ≥ 100, section=intangible, etc.) are skipped
 * because AAM sheet has no corresponding row for them in Session 031.
 * Extending AAM to host arbitrary BS accounts is deferred to Session 032+.
 */
export function writeAamLabels(
  ws: ExcelJS.Worksheet,
  accounts: readonly BsAccountEntry[],
  language: 'en' | 'id',
): void {
  for (const acc of accounts) {
    const aamRow = BS_ROW_TO_AAM_D_ROW[acc.excelRow]
    if (aamRow === undefined) continue
    ws.getCell(`B${aamRow}`).value = resolveLabel(acc, BS_CATALOG_ALL, language)
  }
}

import type { Metadata } from 'next'
import { FinancialTable } from '@/components/financial/FinancialTable'
import { loadCells } from '@/data/seed/loader'
import { BALANCE_SHEET_MANIFEST } from '@/data/manifests/balance-sheet'
import { buildRowsFromManifest } from '@/data/manifests/build'
import { deriveBalanceSheetColumns } from '@/data/manifests/historical-derive'

export const metadata: Metadata = {
  title: 'Balance Sheet — KKA Penilaian Saham',
}

export default function BalanceSheetPage() {
  const cells = loadCells('balance-sheet')
  const derived = deriveBalanceSheetColumns(cells, BALANCE_SHEET_MANIFEST)
  const rows = buildRowsFromManifest(BALANCE_SHEET_MANIFEST, cells, derived)

  return (
    <div className="mx-auto max-w-[1400px]">
      <FinancialTable
        title={BALANCE_SHEET_MANIFEST.title}
        years={BALANCE_SHEET_MANIFEST.years}
        rows={rows}
        showCommonSize
        showGrowth
        disclaimer={BALANCE_SHEET_MANIFEST.disclaimer}
      />
    </div>
  )
}

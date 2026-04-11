import type { Metadata } from 'next'
import { FinancialTable } from '@/components/financial/FinancialTable'
import { loadCells } from '@/data/seed/loader'
import { INCOME_STATEMENT_MANIFEST } from '@/data/manifests/income-statement'
import { buildRowsFromManifest } from '@/data/manifests/build'
import { deriveIncomeStatementColumns } from '@/data/manifests/historical-derive'

export const metadata: Metadata = {
  title: 'Income Statement — KKA Penilaian Saham',
}

const REVENUE_ROW = 6

export default function IncomeStatementPage() {
  const cells = loadCells('income-statement')
  const derived = deriveIncomeStatementColumns(
    cells,
    INCOME_STATEMENT_MANIFEST,
    REVENUE_ROW,
  )
  const rows = buildRowsFromManifest(
    INCOME_STATEMENT_MANIFEST,
    cells,
    derived,
  )

  return (
    <div className="mx-auto max-w-[1400px]">
      <FinancialTable
        title={INCOME_STATEMENT_MANIFEST.title}
        years={INCOME_STATEMENT_MANIFEST.years}
        rows={rows}
        showCommonSize
        showGrowth
        disclaimer={INCOME_STATEMENT_MANIFEST.disclaimer}
      />
    </div>
  )
}

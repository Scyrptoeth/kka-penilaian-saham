import type { Metadata } from 'next'
import { FinancialTable } from '@/components/financial/FinancialTable'
import { loadCells } from '@/data/seed/loader'
import { FINANCIAL_RATIO_MANIFEST } from '@/data/manifests/financial-ratio'
import { buildRowsFromManifest } from '@/data/manifests/build'

export const metadata: Metadata = {
  title: 'Financial Ratios — KKA Penilaian Saham',
}

export default function FinancialRatioPage() {
  const cells = loadCells('financial-ratio')
  const rows = buildRowsFromManifest(FINANCIAL_RATIO_MANIFEST, cells)

  return (
    <div className="mx-auto max-w-[1100px]">
      <FinancialTable
        title={FINANCIAL_RATIO_MANIFEST.title}
        years={FINANCIAL_RATIO_MANIFEST.years}
        rows={rows}
        disclaimer={FINANCIAL_RATIO_MANIFEST.disclaimer}
      />
    </div>
  )
}

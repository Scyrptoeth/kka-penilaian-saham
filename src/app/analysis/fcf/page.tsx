import type { Metadata } from 'next'
import { FinancialTable } from '@/components/financial/FinancialTable'
import { loadCells } from '@/data/seed/loader'
import { FCF_MANIFEST } from '@/data/manifests/fcf'
import { buildRowsFromManifest } from '@/data/manifests/build'

export const metadata: Metadata = {
  title: 'Free Cash Flow — KKA Penilaian Saham',
}

export default function FcfPage() {
  const cells = loadCells('fcf')
  const rows = buildRowsFromManifest(FCF_MANIFEST, cells)

  return (
    <div className="mx-auto max-w-[1100px]">
      <FinancialTable
        title={FCF_MANIFEST.title}
        years={FCF_MANIFEST.years}
        rows={rows}
        disclaimer={FCF_MANIFEST.disclaimer}
      />
    </div>
  )
}

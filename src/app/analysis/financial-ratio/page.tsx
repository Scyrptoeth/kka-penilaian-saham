import type { Metadata } from 'next'
import { SheetPage } from '@/components/financial/SheetPage'
import { FINANCIAL_RATIO_MANIFEST } from '@/data/manifests/financial-ratio'

export const metadata: Metadata = {
  title: 'Financial Ratios — KKA Penilaian Saham',
}

export default function FinancialRatioPage() {
  return <SheetPage manifest={FINANCIAL_RATIO_MANIFEST} />
}

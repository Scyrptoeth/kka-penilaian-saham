import type { Metadata } from 'next'
import { FinancialRatioLiveView } from '@/components/analysis/FinancialRatioLiveView'

export const metadata: Metadata = {
  title: 'Financial Ratios — KKA Penilaian Saham',
}

export default function FinancialRatioPage() {
  return <FinancialRatioLiveView />
}

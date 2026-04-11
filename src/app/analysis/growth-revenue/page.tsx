import type { Metadata } from 'next'
import { SheetPage } from '@/components/financial/SheetPage'
import { GROWTH_REVENUE_MANIFEST } from '@/data/manifests/growth-revenue'

export const metadata: Metadata = {
  title: 'Growth Revenue — KKA Penilaian Saham',
}

export default function GrowthRevenuePage() {
  return <SheetPage manifest={GROWTH_REVENUE_MANIFEST} />
}

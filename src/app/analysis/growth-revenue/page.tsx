import type { Metadata } from 'next'
import { GrowthRevenueLiveView } from '@/components/analysis/GrowthRevenueLiveView'

export const metadata: Metadata = {
  title: 'Growth Revenue — KKA Penilaian Saham',
}

export default function GrowthRevenuePage() {
  return <GrowthRevenueLiveView />
}

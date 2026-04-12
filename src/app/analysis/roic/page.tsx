import type { Metadata } from 'next'
import { RoicLiveView } from '@/components/analysis/RoicLiveView'

export const metadata: Metadata = {
  title: 'ROIC — KKA Penilaian Saham',
}

export default function RoicPage() {
  return <RoicLiveView />
}

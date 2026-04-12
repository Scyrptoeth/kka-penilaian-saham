import type { Metadata } from 'next'
import { NoplatLiveView } from '@/components/analysis/NoplatLiveView'

export const metadata: Metadata = {
  title: 'NOPLAT — KKA Penilaian Saham',
}

export default function NoplatPage() {
  return <NoplatLiveView />
}

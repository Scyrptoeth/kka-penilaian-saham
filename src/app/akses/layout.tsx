import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Akses — KKA Penilaian Bisnis II',
  robots: { index: false, follow: false },
}

export default function AksesLayout({ children }: { children: React.ReactNode }) {
  return children
}

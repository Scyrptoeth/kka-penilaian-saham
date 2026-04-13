import type { Metadata } from 'next'
import { Inter, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import { Shell } from '@/components/layout/Shell'

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
})

const plexMono = IBM_Plex_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'KKA Penilaian Saham',
  description:
    'Kertas Kerja Analisis Penilaian Bisnis/Saham — tool internal penilai DJP. Privasi 100% client-side, tidak ada data yang dikirim ke server.',
  robots: { index: false, follow: false },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" className={`${inter.variable} ${plexMono.variable}`}>
      <body className="min-h-dvh bg-canvas text-ink antialiased">
        <Shell>{children}</Shell>
      </body>
    </html>
  )
}

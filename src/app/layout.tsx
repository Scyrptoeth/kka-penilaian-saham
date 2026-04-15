import type { Metadata } from 'next'
import { Montserrat, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Shell } from '@/components/layout/Shell'
import { ThemeProvider } from '@/components/layout/ThemeProvider'

const montserrat = Montserrat({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'KKA Penilaian Bisnis II',
  description:
    'KKA Penilaian Bisnis II: Alat Bantu Perhitungan Penilaian Bisnis II. Seluruh Proses Berjalan di Perangkat Anda. Tidak Ada Data yang Dikirim ke Server.',
  robots: { index: false, follow: false },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="id"
      className={`${montserrat.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-canvas text-ink antialiased">
        <ThemeProvider>
          <Shell>{children}</Shell>
        </ThemeProvider>
      </body>
    </html>
  )
}

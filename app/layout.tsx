import type { Metadata } from 'next'
import { Cormorant_Garamond, Inter_Tight, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
})

const interfaz = Inter_Tight({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-interfaz',
  display: 'swap',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    template: '%s | Colegio Ágora',
    default: 'Institución Educativa Ágora — Funza, Cundinamarca',
  },
  description:
    'El fundamento de un Estado es la educación de sus jóvenes. Bachillerato por ciclos CLEI en Funza, Cundinamarca.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO" className={`${display.variable} ${interfaz.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  )
}

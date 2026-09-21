import type { Metadata } from 'next'
import { Cormorant_Garamond, Inter_Tight, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { sitioIndexable, urlDelSitio } from '@/src/sitio'
import { NOMBRE_DEL_SITIO } from '@/src/seo/metadatos'

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

export const dynamic = 'force-dynamic'

export function generateMetadata(): Metadata {
  const indexable = sitioIndexable()
  return {
    metadataBase: urlDelSitio(),
    title: {
      template: `%s | ${NOMBRE_DEL_SITIO}`,
      default: NOMBRE_DEL_SITIO,
    },
    description:
      'Educación formal para jóvenes y adultos por Ciclos Lectivos Especiales Integrados (CLEI) en Funza, Cundinamarca.',
    applicationName: NOMBRE_DEL_SITIO,
    robots: indexable
      ? { index: true, follow: true }
      : { index: false, follow: false, googleBot: { index: false, follow: false } },
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO" className={`${display.variable} ${interfaz.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  )
}

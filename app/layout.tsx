import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import { Newsreader, Schibsted_Grotesk, Geist_Mono } from 'next/font/google'
import './globals.css'
import { sitioIndexable, urlDelSitio } from '@/src/sitio'
import { NOMBRE_DEL_SITIO } from '@/src/seo/metadatos'
import { SCRIPT_TEMA } from '@/src/ui/tema'
import { Avisos } from '@/src/ui/avisos'
import { SeguidorDeTema } from '@/src/ui/seguidor-de-tema'

const titulo = Newsreader({
  subsets: ['latin'],
  weight: 'variable',
  style: ['normal', 'italic'],
  axes: ['opsz'],
  variable: '--fuente-titulo',
  display: 'swap',
})

const interfaz = Schibsted_Grotesk({
  subsets: ['latin'],
  weight: 'variable',
  variable: '--fuente-interfaz',
  display: 'swap',
})

const mono = Geist_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--fuente-mono',
  display: 'swap',
})

export const dynamic = 'force-dynamic'

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
}

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined

  return (
    <html
      lang="es-CO"
      suppressHydrationWarning
      className={`${titulo.variable} ${interfaz.variable} ${mono.variable}`}
    >
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body>
        {children}
        <Avisos />
        <SeguidorDeTema />
      </body>
    </html>
  )
}

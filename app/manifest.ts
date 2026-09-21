import type { MetadataRoute } from 'next'
import { obtenerConfiguracion, nombreCorto, nombreLegal } from '@/src/datos/configuracion-publica'

export const dynamic = 'force-dynamic'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const config = await obtenerConfiguracion()
  return {
    name: nombreLegal(config),
    short_name: nombreCorto(config),
    description:
      'Educación formal para jóvenes y adultos por Ciclos Lectivos Especiales Integrados (CLEI).',
    lang: 'es-CO',
    start_url: '/inicio',
    scope: '/',
    display: 'browser',
    background_color: '#F6F4EF',
    theme_color: '#0B0B0C',
    icons: [
      { src: '/marca/icono-32.png', sizes: '32x32', type: 'image/png' },
      { src: '/marca/icono-180.png', sizes: '180x180', type: 'image/png' },
      { src: '/marca/icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  }
}

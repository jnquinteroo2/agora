import type { Metadata } from 'next'

export const NOMBRE_DEL_SITIO = 'Colegio Ágora'

export const CONTENIDO_DE_PRUEBA = new Set(['album-de-prueba'])

export function esContenidoDePrueba(slug: string): boolean {
  return CONTENIDO_DE_PRUEBA.has(slug)
}

export function metadatosDePagina({
  titulo,
  descripcion,
  ruta,
  tipo = 'website',
  indexar = true,
  tituloAbsoluto = false,
  imagenDelSitio = true,
}: {
  titulo: string
  descripcion: string
  ruta: string
  tipo?: 'website' | 'article'
  indexar?: boolean
  tituloAbsoluto?: boolean
  imagenDelSitio?: boolean
}): Metadata {
  const imagenOg = imagenDelSitio
    ? {
        images: [
          {
            url: '/opengraph-image',
            width: 1200,
            height: 630,
            alt: 'Escudo y nombre del Colegio Ágora sobre fondo negro',
          },
        ],
      }
    : {}
  const imagenTwitter = imagenDelSitio ? { images: ['/twitter-image'] } : {}
  return {
    title: tituloAbsoluto ? { absolute: titulo } : titulo,
    description: descripcion,
    alternates: { canonical: ruta },
    openGraph: {
      title: titulo,
      description: descripcion,
      url: ruta,
      siteName: NOMBRE_DEL_SITIO,
      locale: 'es_CO',
      type: tipo,
      ...imagenOg,
    },
    twitter: {
      card: 'summary_large_image',
      title: titulo,
      description: descripcion,
      ...imagenTwitter,
    },
    ...(indexar ? {} : { robots: { index: false, follow: false } }),
  }
}

export function resumir(texto: string, maximo = 158): string {
  const limpio = texto.replace(/\s+/g, ' ').trim()
  if (limpio.length <= maximo) return limpio
  const corte = limpio.slice(0, maximo - 1)
  const espacio = corte.lastIndexOf(' ')
  return `${(espacio > maximo * 0.6 ? corte.slice(0, espacio) : corte).replace(/[\s,.;:]+$/, '')}…`
}

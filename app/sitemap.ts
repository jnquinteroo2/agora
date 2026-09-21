import type { MetadataRoute } from 'next'
import { obtenerAlbumes, obtenerEntradas } from '@/src/datos/cms-publico'
import {
  DECLARACION_ACCESIBILIDAD,
  POLITICA_COOKIES,
  POLITICA_DATOS,
  TERMINOS_DE_USO,
} from '@/src/legal/versiones'
import { esContenidoDePrueba } from '@/src/seo/metadatos'
import { urlAbsoluta } from '@/src/sitio'

export const dynamic = 'force-dynamic'

const RUTAS_FIJAS = [
  '/inicio',
  '/institucion',
  '/modelo-clei',
  '/oferta',
  '/admisiones',
  '/galeria',
  '/blog',
  '/aliados',
  '/contacto',
]

const DOCUMENTOS_LEGALES = [
  { ruta: '/privacidad', vigenteDesde: POLITICA_DATOS.vigenteDesde },
  { ruta: '/cookies', vigenteDesde: POLITICA_COOKIES.vigenteDesde },
  { ruta: '/terminos', vigenteDesde: TERMINOS_DE_USO.vigenteDesde },
  { ruta: '/accesibilidad', vigenteDesde: DECLARACION_ACCESIBILIDAD.vigenteDesde },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [noticias, albumes] = await Promise.all([obtenerEntradas('noticia'), obtenerAlbumes()])

  return [
    ...RUTAS_FIJAS.map((ruta) => ({ url: urlAbsoluta(ruta) })),
    ...DOCUMENTOS_LEGALES.map((documento) => ({
      url: urlAbsoluta(documento.ruta),
      lastModified: new Date(`${documento.vigenteDesde}T12:00:00-05:00`),
    })),
    ...noticias.map((entrada) => ({
      url: urlAbsoluta(`/blog/${entrada.slug}`),
      lastModified: entrada.actualizadoEn,
    })),
    ...albumes
      .filter((album) => !esContenidoDePrueba(album.slug))
      .map((album) => ({
        url: urlAbsoluta(`/galeria/${album.slug}`),
        lastModified: album.actualizadoEn,
      })),
  ]
}

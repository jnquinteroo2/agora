import { obtenerEntrada } from '@/src/datos/cms-publico'
import { obtenerConfiguracion, nombreCorto } from '@/src/datos/configuracion-publica'
import { imagenDeEntrada, imagenDelSitio, TAMANO_OG } from '@/src/seo/imagen-og'

export const dynamic = 'force-dynamic'
export const alt = 'Título de la noticia sobre fondo negro, con el escudo del Colegio Ágora'
export const size = TAMANO_OG
export const contentType = 'image/png'

export default async function Imagen({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [entrada, config] = await Promise.all([
    obtenerEntrada('noticia', slug),
    obtenerConfiguracion(),
  ])
  const nombre = nombreCorto(config)
  if (!entrada) return imagenDelSitio(nombre)
  return imagenDeEntrada(entrada.titulo, 'Noticias', nombre)
}

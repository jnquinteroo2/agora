import { imagenDelSitio, TAMANO_OG } from '@/src/seo/imagen-og'

export const alt = 'Escudo y nombre del Colegio Ágora sobre fondo negro'
export const size = TAMANO_OG
export const contentType = 'image/png'

export default async function ImagenTwitter() {
  return imagenDelSitio('Colegio Ágora')
}

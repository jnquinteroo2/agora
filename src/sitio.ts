const URL_DE_DESARROLLO = 'http://localhost:3000'

function enBuild(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build'
}

function leerUrl(): URL | null {
  const valor = process.env.SITIO_URL?.trim()
  if (!valor) return null
  try {
    const url = new URL(valor)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url
  } catch {
    return null
  }
}

export function exigirConfiguracionDelSitio(): void {
  if (process.env.NODE_ENV !== 'production' || enBuild()) return
  if (!leerUrl()) {
    throw new Error(
      'Falta la variable de entorno SITIO_URL o no es una URL válida. Defina la URL pública del sitio, por ejemplo SITIO_URL=https://dominio.example, y reinicie el servicio.'
    )
  }
}

export function urlDelSitio(): URL {
  const url = leerUrl()
  if (url) return url
  if (process.env.NODE_ENV === 'production' && !enBuild()) {
    throw new Error('Falta la variable de entorno SITIO_URL.')
  }
  return new URL(URL_DE_DESARROLLO)
}

export function urlAbsoluta(ruta: string): string {
  return new URL(ruta, urlDelSitio()).toString()
}

export function sitioIndexable(): boolean {
  return process.env.SITIO_INDEXABLE?.trim().toLowerCase() === 'true'
}

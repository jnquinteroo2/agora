import { readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { test, expect } from '@playwright/test'
import { exigirStackLocal } from './stack-local'

exigirStackLocal()

const RAIZ = join(process.cwd(), 'app')

const API_PUBLICAS = new Set([
  'app/api/health/route.ts',
  'app/api/verificar/[id]/route.ts',
  'app/api/auth/[...all]/route.ts',
  'app/api/pdf/render/[tipo]/[entidadId]/route.ts',
  'app/api/galeria/imagen/[archivoId]/route.ts',
])

function archivos(directorio: string, nombre: string): string[] {
  return readdirSync(directorio).flatMap((entrada) => {
    const ruta = join(directorio, entrada)
    if (statSync(ruta).isDirectory()) return archivos(ruta, nombre)
    return entrada === nombre ? [ruta] : []
  })
}

function aUrl(archivo: string): string {
  const segmentos = relative(RAIZ, archivo)
    .split(sep)
    .slice(0, -1)
    .filter((segmento) => !/^\(.*\)$/.test(segmento))
    .map((segmento) => {
      if (/^\[\.\.\..+\]$/.test(segmento)) return 'get-session'
      if (/^\[.+\]$/.test(segmento)) return '00000000-0000-7000-8000-000000000000'
      return segmento
    })
  return `/${segmentos.join('/')}`
}

const rutas = [
  ...archivos(join(RAIZ, 'panel'), 'page.tsx'),
  ...archivos(join(RAIZ, 'api'), 'route.ts'),
].map((archivo) => ({
  archivo: relative(process.cwd(), archivo).split(sep).join('/'),
  url: aUrl(archivo),
}))

test('se encontraron rutas del panel y de la API en el sistema de archivos', () => {
  expect(rutas.filter((r) => r.url.startsWith('/panel')).length).toBeGreaterThan(0)
  expect(rutas.filter((r) => r.url.startsWith('/api')).length).toBeGreaterThan(0)
  for (const publica of API_PUBLICAS) {
    expect(rutas.map((r) => r.archivo)).toContain(publica)
  }
})

for (const { archivo, url } of rutas) {
  const publica = API_PUBLICAS.has(archivo)
  test(`${archivo} sin sesión ${publica ? 'no redirige a /login' : 'redirige a /login'}`, async ({
    request,
  }) => {
    const respuesta = await request.get(url, { maxRedirects: 0 })
    if (publica) {
      expect(respuesta.status(), `${url} es pública y no debe redirigir`).not.toBe(307)
      return
    }
    expect(respuesta.status(), `${url} debe exigir sesión`).toBe(307)
    expect(respuesta.headers()['location']).toBe(`/login?callbackUrl=${encodeURIComponent(url)}`)
  })
}

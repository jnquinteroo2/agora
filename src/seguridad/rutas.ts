export type TipoDeRuta = 'publica' | 'protegida' | 'solo-sin-sesion'

export const RUTAS_SOLO_SIN_SESION = ['/login', '/recuperar-contrasena', '/registro']

export const API_PUBLICAS: RegExp[] = [
  /^\/api\/health$/,
  /^\/api\/verificar\/[^/]+$/,
  /^\/api\/auth\/.+$/,
  /^\/api\/pdf\/render\/[^/]+\/[^/]+$/,
  /^\/api\/galeria\/imagen\/[^/]+$/,
]

function bajo(pathname: string, prefijo: string): boolean {
  return pathname === prefijo || pathname.startsWith(`${prefijo}/`)
}

export function clasificarRuta(pathname: string): TipoDeRuta {
  if (RUTAS_SOLO_SIN_SESION.includes(pathname)) return 'solo-sin-sesion'
  if (bajo(pathname, '/panel')) return 'protegida'
  if (bajo(pathname, '/api')) {
    return API_PUBLICAS.some((patron) => patron.test(pathname)) ? 'publica' : 'protegida'
  }
  return 'publica'
}

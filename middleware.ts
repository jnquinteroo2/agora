import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { auth } from '@/src/auth/config'
import { db, conContextoRLS } from '@/src/datos/cliente'
import { usuario as tablaUsuario } from '@/src/datos/esquema'

const RUTAS_PUBLICAS = new Set([
  '/',
  '/inicio',
  '/institucion',
  '/modelo-clei',
  '/oferta',
  '/admisiones',
  '/galeria',
  '/blog',
  '/aliados',
  '/contacto',
  '/privacidad',
])

const PREFIJOS_PUBLICOS = ['/blog/', '/galeria/', '/admisiones/']

const RUTAS_SOLO_SIN_SESION = ['/login', '/recuperar-contrasena', '/registro']

const PREFIJOS_ROL: Array<[string, string[]]> = [
  ['/panel/admin', ['superadmin']],
  ['/panel/docente', ['docente']],
  ['/panel/estudiante', ['estudiante']],
]

function construirCSP(nonce: string): string {
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self' data:`,
    `connect-src 'self'`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join('; ')
}

function conCSP(response: NextResponse, nonce: string): NextResponse {
  response.headers.set('Content-Security-Policy', construirCSP(nonce))
  return response
}

async function rolDelUsuario(usuarioId: string): Promise<string> {
  try {
    const [u] = await conContextoRLS(db, { usuarioId, rol: 'anonimo' }, async (tx) =>
      tx
        .select({ rol: tablaUsuario.rol, activo: tablaUsuario.activo })
        .from(tablaUsuario)
        .where(eq(tablaUsuario.id, usuarioId))
        .limit(1)
    )
    return u && u.activo ? u.rol : ''
  } catch {
    return ''
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const nonce = crypto.randomUUID().replace(/-/g, '')
  const encabezadosConNonce = new Headers(request.headers)
  encabezadosConNonce.set('x-nonce', nonce)
  encabezadosConNonce.set('Content-Security-Policy', construirCSP(nonce))

  const siguienteConNonce = () =>
    conCSP(NextResponse.next({ request: { headers: encabezadosConNonce } }), nonce)

  if (
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/api/verificar') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/pdf/render') ||
    pathname.startsWith('/api/galeria/imagen') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/public')
  ) {
    return siguienteConNonce()
  }

  const esPublica =
    RUTAS_PUBLICAS.has(pathname) ||
    PREFIJOS_PUBLICOS.some((p) => pathname.startsWith(p))

  if (esPublica) return siguienteConNonce()

  const esSoloSinSesion = RUTAS_SOLO_SIN_SESION.includes(pathname)

  let sesion: Awaited<ReturnType<typeof auth.api.getSession>> | null = null
  try {
    sesion = await auth.api.getSession({ headers: request.headers })
  } catch {
    sesion = null
  }

  if (esSoloSinSesion) {
    if (sesion) return conCSP(NextResponse.redirect(new URL('/panel', request.url)), nonce)
    return siguienteConNonce()
  }

  if (!sesion) {
    const url = new URL('/login', request.url)
    url.searchParams.set('callbackUrl', pathname)
    return conCSP(NextResponse.redirect(url), nonce)
  }

  const rolRequerido = PREFIJOS_ROL.find(([prefijo]) => pathname.startsWith(prefijo))
  if (!rolRequerido) return siguienteConNonce()

  const [, rolesPermitidos] = rolRequerido
  const rolUsuario = await rolDelUsuario(sesion.user.id)

  if (!rolesPermitidos.includes(rolUsuario)) {
    return conCSP(NextResponse.redirect(new URL('/sin-acceso', request.url)), nonce)
  }

  return siguienteConNonce()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|marca).*)'],
  runtime: 'nodejs',
}

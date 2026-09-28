import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { auth } from '@/src/auth/config'
import { db, conContextoRLS } from '@/src/datos/cliente'
import { usuario as tablaUsuario } from '@/src/datos/esquema'
import { clasificarRuta } from '@/src/seguridad/rutas'
import { rolesParaRuta } from '@/src/auth/roles'

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

  const tipo = clasificarRuta(pathname)

  if (tipo === 'publica') return siguienteConNonce()

  const esSoloSinSesion = tipo === 'solo-sin-sesion'

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

  const rolesPermitidos = rolesParaRuta(pathname)
  if (!rolesPermitidos) return siguienteConNonce()

  const rolUsuario = await rolDelUsuario(sesion.user.id)

  if (!(rolesPermitidos as readonly string[]).includes(rolUsuario)) {
    return conCSP(NextResponse.redirect(new URL('/sin-acceso', request.url)), nonce)
  }

  return siguienteConNonce()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|marca).*)'],
  runtime: 'nodejs',
}

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.hoisted(() => {
  process.env['KEYCLOAK_EMISOR'] = 'http://localhost:8082/realms/agora'
  process.env['KEYCLOAK_URL_INTERNA'] = 'http://keycloak:8080/realms/agora'
  process.env['KEYCLOAK_CLIENTE_ID'] = 'plataforma-agora'
  process.env['KEYCLOAK_ADMIN_CLIENTE_SECRETO'] = 'x'.repeat(40)
})

import {
  accionesRequeridasPara,
  generarNombreUsuario,
  generarContrasenaTemporal,
  correoInterno,
  nombreDeUsuarioVisible,
  emisorKeycloak,
} from '../../src/auth/idp/cuentas'
import {
  compararIdentidad,
  esCallbackDeKeycloak,
  leerReclamos,
  perfilDesdeReclamos,
} from '../../src/auth/idp/doble-control'
import {
  crearUsuarioIdp,
  borrarUsuarioIdp,
  enviarInvitacionIdp,
  ErrorIdpConflicto,
  VIGENCIA_INVITACION_SEGUNDOS,
} from '../../src/auth/idp/keycloak-admin'

function token(reclamos: Record<string, unknown>): string {
  const parte = (valor: unknown) => Buffer.from(JSON.stringify(valor)).toString('base64url')
  return `${parte({ alg: 'RS256' })}.${parte(reclamos)}.firma`
}

describe('acciones requeridas por perfil', () => {
  it('exige TOTP a Superadministrador, Administrador, Secretaría y Contador', () => {
    for (const rol of ['superadmin', 'admin', 'secretaria', 'contador']) {
      expect(accionesRequeridasPara(rol)).toEqual(['UPDATE_PASSWORD', 'CONFIGURE_TOTP'])
    }
  })

  it('deja el TOTP opcional para Profesor, Estudiante y Acudiente', () => {
    for (const rol of ['docente', 'estudiante', 'acudiente']) {
      expect(accionesRequeridasPara(rol)).toEqual(['UPDATE_PASSWORD'])
    }
  })
})

describe('cuentas sin correo', () => {
  it('genera nombres de usuario sin datos personales', () => {
    const nombres = new Set(Array.from({ length: 200 }, generarNombreUsuario))
    expect(nombres.size).toBe(200)
    for (const nombre of nombres) expect(nombre).toMatch(/^est-[a-z2-9]{8}$/)
  })

  it('genera contraseñas temporales que cumplen la política del realm', () => {
    for (let i = 0; i < 100; i++) {
      const contrasena = generarContrasenaTemporal()
      expect(contrasena.length).toBeGreaterThanOrEqual(12)
      expect(contrasena).toMatch(/[0-9]/)
      expect(contrasena).toMatch(/[#%+=?@]/)
    }
  })

  it('usa un dominio reservado que nunca recibe correo', () => {
    expect(correoInterno('est-abcd2345')).toBe('est-abcd2345@sin-correo.invalid')
    expect(nombreDeUsuarioVisible('est-abcd2345@sin-correo.invalid', true)).toBe('est-abcd2345')
    expect(nombreDeUsuarioVisible('ana@example.com', false)).toBe('ana@example.com')
  })

  it('normaliza el emisor sin barra final', () => {
    expect(emisorKeycloak()).toBe('http://localhost:8082/realms/agora')
  })
})

describe('doble control del ingreso por Keycloak', () => {
  const usuarioId = '0190f5a2-0000-4000-8000-000000000001'
  const sub = '5b1c1c1e-1111-4111-8111-111111111111'

  it('acepta solo cuando sub y agora_usuario_id coinciden y la cuenta está activa', () => {
    const reclamos = { sub, agora_usuario_id: usuarioId }
    expect(compararIdentidad({ usuarioId, sub, reclamos, activo: true })).toBeNull()
  })

  it('rechaza cada forma de desajuste', () => {
    expect(compararIdentidad({ usuarioId, sub: null, reclamos: null, activo: true })).toBe(
      'sin_enlace'
    )
    expect(compararIdentidad({ usuarioId, sub, reclamos: null, activo: true })).toBe('sin_token')
    expect(
      compararIdentidad({ usuarioId, sub, reclamos: { sub: 'otro' }, activo: true })
    ).toBe('sub_distinto')
    expect(compararIdentidad({ usuarioId, sub, reclamos: { sub }, activo: true })).toBe(
      'sin_reclamo'
    )
    expect(
      compararIdentidad({
        usuarioId,
        sub,
        reclamos: { sub, agora_usuario_id: '0190f5a2-0000-4000-8000-000000000002' },
        activo: true,
      })
    ).toBe('usuario_distinto')
    expect(
      compararIdentidad({ usuarioId, sub, reclamos: { sub, agora_usuario_id: usuarioId }, activo: false })
    ).toBe('cuenta_inactiva')
  })

  it('lee los reclamos del token de ID', () => {
    expect(leerReclamos(token({ sub, agora_usuario_id: usuarioId }))).toMatchObject({ sub })
    expect(leerReclamos('no-es-un-token')).toBeNull()
  })

  it('arma el perfil con el correo propio o con el interno si no hay correo', () => {
    expect(
      perfilDesdeReclamos({ sub, email: 'Ana@Example.com', email_verified: true, name: 'Ana' })
    ).toMatchObject({ id: sub, email: 'ana@example.com', emailVerified: true })
    expect(perfilDesdeReclamos({ sub, preferred_username: 'est-abcd2345' })).toMatchObject({
      email: 'est-abcd2345@sin-correo.invalid',
    })
    expect(perfilDesdeReclamos({ preferred_username: 'x' })).toBeNull()
  })

  it('solo se activa en el callback de Keycloak', () => {
    expect(esCallbackDeKeycloak({ path: '/callback/:id', params: { id: 'keycloak' } })).toBe(true)
    expect(esCallbackDeKeycloak({ path: '/sign-in/email', params: {} })).toBe(false)
    expect(esCallbackDeKeycloak({ path: '/callback/:id', params: { id: 'otro' } })).toBe(false)
    expect(esCallbackDeKeycloak(null)).toBe(false)
  })
})

describe('cliente de la Admin API de Keycloak', () => {
  const llamadas: Array<{ url: string; init?: RequestInit }> = []
  let respuestas: Response[] = []

  beforeEach(() => {
    llamadas.length = 0
    respuestas = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL, init?: RequestInit) => {
        const texto = String(url)
        llamadas.push({ url: texto, init })
        if (texto.endsWith('/protocol/openid-connect/token')) {
          return new Response(JSON.stringify({ access_token: 'tok', expires_in: 60 }), {
            status: 200,
          })
        }
        return respuestas.shift() ?? new Response(null, { status: 500 })
      })
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('crea el usuario por la red interna y devuelve el sub', async () => {
    respuestas.push(
      new Response(null, {
        status: 201,
        headers: {
          location:
            'http://keycloak:8080/admin/realms/agora/users/5b1c1c1e-1111-4111-8111-111111111111',
        },
      })
    )
    const sub = await crearUsuarioIdp({
      usuarioId: '0190f5a2-0000-4000-8000-000000000001',
      nombreUsuario: 'ana@example.com',
      correo: 'ana@example.com',
      nombres: 'Ana',
      apellidos: 'Pérez',
      accionesRequeridas: ['UPDATE_PASSWORD'],
    })
    expect(sub).toBe('5b1c1c1e-1111-4111-8111-111111111111')
    const creacion = llamadas.find((l) => l.url.endsWith('/admin/realms/agora/users'))!
    expect(creacion.url.startsWith('http://keycloak:8080/')).toBe(true)
    const cuerpo = JSON.parse(String(creacion.init?.body))
    expect(cuerpo).toMatchObject({
      username: 'ana@example.com',
      enabled: true,
      requiredActions: ['UPDATE_PASSWORD'],
      attributes: { agora_usuario_id: ['0190f5a2-0000-4000-8000-000000000001'] },
    })
    expect(cuerpo.credentials).toBeUndefined()
  })

  it('traduce el 409 a un conflicto sin reintentar', async () => {
    respuestas.push(new Response(null, { status: 409 }))
    await expect(
      crearUsuarioIdp({
        usuarioId: '0190f5a2-0000-4000-8000-000000000001',
        nombreUsuario: 'ana@example.com',
        correo: 'ana@example.com',
        nombres: 'Ana',
        apellidos: 'Pérez',
        accionesRequeridas: ['UPDATE_PASSWORD'],
      })
    ).rejects.toBeInstanceOf(ErrorIdpConflicto)
    expect(llamadas.filter((l) => l.url.endsWith('/users'))).toHaveLength(1)
  })

  it('da por borrado un usuario que ya no existe', async () => {
    respuestas.push(new Response(null, { status: 404 }))
    await expect(borrarUsuarioIdp('5b1c1c1e-1111-4111-8111-111111111111')).resolves.toBeUndefined()
  })

  it('envía la invitación con vigencia de 72 horas', async () => {
    respuestas.push(new Response(null, { status: 204 }))
    await enviarInvitacionIdp('5b1c1c1e-1111-4111-8111-111111111111', ['UPDATE_PASSWORD'])
    const invitacion = llamadas.find((l) => l.url.includes('execute-actions-email'))!
    const url = new URL(invitacion.url)
    expect(url.searchParams.get('lifespan')).toBe(String(VIGENCIA_INVITACION_SEGUNDOS))
    expect(VIGENCIA_INVITACION_SEGUNDOS).toBe(259200)
    expect(url.searchParams.get('client_id')).toBe('plataforma-agora')
  })
})

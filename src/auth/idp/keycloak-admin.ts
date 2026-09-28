import { env } from '../../env'

export class ErrorIdp extends Error {
  readonly estado: number | null

  constructor(mensaje: string, estado: number | null) {
    super(mensaje)
    this.name = 'ErrorIdp'
    this.estado = estado
  }
}

export class ErrorIdpConflicto extends ErrorIdp {
  constructor() {
    super('Ya existe una cuenta con ese nombre de usuario o correo en Keycloak', 409)
    this.name = 'ErrorIdpConflicto'
  }
}

export interface DatosUsuarioIdp {
  usuarioId: string
  nombreUsuario: string
  correo: string | null
  nombres: string
  apellidos: string
  accionesRequeridas: string[]
  contrasenaTemporal?: string
}

export interface UsuarioIdp {
  id: string
  username: string
  email?: string
  emailVerified?: boolean
  firstName?: string
  lastName?: string
  enabled: boolean
  requiredActions?: string[]
  attributes?: Record<string, string[]>
}

export const VIGENCIA_INVITACION_SEGUNDOS = 72 * 60 * 60

const TIEMPO_MAXIMO_MS = 10_000

function urlDelRealm(): URL {
  const base = env.KEYCLOAK_URL_INTERNA ?? env.KEYCLOAK_EMISOR
  if (!base) throw new ErrorIdp('Falta KEYCLOAK_URL_INTERNA o KEYCLOAK_EMISOR', null)
  return new URL(base.replace(/\/$/, ''))
}

function urlAdmin(ruta: string): URL {
  const realm = urlDelRealm()
  return new URL(`${realm.origin}/admin${realm.pathname}${ruta}`)
}

let tokenEnCache: { valor: string; venceEn: number } | null = null

async function tokenDeServicio(): Promise<string> {
  if (tokenEnCache && tokenEnCache.venceEn > Date.now()) return tokenEnCache.valor
  if (!env.KEYCLOAK_ADMIN_CLIENTE_SECRETO) {
    throw new ErrorIdp('Falta KEYCLOAK_ADMIN_CLIENTE_SECRETO', null)
  }
  const realm = urlDelRealm()
  let respuesta: Response
  try {
    respuesta = await fetch(`${realm.toString()}/protocol/openid-connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: env.KEYCLOAK_ADMIN_CLIENTE_ID,
        client_secret: env.KEYCLOAK_ADMIN_CLIENTE_SECRETO,
      }),
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
    })
  } catch {
    throw new ErrorIdp('No fue posible conectar con Keycloak', null)
  }
  if (!respuesta.ok) {
    throw new ErrorIdp(`Keycloak rechazó la cuenta de servicio (${respuesta.status})`, respuesta.status)
  }
  const datos = (await respuesta.json()) as { access_token: string; expires_in: number }
  tokenEnCache = {
    valor: datos.access_token,
    venceEn: Date.now() + Math.max(datos.expires_in - 15, 5) * 1000,
  }
  return datos.access_token
}

async function solicitar(
  metodo: 'GET' | 'POST' | 'PUT' | 'DELETE',
  ruta: string,
  opciones: { cuerpo?: unknown; consulta?: Record<string, string> } = {}
): Promise<Response> {
  const token = await tokenDeServicio()
  const url = urlAdmin(ruta)
  for (const [clave, valor] of Object.entries(opciones.consulta ?? {})) {
    url.searchParams.set(clave, valor)
  }
  let respuesta: Response
  try {
    respuesta = await fetch(url, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(opciones.cuerpo === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: opciones.cuerpo === undefined ? undefined : JSON.stringify(opciones.cuerpo),
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
    })
  } catch {
    throw new ErrorIdp('No fue posible conectar con Keycloak', null)
  }
  if (respuesta.status === 401) tokenEnCache = null
  return respuesta
}

async function exigirExito(respuesta: Response, operacion: string): Promise<void> {
  if (respuesta.ok) return
  if (respuesta.status === 409) throw new ErrorIdpConflicto()
  throw new ErrorIdp(`Keycloak respondió ${respuesta.status} al ${operacion}`, respuesta.status)
}

export async function crearUsuarioIdp(datos: DatosUsuarioIdp): Promise<string> {
  const respuesta = await solicitar('POST', '/users', {
    cuerpo: {
      username: datos.nombreUsuario,
      ...(datos.correo ? { email: datos.correo, emailVerified: true } : {}),
      firstName: datos.nombres,
      lastName: datos.apellidos,
      enabled: true,
      requiredActions: datos.accionesRequeridas,
      attributes: { agora_usuario_id: [datos.usuarioId] },
      ...(datos.contrasenaTemporal
        ? {
            credentials: [
              { type: 'password', value: datos.contrasenaTemporal, temporary: true },
            ],
          }
        : {}),
    },
  })
  await exigirExito(respuesta, 'crear el usuario')
  const ubicacion = respuesta.headers.get('location') ?? ''
  const sub = ubicacion.split('/').pop() ?? ''
  if (!/^[0-9a-f-]{36}$/i.test(sub)) {
    throw new ErrorIdp('Keycloak no devolvió el identificador del usuario creado', respuesta.status)
  }
  return sub
}

export async function leerUsuarioIdp(sub: string): Promise<UsuarioIdp | null> {
  const respuesta = await solicitar('GET', `/users/${encodeURIComponent(sub)}`)
  if (respuesta.status === 404) return null
  await exigirExito(respuesta, 'leer el usuario')
  return (await respuesta.json()) as UsuarioIdp
}

export async function buscarUsuarioIdpPorUsuarioAgora(usuarioId: string): Promise<string | null> {
  const respuesta = await solicitar('GET', '/users', {
    consulta: { q: `agora_usuario_id:${usuarioId}`, exact: 'true', briefRepresentation: 'true' },
  })
  await exigirExito(respuesta, 'buscar el usuario')
  const usuarios = (await respuesta.json()) as Array<{ id: string }>
  return usuarios[0]?.id ?? null
}

export async function borrarUsuarioIdp(sub: string): Promise<void> {
  const respuesta = await solicitar('DELETE', `/users/${encodeURIComponent(sub)}`)
  if (respuesta.status === 404) return
  await exigirExito(respuesta, 'borrar el usuario')
}

async function actualizarUsuarioIdp(sub: string, cambios: Partial<UsuarioIdp>): Promise<void> {
  const actual = await leerUsuarioIdp(sub)
  if (!actual) throw new ErrorIdp('El usuario no existe en Keycloak', 404)
  const respuesta = await solicitar('PUT', `/users/${encodeURIComponent(sub)}`, {
    cuerpo: { ...actual, ...cambios },
  })
  await exigirExito(respuesta, 'actualizar el usuario')
}

export async function fijarHabilitadoIdp(sub: string, habilitado: boolean): Promise<void> {
  await actualizarUsuarioIdp(sub, { enabled: habilitado })
}

export async function cerrarSesionesIdp(sub: string): Promise<void> {
  const respuesta = await solicitar('POST', `/users/${encodeURIComponent(sub)}/logout`)
  await exigirExito(respuesta, 'cerrar las sesiones')
}

export async function actualizarCorreoIdp(sub: string, correo: string): Promise<void> {
  await actualizarUsuarioIdp(sub, { email: correo, username: correo, emailVerified: true })
}

export async function fijarContrasenaTemporalIdp(sub: string, contrasena: string): Promise<void> {
  const respuesta = await solicitar('PUT', `/users/${encodeURIComponent(sub)}/reset-password`, {
    cuerpo: { type: 'password', value: contrasena, temporary: true },
  })
  await exigirExito(respuesta, 'fijar la contraseña temporal')
}

export async function enviarInvitacionIdp(sub: string, acciones: string[]): Promise<void> {
  const consulta: Record<string, string> = { lifespan: String(VIGENCIA_INVITACION_SEGUNDOS) }
  if (env.KEYCLOAK_CLIENTE_ID) consulta['client_id'] = env.KEYCLOAK_CLIENTE_ID
  const respuesta = await solicitar(
    'PUT',
    `/users/${encodeURIComponent(sub)}/execute-actions-email`,
    { cuerpo: acciones, consulta }
  )
  await exigirExito(respuesta, 'enviar la invitación')
}

export async function agregarAccionRequeridaIdp(sub: string, accion: string): Promise<void> {
  const actual = await leerUsuarioIdp(sub)
  if (!actual) throw new ErrorIdp('El usuario no existe en Keycloak', 404)
  const acciones = new Set(actual.requiredActions ?? [])
  if (acciones.has(accion)) return
  acciones.add(accion)
  await actualizarUsuarioIdp(sub, { requiredActions: [...acciones] })
}

import { randomInt } from 'crypto'
import { and, eq } from 'drizzle-orm'
import { env } from '../../env'
import { db, conContextoRLS, registrarAuditoria, type ContextoRLS } from '../../datos/cliente'
import { usuario, baAccount } from '../../datos/esquema'
import { cerrarSesionesIdp, fijarHabilitadoIdp } from './keycloak-admin'

export const PROVEEDOR_KEYCLOAK = 'keycloak'

export const DOMINIO_SIN_CORREO = 'sin-correo.invalid'

export const ROLES_CON_TOTP_OBLIGATORIO: readonly string[] = [
  'superadmin',
  'admin',
  'secretaria',
  'contador',
]

const ALFABETO_USUARIO = 'abcdefghjkmnpqrstuvwxyz23456789'
const ALFABETO_CONTRASENA = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
const SIMBOLOS_CONTRASENA = '#%+=?@'

function aleatorio(alfabeto: string, largo: number): string {
  let salida = ''
  for (let i = 0; i < largo; i++) salida += alfabeto[randomInt(alfabeto.length)]
  return salida
}

export function accionesRequeridasPara(rol: string): string[] {
  return ROLES_CON_TOTP_OBLIGATORIO.includes(rol)
    ? ['UPDATE_PASSWORD', 'CONFIGURE_TOTP']
    : ['UPDATE_PASSWORD']
}

export function generarNombreUsuario(): string {
  return `est-${aleatorio(ALFABETO_USUARIO, 8)}`
}

export function generarContrasenaTemporal(): string {
  const base = aleatorio(ALFABETO_CONTRASENA, 14).split('')
  base.splice(randomInt(base.length + 1), 0, SIMBOLOS_CONTRASENA[randomInt(SIMBOLOS_CONTRASENA.length)]!)
  base.splice(randomInt(base.length + 1), 0, String(randomInt(2, 10)))
  return base.join('')
}

export function correoInterno(nombreUsuario: string): string {
  return `${nombreUsuario}@${DOMINIO_SIN_CORREO}`
}

export function nombreDeUsuarioVisible(correo: string, sinCorreo: boolean): string {
  return sinCorreo ? (correo.split('@')[0] ?? correo) : correo
}

export function emisorKeycloak(): string {
  if (!env.KEYCLOAK_EMISOR) throw new Error('Falta KEYCLOAK_EMISOR')
  return env.KEYCLOAK_EMISOR.replace(/\/$/, '')
}

export function mensajeDeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export type ResultadoSincronizacion = 'sincronizado' | 'pendiente' | 'sin_enlace'

export interface ActorSistema {
  id?: string
  rol: string
}

export async function subDeKeycloak(usuarioId: string): Promise<string | null> {
  const [cuenta] = await db
    .select({ sub: baAccount.accountId })
    .from(baAccount)
    .where(and(eq(baAccount.userId, usuarioId), eq(baAccount.providerId, PROVEEDOR_KEYCLOAK)))
    .limit(1)
  return cuenta?.sub ?? null
}

export async function sincronizarEstadoIdp(
  usuarioId: string,
  contexto: ContextoRLS,
  actor: ActorSistema
): Promise<ResultadoSincronizacion> {
  const [fila] = await conContextoRLS(db, contexto, (tx) =>
    tx
      .select({ activo: usuario.activo, intentos: usuario.idpIntentos })
      .from(usuario)
      .where(eq(usuario.id, usuarioId))
      .limit(1)
  )
  if (!fila) throw new Error('El usuario indicado no existe')

  const sub = await subDeKeycloak(usuarioId)
  if (!sub) {
    await conContextoRLS(db, contexto, (tx) =>
      tx.update(usuario).set({ idpPendiente: false }).where(eq(usuario.id, usuarioId))
    )
    return 'sin_enlace'
  }

  let fallo: string | null = null
  try {
    await fijarHabilitadoIdp(sub, fila.activo)
    if (!fila.activo) await cerrarSesionesIdp(sub)
  } catch (error) {
    fallo = mensajeDeError(error)
  }

  const intento = fila.intentos + 1
  await conContextoRLS(db, contexto, async (tx) => {
    await tx
      .update(usuario)
      .set({
        idpPendiente: fallo !== null,
        idpIntentos: fallo === null ? 0 : intento,
        idpUltimoIntento: new Date(),
      })
      .where(eq(usuario.id, usuarioId))
    await registrarAuditoria(tx, {
      actorId: actor.id,
      actorRol: actor.rol,
      accion: fallo === null ? 'sincronizacion_idp' : 'sincronizacion_idp_fallida',
      entidad: 'usuario',
      entidadId: usuarioId,
      diferencia: { activo: fila.activo, intento, ...(fallo ? { error: fallo } : {}) },
    })
  })

  return fallo === null ? 'sincronizado' : 'pendiente'
}

export async function sincronizarPendientesIdp(): Promise<{ total: number; sincronizados: number }> {
  const contexto: ContextoRLS = { usuarioId: '', rol: 'superadmin' }
  const pendientes = await conContextoRLS(db, contexto, (tx) =>
    tx.select({ id: usuario.id }).from(usuario).where(eq(usuario.idpPendiente, true))
  )
  let sincronizados = 0
  for (const { id } of pendientes) {
    const resultado = await sincronizarEstadoIdp(id, contexto, { rol: 'sistema' })
    if (resultado !== 'pendiente') sincronizados++
  }
  return { total: pendientes.length, sincronizados }
}

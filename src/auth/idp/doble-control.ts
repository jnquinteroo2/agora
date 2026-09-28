import { and, eq } from 'drizzle-orm'
import { db, conContextoRLS, registrarAuditoria } from '../../datos/cliente'
import { usuario, baAccount } from '../../datos/esquema'
import { PROVEEDOR_KEYCLOAK, correoInterno } from './cuentas'

export const RECLAMO_USUARIO_AGORA = 'agora_usuario_id'

export type Reclamos = Record<string, unknown>

export function leerReclamos(tokenDeId: string): Reclamos | null {
  const partes = tokenDeId.split('.')
  if (partes.length !== 3 || !partes[1]) return null
  try {
    const datos: unknown = JSON.parse(Buffer.from(partes[1], 'base64url').toString('utf8'))
    return datos && typeof datos === 'object' ? (datos as Reclamos) : null
  } catch {
    return null
  }
}

export interface PerfilKeycloak {
  id: string
  email: string
  emailVerified: boolean
  name: string
  agoraUsuarioId: string | null
}

export function perfilDesdeReclamos(reclamos: Reclamos): PerfilKeycloak | null {
  const sub = typeof reclamos.sub === 'string' ? reclamos.sub : ''
  const usuario =
    typeof reclamos.preferred_username === 'string' ? reclamos.preferred_username : ''
  const correoPropio = typeof reclamos.email === 'string' && reclamos.email ? reclamos.email : ''
  const correo = correoPropio || (usuario ? correoInterno(usuario) : '')
  if (!sub || !correo) return null
  const agoraUsuarioId = reclamos[RECLAMO_USUARIO_AGORA]
  return {
    id: sub,
    email: correo.toLowerCase(),
    emailVerified: correoPropio ? reclamos.email_verified === true : true,
    name: typeof reclamos.name === 'string' && reclamos.name ? reclamos.name : usuario,
    agoraUsuarioId: typeof agoraUsuarioId === 'string' ? agoraUsuarioId : null,
  }
}

export type MotivoRechazo =
  | 'sin_enlace'
  | 'sin_token'
  | 'sub_distinto'
  | 'sin_reclamo'
  | 'usuario_distinto'
  | 'cuenta_inactiva'

export function compararIdentidad(entrada: {
  usuarioId: string
  sub: string | null
  reclamos: Reclamos | null
  activo: boolean | null
}): MotivoRechazo | null {
  if (!entrada.sub) return 'sin_enlace'
  if (!entrada.reclamos) return 'sin_token'
  if (entrada.reclamos.sub !== entrada.sub) return 'sub_distinto'
  const reclamo = entrada.reclamos[RECLAMO_USUARIO_AGORA]
  if (typeof reclamo !== 'string' || !reclamo) return 'sin_reclamo'
  if (reclamo !== entrada.usuarioId) return 'usuario_distinto'
  if (entrada.activo !== true) return 'cuenta_inactiva'
  return null
}

export function esCallbackDeKeycloak(contexto: unknown): boolean {
  const c = contexto as { path?: unknown; params?: { id?: unknown } } | null
  return (
    typeof c?.path === 'string' &&
    c.path.startsWith('/callback') &&
    c.params?.id === PROVEEDOR_KEYCLOAK
  )
}

export async function verificarIngresoKeycloak(usuarioId: string): Promise<MotivoRechazo | null> {
  const [cuenta] = await db
    .select({ sub: baAccount.accountId, tokenDeId: baAccount.idToken })
    .from(baAccount)
    .where(and(eq(baAccount.userId, usuarioId), eq(baAccount.providerId, PROVEEDOR_KEYCLOAK)))
    .limit(1)

  const [fila] = await conContextoRLS(db, { usuarioId, rol: 'anonimo' }, (tx) =>
    tx.select({ activo: usuario.activo }).from(usuario).where(eq(usuario.id, usuarioId)).limit(1)
  )

  const reclamos = cuenta?.tokenDeId ? leerReclamos(cuenta.tokenDeId) : null
  const motivo = compararIdentidad({
    usuarioId,
    sub: cuenta?.sub ?? null,
    reclamos,
    activo: fila?.activo ?? null,
  })

  if (motivo) {
    await conContextoRLS(db, { usuarioId, rol: 'anonimo' }, (tx) =>
      registrarAuditoria(tx, {
        actorId: fila ? usuarioId : undefined,
        actorRol: 'sistema',
        accion: 'rechazo_ingreso_idp',
        entidad: 'usuario',
        entidadId: fila ? usuarioId : undefined,
        diferencia: {
          motivo,
          sub: cuenta?.sub ?? null,
          reclamo: reclamos?.[RECLAMO_USUARIO_AGORA] ?? null,
        },
      })
    )
  }
  return motivo
}

import { randomUUID } from 'crypto'
import { and, eq } from 'drizzle-orm'
import { hash } from '@node-rs/argon2'
import { createLocalAccountIssuer } from 'better-auth/db'
import { env } from '../../env'
import { db, conContextoRLS, registrarAuditoria, type ContextoRLS, type TX } from '../../datos/cliente'
import { usuario, baUser, baAccount, baSession } from '../../datos/esquema'
import {
  crearUsuarioIdp,
  borrarUsuarioIdp,
  enviarInvitacionIdp,
  actualizarCorreoIdp,
  fijarContrasenaTemporalIdp,
  agregarAccionRequeridaIdp,
  ErrorIdpConflicto,
} from './keycloak-admin'
import { puedeAsignarRol, puedeGestionarCuenta } from '../roles'
import {
  PROVEEDOR_KEYCLOAK,
  accionesRequeridasPara,
  ROLES_CON_TOTP_OBLIGATORIO,
  generarNombreUsuario,
  generarContrasenaTemporal,
  correoInterno,
  emisorKeycloak,
  mensajeDeError,
  sincronizarEstadoIdp,
  subDeKeycloak,
  type ResultadoSincronizacion,
} from './cuentas'

const ARGON2 = { memoryCost: 65536, timeCost: 3, parallelism: 4 } as const

export interface Actor {
  id: string
  rol: string
}

export interface DatosAlta {
  rol: string
  correo?: string
  sinCorreo: boolean
  contrasenaInicial?: string
  nombres: string
  apellidos: string
}

export type EstadoInvitacion = 'enviada' | 'fallida' | 'no_aplica'

export interface ResultadoAlta {
  usuarioId: string
  personaId: string
  proveedor: 'keycloak' | 'credential'
  invitacion: EstadoInvitacion
  credencialTemporal: { usuario: string; contrasena: string } | null
}

const MENSAJES_DE_UNICIDAD: Record<string, string> = {
  usuario_correo_unique: 'Ya existe una cuenta con ese correo en la plataforma.',
  ba_user_email_unique: 'Ya existe una cuenta con ese correo en la plataforma.',
  persona_tipo_documento_numero_documento_unique:
    'Ya existe una persona registrada con ese tipo y número de documento.',
}

function errorDeBase(error: unknown): Error {
  const causa = (error as { cause?: { code?: string; constraint_name?: string } })?.cause
  const directo = error as { code?: string; constraint_name?: string }
  const codigo = causa?.code ?? directo?.code
  const restriccion = causa?.constraint_name ?? directo?.constraint_name ?? ''
  if (codigo === '23505') {
    return new Error(MENSAJES_DE_UNICIDAD[restriccion] ?? 'Ya existe un registro con esos datos.')
  }
  return error instanceof Error ? error : new Error(String(error))
}

export function keycloakActivo(): boolean {
  return env.AUTH_KEYCLOAK_HABILITADO
}

async function auditar(
  contexto: ContextoRLS,
  actor: Actor | { id?: string; rol: string },
  accion: string,
  usuarioId: string,
  diferencia?: Record<string, unknown>
): Promise<void> {
  await conContextoRLS(db, contexto, (tx) =>
    registrarAuditoria(tx, {
      actorId: actor.id,
      actorRol: actor.rol,
      accion,
      entidad: 'usuario',
      entidadId: usuarioId,
      diferencia,
    })
  )
}

async function compensarAlta(
  contexto: ContextoRLS,
  actor: Actor,
  usuarioId: string,
  sub: string,
  nombreUsuario: string,
  causa: unknown
): Promise<void> {
  try {
    await borrarUsuarioIdp(sub)
    await auditar(contexto, actor, 'alta_revertida_idp', usuarioId, {
      sub,
      causa: mensajeDeError(causa),
    })
  } catch (errorBorrado) {
    await auditar(contexto, actor, 'cuenta_huerfana_idp', usuarioId, {
      sub,
      nombreUsuario,
      causa: mensajeDeError(causa),
      errorBorrado: mensajeDeError(errorBorrado),
    })
  }
}

export async function darDeAltaCuenta(
  contexto: ContextoRLS,
  actor: Actor,
  datos: DatosAlta,
  accionAuditoria: string,
  resolverPersona: (tx: TX) => Promise<string>
): Promise<ResultadoAlta> {
  if (!puedeAsignarRol(actor.rol, datos.rol)) {
    throw new Error('Su perfil no puede crear cuentas con ese perfil.')
  }
  const usuarioId = randomUUID()
  const nombreUsuario = datos.sinCorreo ? generarNombreUsuario() : datos.correo!
  const correoCuenta = datos.sinCorreo ? correoInterno(nombreUsuario) : datos.correo!
  const contrasenaTemporal = datos.sinCorreo ? generarContrasenaTemporal() : undefined
  const acciones = accionesRequeridasPara(datos.rol)

  let sub: string | null = null
  if (keycloakActivo()) {
    try {
      sub = await crearUsuarioIdp({
        usuarioId,
        nombreUsuario,
        correo: datos.sinCorreo ? null : correoCuenta,
        nombres: datos.nombres,
        apellidos: datos.apellidos,
        accionesRequeridas: acciones,
        contrasenaTemporal,
      })
    } catch (error) {
      if (error instanceof ErrorIdpConflicto) {
        throw new Error(
          'Keycloak ya tiene una cuenta con ese correo. No se creó nada: verifique el correo o pida al Superadministrador que revise esa cuenta.'
        )
      }
      throw new Error(
        'No fue posible crear la cuenta en Keycloak. No se creó nada en la plataforma. Intente de nuevo en unos minutos.'
      )
    }
  }

  let personaId: string
  try {
    personaId = await conContextoRLS(db, contexto, async (tx) => {
      const idPersona = await resolverPersona(tx)
      const ahora = new Date()
      await tx.insert(usuario).values({
        id: usuarioId,
        personaId: idPersona,
        correo: correoCuenta,
        rol: datos.rol,
        sinCorreo: datos.sinCorreo,
      })
      await tx.insert(baUser).values({
        id: usuarioId,
        name: `${datos.nombres} ${datos.apellidos}`.trim(),
        email: correoCuenta,
        emailVerified: true,
        createdAt: ahora,
        updatedAt: ahora,
      })
      if (sub) {
        await tx.insert(baAccount).values({
          id: randomUUID(),
          accountId: sub,
          providerId: PROVEEDOR_KEYCLOAK,
          issuer: emisorKeycloak(),
          userId: usuarioId,
          createdAt: ahora,
          updatedAt: ahora,
        })
      } else {
        await tx.insert(baAccount).values({
          id: usuarioId,
          accountId: usuarioId,
          providerId: 'credential',
          issuer: createLocalAccountIssuer('credential'),
          userId: usuarioId,
          password: await hash(contrasenaTemporal ?? datos.contrasenaInicial!, ARGON2),
          createdAt: ahora,
          updatedAt: ahora,
        })
      }
      await registrarAuditoria(tx, {
        actorId: actor.id,
        actorRol: actor.rol,
        accion: accionAuditoria,
        entidad: 'usuario',
        entidadId: usuarioId,
        diferencia: {
          rol: datos.rol,
          proveedor: sub ? PROVEEDOR_KEYCLOAK : 'credential',
          ...(sub ? { sub } : {}),
          ...(datos.sinCorreo ? { excepcionSinCorreo: true, nombreUsuario } : {}),
        },
      })
      return idPersona
    })
  } catch (error) {
    if (sub) await compensarAlta(contexto, actor, usuarioId, sub, nombreUsuario, error)
    throw errorDeBase(error)
  }

  let invitacion: EstadoInvitacion = 'no_aplica'
  if (sub && !datos.sinCorreo) {
    try {
      await enviarInvitacionIdp(sub, acciones)
      invitacion = 'enviada'
      await auditar(contexto, actor, 'invitacion_idp_enviada', usuarioId, { acciones })
    } catch (error) {
      invitacion = 'fallida'
      await auditar(contexto, actor, 'invitacion_idp_fallida', usuarioId, {
        error: mensajeDeError(error),
      })
    }
  }

  return {
    usuarioId,
    personaId,
    proveedor: sub ? 'keycloak' : 'credential',
    invitacion,
    credencialTemporal: contrasenaTemporal
      ? { usuario: keycloakActivo() ? nombreUsuario : correoCuenta, contrasena: contrasenaTemporal }
      : null,
  }
}

const SIN_PERMISO_SOBRE_LA_CUENTA =
  'La cuenta no existe o su perfil no puede gestionarla. El Administrador no gestiona cuentas de Administrador ni de Superadministrador.'

async function leerCuenta(contexto: ContextoRLS, usuarioId: string) {
  const [fila] = await conContextoRLS(db, contexto, (tx) =>
    tx.select().from(usuario).where(eq(usuario.id, usuarioId)).limit(1)
  )
  if (!fila) throw new Error(SIN_PERMISO_SOBRE_LA_CUENTA)
  return fila
}

export async function exigirCuentaGestionable(contexto: ContextoRLS, actor: Actor, usuarioId: string) {
  const cuenta = await leerCuenta(contexto, usuarioId)
  if (cuenta.id !== actor.id && !puedeGestionarCuenta(actor.rol, cuenta.rol)) {
    throw new Error(SIN_PERMISO_SOBRE_LA_CUENTA)
  }
  return cuenta
}

export interface ResultadoCambioEstado {
  activo: boolean
  sincronizacion: ResultadoSincronizacion | 'no_aplica'
}

export async function cambiarEstadoCuenta(
  contexto: ContextoRLS,
  actor: Actor,
  usuarioId: string,
  activo: boolean
): Promise<ResultadoCambioEstado> {
  if (usuarioId === actor.id) {
    throw new Error('No puede activar ni desactivar su propia cuenta.')
  }
  await exigirCuentaGestionable(contexto, actor, usuarioId)
  const sub = await subDeKeycloak(usuarioId)

  await conContextoRLS(db, contexto, async (tx) => {
    const [actualizado] = await tx
      .update(usuario)
      .set({
        activo,
        actualizadoEn: new Date(),
        ...(sub ? { idpPendiente: true } : {}),
      })
      .where(eq(usuario.id, usuarioId))
      .returning({ id: usuario.id })
    if (!actualizado) throw new Error('El usuario indicado no existe')
    let sesionesCerradas = 0
    if (!activo) {
      const borradas = await tx
        .delete(baSession)
        .where(eq(baSession.userId, usuarioId))
        .returning({ id: baSession.id })
      sesionesCerradas = borradas.length
    }
    await registrarAuditoria(tx, {
      actorId: actor.id,
      actorRol: actor.rol,
      accion: activo ? 'activar_usuario' : 'desactivar_usuario',
      entidad: 'usuario',
      entidadId: usuarioId,
      diferencia: { activo, sesionesCerradas },
    })
  })

  if (!sub) return { activo, sincronizacion: 'no_aplica' }
  if (!keycloakActivo()) return { activo, sincronizacion: 'pendiente' }
  return { activo, sincronizacion: await sincronizarEstadoIdp(usuarioId, contexto, actor) }
}


export async function reenviarInvitacion(
  contexto: ContextoRLS,
  actor: Actor,
  usuarioId: string
): Promise<void> {
  if (!keycloakActivo()) throw new Error('Las invitaciones solo se envían con Keycloak activo.')
  const cuenta = await exigirCuentaGestionable(contexto, actor, usuarioId)
  if (cuenta.sinCorreo) {
    throw new Error('Esta cuenta no tiene correo: restablezca la contraseña temporal y entréguela en persona.')
  }
  if (!cuenta.activo) throw new Error('La cuenta está inactiva. Actívela antes de reenviar la invitación.')
  const sub = await subDeKeycloak(usuarioId)
  if (!sub) throw new Error('La cuenta todavía no está enlazada con Keycloak.')
  const acciones = accionesRequeridasPara(cuenta.rol)
  try {
    await enviarInvitacionIdp(sub, acciones)
  } catch (error) {
    await auditar(contexto, actor, 'invitacion_idp_fallida', usuarioId, { error: mensajeDeError(error) })
    throw new Error('No fue posible enviar la invitación. Intente de nuevo en unos minutos.')
  }
  await auditar(contexto, actor, 'invitacion_idp_reenviada', usuarioId, { acciones })
}

export async function restablecerContrasenaTemporal(
  contexto: ContextoRLS,
  actor: Actor,
  usuarioId: string
): Promise<{ usuario: string; contrasena: string }> {
  const cuenta = await exigirCuentaGestionable(contexto, actor, usuarioId)
  if (!cuenta.sinCorreo) {
    throw new Error('Solo las cuentas sin correo se restablecen desde aquí. Las demás usan el enlace por correo.')
  }
  const contrasena = generarContrasenaTemporal()
  const sub = await subDeKeycloak(usuarioId)
  const nombreUsuario = cuenta.correo.split('@')[0] ?? cuenta.correo
  if (sub && keycloakActivo()) {
    await fijarContrasenaTemporalIdp(sub, contrasena)
  } else {
    const contrasenaHash = await hash(contrasena, ARGON2)
    await conContextoRLS(db, contexto, (tx) =>
      tx
        .update(baAccount)
        .set({ password: contrasenaHash, updatedAt: new Date() })
        .where(and(eq(baAccount.userId, usuarioId), eq(baAccount.providerId, 'credential')))
    )
  }
  await auditar(contexto, actor, 'restablecer_contrasena_temporal', usuarioId, {
    proveedor: sub && keycloakActivo() ? PROVEEDOR_KEYCLOAK : 'credential',
  })
  return { usuario: sub && keycloakActivo() ? nombreUsuario : cuenta.correo, contrasena }
}

export async function cambiarCorreoCuenta(
  contexto: ContextoRLS,
  actor: Actor,
  usuarioId: string,
  correoNuevo: string
): Promise<void> {
  const cuenta = await exigirCuentaGestionable(contexto, actor, usuarioId)
  if (cuenta.sinCorreo) throw new Error('Esta cuenta no usa correo para ingresar.')
  if (cuenta.correo === correoNuevo) return
  const sub = await subDeKeycloak(usuarioId)
  const enKeycloak = Boolean(sub) && keycloakActivo()

  if (enKeycloak) {
    try {
      await actualizarCorreoIdp(sub!, correoNuevo)
    } catch (error) {
      if (error instanceof ErrorIdpConflicto) {
        throw new Error('Keycloak ya tiene otra cuenta con ese correo. No se cambió nada.')
      }
      throw new Error('No fue posible cambiar el correo en Keycloak. No se cambió nada.')
    }
  }

  try {
    await conContextoRLS(db, contexto, async (tx) => {
      await tx
        .update(usuario)
        .set({ correo: correoNuevo, actualizadoEn: new Date() })
        .where(eq(usuario.id, usuarioId))
      await tx
        .update(baUser)
        .set({ email: correoNuevo, updatedAt: new Date() })
        .where(eq(baUser.id, usuarioId))
      await registrarAuditoria(tx, {
        actorId: actor.id,
        actorRol: actor.rol,
        accion: 'cambiar_correo',
        entidad: 'usuario',
        entidadId: usuarioId,
        diferencia: { anterior: cuenta.correo, nuevo: correoNuevo },
      })
    })
  } catch (error) {
    if (enKeycloak) {
      try {
        await actualizarCorreoIdp(sub!, cuenta.correo)
      } catch (errorReversion) {
        await auditar(contexto, actor, 'correo_desincronizado_idp', usuarioId, {
          correoPlataforma: cuenta.correo,
          correoKeycloak: correoNuevo,
          error: mensajeDeError(errorReversion),
        })
      }
    }
    throw errorDeBase(error)
  }
}

export interface ResultadoCambioRol {
  rol: string
  totp: 'agregado' | 'fallido' | 'no_aplica'
}

export async function cambiarRolCuenta(
  contexto: ContextoRLS,
  actor: Actor,
  usuarioId: string,
  rolNuevo: string
): Promise<ResultadoCambioRol> {
  if (usuarioId === actor.id) throw new Error('No puede cambiar su propio perfil.')
  const cuenta = await exigirCuentaGestionable(contexto, actor, usuarioId)
  if (!puedeAsignarRol(actor.rol, rolNuevo)) {
    throw new Error('Su perfil no puede asignar ese perfil.')
  }
  if (cuenta.rol === rolNuevo) return { rol: rolNuevo, totp: 'no_aplica' }
  if (cuenta.sinCorreo && rolNuevo !== 'estudiante') {
    throw new Error(
      'Una cuenta sin correo solo puede ser de estudiante. Asígnele un correo antes de cambiar su perfil.'
    )
  }

  await conContextoRLS(db, contexto, async (tx) => {
    await tx
      .update(usuario)
      .set({ rol: rolNuevo, actualizadoEn: new Date() })
      .where(eq(usuario.id, usuarioId))
    const sesiones = await tx
      .delete(baSession)
      .where(eq(baSession.userId, usuarioId))
      .returning({ id: baSession.id })
    await registrarAuditoria(tx, {
      actorId: actor.id,
      actorRol: actor.rol,
      accion: 'cambiar_rol',
      entidad: 'usuario',
      entidadId: usuarioId,
      diferencia: { anterior: cuenta.rol, nuevo: rolNuevo, sesionesCerradas: sesiones.length },
    })
  })

  const pideTotp =
    ROLES_CON_TOTP_OBLIGATORIO.includes(rolNuevo) && !ROLES_CON_TOTP_OBLIGATORIO.includes(cuenta.rol)
  const sub = pideTotp && keycloakActivo() ? await subDeKeycloak(usuarioId) : null
  if (!sub) return { rol: rolNuevo, totp: 'no_aplica' }
  try {
    await agregarAccionRequeridaIdp(sub, 'CONFIGURE_TOTP')
    await auditar(contexto, actor, 'totp_idp_exigido', usuarioId, { rol: rolNuevo })
    return { rol: rolNuevo, totp: 'agregado' }
  } catch (error) {
    await auditar(contexto, actor, 'totp_idp_fallido', usuarioId, { error: mensajeDeError(error) })
    return { rol: rolNuevo, totp: 'fallido' }
  }
}

export async function exigirTotpCuenta(
  contexto: ContextoRLS,
  actor: Actor,
  usuarioId: string
): Promise<void> {
  if (!keycloakActivo()) throw new Error('La verificación en dos pasos se configura con Keycloak activo.')
  await exigirCuentaGestionable(contexto, actor, usuarioId)
  const sub = await subDeKeycloak(usuarioId)
  if (!sub) throw new Error('La cuenta todavía no está enlazada con Keycloak.')
  try {
    await agregarAccionRequeridaIdp(sub, 'CONFIGURE_TOTP')
  } catch (error) {
    await auditar(contexto, actor, 'totp_idp_fallido', usuarioId, { error: mensajeDeError(error) })
    throw new Error('No fue posible pedir la verificación en dos pasos. Intente de nuevo en unos minutos.')
  }
  await auditar(contexto, actor, 'totp_idp_exigido', usuarioId, { origen: 'panel' })
}

'use server'

import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { db, conContextoRLS, registrarAuditoria } from '../../datos/cliente'
import { persona, usuario } from '../../datos/esquema'
import { accionSuperadmin, accionGestorCuentas } from '../middleware'
import { ROLES, type Rol } from '../../auth/roles'
import { esqPersona } from './esquemas'
import { CODIGOS_TIPO_DOCUMENTO } from '../../dominio/documentos'
import {
  darDeAltaCuenta,
  cambiarEstadoCuenta,
  reenviarInvitacion,
  restablecerContrasenaTemporal,
  cambiarCorreoCuenta,
  cambiarRolCuenta,
  exigirCuentaGestionable,
  exigirTotpCuenta,
  keycloakActivo,
} from '../../auth/idp/alta'
import { sincronizarEstadoIdp } from '../../auth/idp/cuentas'

export const crearPersona = accionSuperadmin
  .schema(esqPersona)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(
      db,
      { usuarioId: ctx.usuario.id, rol: ctx.usuario.rol as 'superadmin' },
      async (tx) => {
        const [nueva] = await tx.insert(persona).values(parsedInput).returning()
        await registrarAuditoria(tx, {
          actorId: ctx.usuario.id,
          actorRol: ctx.usuario.rol,
          accion: 'crear',
          entidad: 'persona',
          entidadId: nueva!.id,
        })
        return nueva!
      }
    )
  })

const esqAcceso = z.object({
  rol: z.enum(ROLES),
  correo: z.string().trim().toLowerCase().email().optional(),
  sinCorreo: z.boolean().default(false),
  contrasenaInicial: z.string().min(12).optional(),
})

function validarAcceso(datos: z.infer<typeof esqAcceso>, contexto: z.RefinementCtx) {
  if (datos.sinCorreo) {
    if (datos.rol !== 'estudiante') {
      contexto.addIssue({
        code: 'custom',
        path: ['sinCorreo'],
        message: 'Solo las cuentas de estudiante pueden crearse sin correo.',
      })
    }
    if (datos.correo) {
      contexto.addIssue({
        code: 'custom',
        path: ['correo'],
        message: 'Una cuenta sin correo no lleva correo de acceso.',
      })
    }
    return
  }
  if (!datos.correo) {
    contexto.addIssue({ code: 'custom', path: ['correo'], message: 'Escriba el correo de acceso.' })
  }
  if (!keycloakActivo() && !datos.contrasenaInicial) {
    contexto.addIssue({
      code: 'custom',
      path: ['contrasenaInicial'],
      message: 'Escriba la contraseña inicial (mínimo 12 caracteres).',
    })
  }
}

function contextoDe(ctx: { usuario: { id: string; rol: string } }) {
  return {
    contexto: { usuarioId: ctx.usuario.id, rol: ctx.usuario.rol as Rol },
    actor: { id: ctx.usuario.id, rol: ctx.usuario.rol },
  }
}

const esqUsuario = esqAcceso.extend({ persona: esqPersona }).superRefine(validarAcceso)

export const crearUsuario = accionGestorCuentas
  .schema(esqUsuario)
  .action(async ({ parsedInput, ctx }) => {
    const { contexto, actor } = contextoDe(ctx)
    const { persona: datosPersona } = parsedInput
    return darDeAltaCuenta(
      contexto,
      actor,
      {
        rol: parsedInput.rol,
        correo: parsedInput.correo,
        sinCorreo: parsedInput.sinCorreo,
        contrasenaInicial: parsedInput.contrasenaInicial,
        nombres: [datosPersona.primerNombre, datosPersona.segundoNombre].filter(Boolean).join(' '),
        apellidos: [datosPersona.primerApellido, datosPersona.segundoApellido]
          .filter(Boolean)
          .join(' '),
      },
      'crear_usuario',
      async (tx) => {
        const [nuevaPersona] = await tx.insert(persona).values(datosPersona).returning()
        return nuevaPersona!.id
      }
    )
  })

const esqEditarPersona = esqPersona.extend({ id: z.string().uuid() })

export const editarPersona = accionSuperadmin
  .schema(esqEditarPersona)
  .action(async ({ parsedInput, ctx }) => {
    const { id, ...datos } = parsedInput
    return conContextoRLS(
      db,
      { usuarioId: ctx.usuario.id, rol: ctx.usuario.rol as 'superadmin' },
      async (tx) => {
        const [actualizada] = await tx
          .update(persona)
          .set(datos)
          .where(eq(persona.id, id))
          .returning()
        if (!actualizada) throw new Error('La persona indicada no existe')
        await registrarAuditoria(tx, {
          actorId: ctx.usuario.id,
          actorRol: ctx.usuario.rol,
          accion: 'editar',
          entidad: 'persona',
          entidadId: actualizada.id,
        })
        return actualizada
      }
    )
  })

const esqBuscarPersona = z.object({
  tipoDocumento: z.enum(CODIGOS_TIPO_DOCUMENTO),
  numeroDocumento: z.string().min(4).max(20),
})

export const buscarPersonaPorDocumento = accionSuperadmin
  .schema(esqBuscarPersona)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(
      db,
      { usuarioId: ctx.usuario.id, rol: ctx.usuario.rol as 'superadmin' },
      async (tx) => {
        const [encontrada] = await tx
          .select()
          .from(persona)
          .where(
            and(
              eq(persona.tipoDocumento, parsedInput.tipoDocumento),
              eq(persona.numeroDocumento, parsedInput.numeroDocumento)
            )
          )
          .limit(1)
        return encontrada && !encontrada.eliminadoEn ? encontrada : null
      }
    )
  })

const esqCambiarEstadoUsuario = z.object({
  usuarioId: z.string().uuid(),
  activo: z.boolean(),
})

export const cambiarEstadoUsuario = accionGestorCuentas
  .schema(esqCambiarEstadoUsuario)
  .action(async ({ parsedInput, ctx }) => {
    const { contexto, actor } = contextoDe(ctx)
    return cambiarEstadoCuenta(contexto, actor, parsedInput.usuarioId, parsedInput.activo)
  })

const esqOtorgarAcceso = esqAcceso
  .extend({ personaId: z.string().uuid() })
  .superRefine(validarAcceso)

export const otorgarAcceso = accionGestorCuentas
  .schema(esqOtorgarAcceso)
  .action(async ({ parsedInput, ctx }) => {
    const { contexto, actor } = contextoDe(ctx)
    const [personaBase] = await conContextoRLS(db, contexto, (tx) =>
      tx.select().from(persona).where(eq(persona.id, parsedInput.personaId)).limit(1)
    )
    if (!personaBase) throw new Error('La persona indicada no existe')
    return darDeAltaCuenta(
      contexto,
      actor,
      {
        rol: parsedInput.rol,
        correo: parsedInput.correo,
        sinCorreo: parsedInput.sinCorreo,
        contrasenaInicial: parsedInput.contrasenaInicial,
        nombres: [personaBase.primerNombre, personaBase.segundoNombre].filter(Boolean).join(' '),
        apellidos: [personaBase.primerApellido, personaBase.segundoApellido]
          .filter(Boolean)
          .join(' '),
      },
      'otorgar_acceso',
      async (tx) => {
        const [existente] = await tx
          .select({ id: usuario.id })
          .from(usuario)
          .where(eq(usuario.personaId, personaBase.id))
          .limit(1)
        if (existente) throw new Error('Esta persona ya tiene una cuenta de acceso.')
        return personaBase.id
      }
    )
  })

const esqUsuarioId = z.object({ usuarioId: z.string().uuid() })

export const reintentarSincronizacion = accionGestorCuentas
  .schema(esqUsuarioId)
  .action(async ({ parsedInput, ctx }) => {
    if (!keycloakActivo()) throw new Error('Keycloak no está activo: la sincronización queda pendiente.')
    const { contexto, actor } = contextoDe(ctx)
    await exigirCuentaGestionable(contexto, actor, parsedInput.usuarioId)
    return sincronizarEstadoIdp(parsedInput.usuarioId, contexto, actor)
  })

export const reenviarInvitacionCuenta = accionGestorCuentas
  .schema(esqUsuarioId)
  .action(async ({ parsedInput, ctx }) => {
    const { contexto, actor } = contextoDe(ctx)
    await reenviarInvitacion(contexto, actor, parsedInput.usuarioId)
    return { enviada: true }
  })

export const restablecerContrasenaCuenta = accionGestorCuentas
  .schema(esqUsuarioId)
  .action(async ({ parsedInput, ctx }) => {
    const { contexto, actor } = contextoDe(ctx)
    return restablecerContrasenaTemporal(contexto, actor, parsedInput.usuarioId)
  })

const esqCambiarCorreo = z.object({
  usuarioId: z.string().uuid(),
  correo: z.string().trim().toLowerCase().email(),
})

export const cambiarCorreoUsuario = accionGestorCuentas
  .schema(esqCambiarCorreo)
  .action(async ({ parsedInput, ctx }) => {
    const { contexto, actor } = contextoDe(ctx)
    await cambiarCorreoCuenta(contexto, actor, parsedInput.usuarioId, parsedInput.correo)
    return { correo: parsedInput.correo }
  })

const esqCambiarRol = z.object({
  usuarioId: z.string().uuid(),
  rol: z.enum(ROLES),
})

export const cambiarRolUsuario = accionGestorCuentas
  .schema(esqCambiarRol)
  .action(async ({ parsedInput, ctx }) => {
    const { contexto, actor } = contextoDe(ctx)
    return cambiarRolCuenta(contexto, actor, parsedInput.usuarioId, parsedInput.rol)
  })

export const exigirTotpUsuario = accionGestorCuentas
  .schema(esqUsuarioId)
  .action(async ({ parsedInput, ctx }) => {
    const { contexto, actor } = contextoDe(ctx)
    await exigirTotpCuenta(contexto, actor, parsedInput.usuarioId)
    return { exigido: true }
  })

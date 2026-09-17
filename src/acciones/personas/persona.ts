"use server"

import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { hash } from '@node-rs/argon2'
import { createLocalAccountIssuer } from 'better-auth/db'
import { db, conContextoRLS, registrarAuditoria } from '../../datos/cliente'
import { persona, usuario, baUser, baAccount } from '../../datos/esquema'
import { accionSuperadmin } from '../middleware'

export const esqPersona = z.object({
  tipoDocumento: z.enum(['CC', 'TI', 'CE', 'RC', 'PA', 'NIP']),
  numeroDocumento: z.string().min(4).max(20),
  primerNombre: z.string().min(1).max(60),
  segundoNombre: z.string().max(60).optional(),
  primerApellido: z.string().min(1).max(60),
  segundoApellido: z.string().max(60).optional(),
  fechaNacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  lugarNacimiento: z.string().max(100).optional(),
  genero: z.enum(['M', 'F', 'NB', 'NR']).optional(),
  telefono: z.string().max(20).optional(),
  correo: z.string().email().optional(),
  direccion: z.string().max(200).optional(),
  eps: z.string().max(100).optional(),
})

export const crearPersona = accionSuperadmin
  .schema(esqPersona)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(
      db,
      { usuarioId: ctx.usuario.id, rol: ctx.usuario.rol as 'superadmin' },
      async (tx) => {
        const [nueva] = await tx.insert(persona).values(parsedInput).returning()
        await registrarAuditoria(tx, {
          actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
          accion: 'crear', entidad: 'persona', entidadId: nueva!.id,
        })
        return nueva!
      }
    )
  })

const esqUsuario = z.object({
  persona: esqPersona,
  correo: z.string().email(),
  rol: z.enum(['superadmin', 'docente', 'estudiante']),
  contrasenaInicial: z.string().min(12),
})

export const crearUsuario = accionSuperadmin
  .schema(esqUsuario)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(
      db,
      { usuarioId: ctx.usuario.id, rol: ctx.usuario.rol as 'superadmin' },
      async (tx) => {
        const [nuevaPersona] = await tx
          .insert(persona)
          .values(parsedInput.persona)
          .returning()

        const [nuevoUsuario] = await tx
          .insert(usuario)
          .values({
            personaId: nuevaPersona!.id,
            correo: parsedInput.correo,
            rol: parsedInput.rol,
          })
          .returning()

        const contrasenaHash = await hash(parsedInput.contrasenaInicial, {
          memoryCost: 65536,
          timeCost: 3,
          parallelism: 4,
        })
        const baId = nuevoUsuario!.id

        await tx.insert(baUser).values({
          id: baId,
          name: `${parsedInput.persona.primerNombre} ${parsedInput.persona.primerApellido}`,
          email: parsedInput.correo,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        await tx.insert(baAccount).values({
          id: baId,
          accountId: baId,
          providerId: 'credential',
          issuer: createLocalAccountIssuer('credential'),
          userId: baId,
          password: contrasenaHash,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        await registrarAuditoria(tx, {
          actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
          accion: 'crear_usuario', entidad: 'usuario', entidadId: nuevoUsuario!.id,
        })

        return { personaId: nuevaPersona!.id, usuarioId: nuevoUsuario!.id }
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
          actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
          accion: 'editar', entidad: 'persona', entidadId: actualizada.id,
        })
        return actualizada
      }
    )
  })

const esqBuscarPersona = z.object({
  tipoDocumento: z.enum(['CC', 'TI', 'CE', 'RC', 'PA', 'NIP']),
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

export const cambiarEstadoUsuario = accionSuperadmin
  .schema(esqCambiarEstadoUsuario)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(
      db,
      { usuarioId: ctx.usuario.id, rol: ctx.usuario.rol as 'superadmin' },
      async (tx) => {
        const [actualizado] = await tx
          .update(usuario)
          .set({ activo: parsedInput.activo, actualizadoEn: new Date() })
          .where(eq(usuario.id, parsedInput.usuarioId))
          .returning()
        if (!actualizado) throw new Error('El usuario indicado no existe')
        await registrarAuditoria(tx, {
          actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
          accion: parsedInput.activo ? 'activar_usuario' : 'desactivar_usuario',
          entidad: 'usuario', entidadId: actualizado.id,
        })
        return actualizado
      }
    )
  })

const esqOtorgarAcceso = z.object({
  personaId: z.string().uuid(),
  correo: z.string().email(),
  rol: z.enum(['superadmin', 'docente', 'estudiante']),
  contrasenaInicial: z.string().min(12),
})

export const otorgarAcceso = accionSuperadmin
  .schema(esqOtorgarAcceso)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(
      db,
      { usuarioId: ctx.usuario.id, rol: ctx.usuario.rol as 'superadmin' },
      async (tx) => {
        const [personaBase] = await tx.select().from(persona).where(eq(persona.id, parsedInput.personaId)).limit(1)
        if (!personaBase) throw new Error('La persona indicada no existe')

        const [nuevoUsuario] = await tx
          .insert(usuario)
          .values({
            personaId: personaBase.id,
            correo: parsedInput.correo,
            rol: parsedInput.rol,
          })
          .returning()

        const contrasenaHash = await hash(parsedInput.contrasenaInicial, {
          memoryCost: 65536,
          timeCost: 3,
          parallelism: 4,
        })
        const baId = nuevoUsuario!.id

        await tx.insert(baUser).values({
          id: baId,
          name: `${personaBase.primerNombre} ${personaBase.primerApellido}`,
          email: parsedInput.correo,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        await tx.insert(baAccount).values({
          id: baId,
          accountId: baId,
          providerId: 'credential',
          issuer: createLocalAccountIssuer('credential'),
          userId: baId,
          password: contrasenaHash,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        await registrarAuditoria(tx, {
          actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
          accion: 'otorgar_acceso', entidad: 'usuario', entidadId: nuevoUsuario!.id,
        })

        return nuevoUsuario!
      }
    )
  })

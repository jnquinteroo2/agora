"use server"

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, conContextoRLS, registrarAuditoria } from '../../datos/cliente'
import { descriptor } from '../../datos/esquema'
import { accionSuperadmin } from '../middleware'

const esqCrear = z.object({
  asignaturaId: z.string().uuid(),
  nivel: z.string().min(1).max(50),
  texto: z.string().min(1).max(2000),
})

export const crearDescriptor = accionSuperadmin
  .schema(esqCrear)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(
      db,
      { usuarioId: ctx.usuario.id, rol: 'superadmin' },
      async (tx) => {
        const [nuevo] = await tx.insert(descriptor).values(parsedInput).returning()
        if (!nuevo) throw new Error('No se pudo crear el descriptor')
        await registrarAuditoria(tx, {
          actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
          accion: 'crear', entidad: 'descriptor', entidadId: nuevo.id,
        })
        return nuevo
      }
    )
  })

const esqEditar = z.object({
  id: z.string().uuid(),
  texto: z.string().min(1).max(2000),
})

export const editarDescriptor = accionSuperadmin
  .schema(esqEditar)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(
      db,
      { usuarioId: ctx.usuario.id, rol: 'superadmin' },
      async (tx) => {
        const [actualizado] = await tx
          .update(descriptor)
          .set({ texto: parsedInput.texto })
          .where(eq(descriptor.id, parsedInput.id))
          .returning()
        if (!actualizado) throw new Error('El descriptor indicado no existe')
        await registrarAuditoria(tx, {
          actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
          accion: 'editar', entidad: 'descriptor', entidadId: actualizado.id,
        })
        return actualizado
      }
    )
  })

const esqEliminar = z.object({ id: z.string().uuid() })

export const eliminarDescriptor = accionSuperadmin
  .schema(esqEliminar)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(
      db,
      { usuarioId: ctx.usuario.id, rol: 'superadmin' },
      async (tx) => {
        const [eliminado] = await tx
          .update(descriptor)
          .set({ eliminadoEn: new Date() })
          .where(eq(descriptor.id, parsedInput.id))
          .returning()
        if (!eliminado) throw new Error('El descriptor indicado no existe')
        await registrarAuditoria(tx, {
          actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
          accion: 'eliminar', entidad: 'descriptor', entidadId: eliminado.id,
        })
        return eliminado
      }
    )
  })

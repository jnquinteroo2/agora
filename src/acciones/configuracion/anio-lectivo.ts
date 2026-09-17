"use server"

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, conContextoRLS, registrarAuditoria } from '../../datos/cliente'
import { anioLectivo } from '../../datos/esquema'
import { accionSuperadmin } from '../middleware'

const esquemaCrear = z.object({
  nombre: z.string().min(4).max(20),
  inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  activo: z.boolean().default(false),
})

export const crearAnioLectivo = accionSuperadmin
  .schema(esquemaCrear)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(
      db,
      { usuarioId: ctx.usuario.id, rol: ctx.usuario.rol as 'superadmin' },
      async (tx) => {
        const [nuevo] = await tx
          .insert(anioLectivo)
          .values(parsedInput)
          .returning()
        await registrarAuditoria(tx, {
          actorId: ctx.usuario.id,
          actorRol: ctx.usuario.rol,
          accion: 'crear',
          entidad: 'anio_lectivo',
          entidadId: nuevo!.id,
        })
        return nuevo!
      }
    )
  })

export const activarAnioLectivo = accionSuperadmin
  .schema(z.object({ id: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(
      db,
      { usuarioId: ctx.usuario.id, rol: ctx.usuario.rol as 'superadmin' },
      async (tx) => {
        await tx.update(anioLectivo).set({ activo: false })
        const [actualizado] = await tx
          .update(anioLectivo)
          .set({ activo: true })
          .where(eq(anioLectivo.id, parsedInput.id))
          .returning()
        await registrarAuditoria(tx, {
          actorId: ctx.usuario.id,
          actorRol: ctx.usuario.rol,
          accion: 'activar',
          entidad: 'anio_lectivo',
          entidadId: parsedInput.id,
        })
        return actualizado!
      }
    )
  })

export const listarAniosLectivos = accionSuperadmin
  .schema(z.object({}))
  .action(async ({ ctx }) => {
    return conContextoRLS(
      db,
      { usuarioId: ctx.usuario.id, rol: ctx.usuario.rol as 'superadmin' },
      async (tx) => {
        return tx.select().from(anioLectivo).orderBy(anioLectivo.nombre)
      }
    )
  })

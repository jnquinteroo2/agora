"use server"

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, conContextoRLS, registrarAuditoria } from '../../datos/cliente'
import { cmsAlbumFoto } from '../../datos/esquema'
import { accionSuperadmin } from '../middleware'

const esqAgregar = z.object({
  albumId: z.string().uuid(),
  archivoId: z.string().uuid(),
  alt: z.string().min(1).max(200),
  orden: z.number().int().min(0).max(999).optional(),
})

export const agregarFotoAlbum = accionSuperadmin
  .schema(esqAgregar)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(db, { usuarioId: ctx.usuario.id, rol: 'superadmin' }, async (tx) => {
      const [nueva] = await tx
        .insert(cmsAlbumFoto)
        .values({
          albumId: parsedInput.albumId,
          archivoId: parsedInput.archivoId,
          alt: parsedInput.alt,
          orden: parsedInput.orden ?? 0,
        })
        .returning()

      if (!nueva) throw new Error('No se pudo agregar la foto al álbum')

      await registrarAuditoria(tx, {
        actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
        accion: 'agregar_foto', entidad: 'cms_album_foto', entidadId: nueva.id,
      })

      return nueva
    })
  })

const esqEliminar = z.object({ id: z.string().uuid() })

export const eliminarFotoAlbum = accionSuperadmin
  .schema(esqEliminar)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(db, { usuarioId: ctx.usuario.id, rol: 'superadmin' }, async (tx) => {
      const [eliminada] = await tx
        .delete(cmsAlbumFoto)
        .where(eq(cmsAlbumFoto.id, parsedInput.id))
        .returning()

      if (!eliminada) throw new Error('La foto indicada no existe en este álbum')

      await registrarAuditoria(tx, {
        actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
        accion: 'eliminar_foto', entidad: 'cms_album_foto', entidadId: eliminada.id,
      })

      return eliminada
    })
  })

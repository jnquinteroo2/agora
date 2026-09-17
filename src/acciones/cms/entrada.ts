"use server"

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, conContextoRLS, registrarAuditoria } from '../../datos/cliente'
import { cmsEntrada } from '../../datos/esquema'
import { accionSuperadmin } from '../middleware'

const TIPOS_CMS = ['noticia', 'album', 'pagina'] as const

const esqCrear = z.object({
  tipo: z.enum(TIPOS_CMS),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'El slug solo admite minúsculas, números y guiones'),
  titulo: z.string().min(1).max(200),
  subtitulo: z.string().max(300).optional(),
  cuerpo: z.string().max(50_000).optional(),
  metaDesc: z.string().max(300).optional(),
  metaImgId: z.string().uuid().optional(),
})

export const crearEntradaCMS = accionSuperadmin
  .schema(esqCrear)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(db, { usuarioId: ctx.usuario.id, rol: 'superadmin' }, async (tx) => {
      const [nueva] = await tx
        .insert(cmsEntrada)
        .values({ ...parsedInput, estado: 'borrador', autorId: ctx.usuario.id })
        .returning()

      if (!nueva) throw new Error('No se pudo crear la entrada (verifique que el slug no esté repetido para este tipo)')

      await registrarAuditoria(tx, {
        actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
        accion: 'crear', entidad: 'cms_entrada', entidadId: nueva.id,
      })

      return nueva
    })
  })

const esqEditar = z.object({
  id: z.string().uuid(),
  titulo: z.string().min(1).max(200).optional(),
  subtitulo: z.string().max(300).optional(),
  cuerpo: z.string().max(50_000).optional(),
  metaDesc: z.string().max(300).optional(),
  metaImgId: z.string().uuid().optional(),
})

export const editarEntradaCMS = accionSuperadmin
  .schema(esqEditar)
  .action(async ({ parsedInput, ctx }) => {
    const { id, ...cambios } = parsedInput
    return conContextoRLS(db, { usuarioId: ctx.usuario.id, rol: 'superadmin' }, async (tx) => {
      const [actualizada] = await tx
        .update(cmsEntrada)
        .set({ ...cambios, actualizadoEn: new Date() })
        .where(eq(cmsEntrada.id, id))
        .returning()

      if (!actualizada) throw new Error('La entrada indicada no existe')

      await registrarAuditoria(tx, {
        actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
        accion: 'editar', entidad: 'cms_entrada', entidadId: actualizada.id,
      })

      return actualizada
    })
  })

const esqPublicar = z.object({
  id: z.string().uuid(),
  publicado: z.boolean(),
  publicarEn: z.string().datetime().optional(),
})

export const publicarEntradaCMS = accionSuperadmin
  .schema(esqPublicar)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(db, { usuarioId: ctx.usuario.id, rol: 'superadmin' }, async (tx) => {
      const [actualizada] = await tx
        .update(cmsEntrada)
        .set({
          estado: parsedInput.publicado ? 'publicado' : 'borrador',
          publicarEn: parsedInput.publicarEn ? new Date(parsedInput.publicarEn) : null,
          actualizadoEn: new Date(),
        })
        .where(eq(cmsEntrada.id, parsedInput.id))
        .returning()

      if (!actualizada) throw new Error('La entrada indicada no existe')

      await registrarAuditoria(tx, {
        actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
        accion: parsedInput.publicado ? 'publicar_cms' : 'despublicar_cms',
        entidad: 'cms_entrada', entidadId: actualizada.id,
      })

      return actualizada
    })
  })

const esqEliminar = z.object({ id: z.string().uuid() })

export const eliminarEntradaCMS = accionSuperadmin
  .schema(esqEliminar)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(db, { usuarioId: ctx.usuario.id, rol: 'superadmin' }, async (tx) => {
      const [eliminada] = await tx
        .update(cmsEntrada)
        .set({ eliminadoEn: new Date() })
        .where(eq(cmsEntrada.id, parsedInput.id))
        .returning()

      if (!eliminada) throw new Error('La entrada indicada no existe')

      await registrarAuditoria(tx, {
        actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
        accion: 'eliminar', entidad: 'cms_entrada', entidadId: eliminada.id,
      })

      return eliminada
    })
  })

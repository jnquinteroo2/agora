"use server"

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, conContextoRLS, registrarAuditoria } from '../../datos/cliente'
import { conceptoIngreso, categoriaEgreso } from '../../datos/esquema'
import { accionSuperadmin } from '../middleware'

const esqCrearConcepto = z.object({
  nombre: z.string().min(1).max(120),
  descripcion: z.string().max(500).optional(),
})

export const crearConceptoIngreso = accionSuperadmin
  .schema(esqCrearConcepto)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(db, { usuarioId: ctx.usuario.id, rol: 'superadmin' }, async (tx) => {
      const [nuevo] = await tx.insert(conceptoIngreso).values(parsedInput).returning()
      if (!nuevo) throw new Error('No se pudo crear el concepto de ingreso')
      await registrarAuditoria(tx, {
        actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
        accion: 'crear', entidad: 'concepto_ingreso', entidadId: nuevo.id,
      })
      return nuevo
    })
  })

const esqEliminarConcepto = z.object({ id: z.string().uuid() })

export const eliminarConceptoIngreso = accionSuperadmin
  .schema(esqEliminarConcepto)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(db, { usuarioId: ctx.usuario.id, rol: 'superadmin' }, async (tx) => {
      const [eliminado] = await tx
        .update(conceptoIngreso)
        .set({ eliminadoEn: new Date() })
        .where(eq(conceptoIngreso.id, parsedInput.id))
        .returning()
      if (!eliminado) throw new Error('El concepto indicado no existe')
      await registrarAuditoria(tx, {
        actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
        accion: 'eliminar', entidad: 'concepto_ingreso', entidadId: eliminado.id,
      })
      return eliminado
    })
  })

const esqCrearCategoria = z.object({
  nombre: z.string().min(1).max(120),
})

export const crearCategoriaEgreso = accionSuperadmin
  .schema(esqCrearCategoria)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(db, { usuarioId: ctx.usuario.id, rol: 'superadmin' }, async (tx) => {
      const [nueva] = await tx.insert(categoriaEgreso).values(parsedInput).returning()
      if (!nueva) throw new Error('No se pudo crear la categoría de egreso')
      await registrarAuditoria(tx, {
        actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
        accion: 'crear', entidad: 'categoria_egreso', entidadId: nueva.id,
      })
      return nueva
    })
  })

const esqEliminarCategoria = z.object({ id: z.string().uuid() })

export const eliminarCategoriaEgreso = accionSuperadmin
  .schema(esqEliminarCategoria)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(db, { usuarioId: ctx.usuario.id, rol: 'superadmin' }, async (tx) => {
      const [eliminada] = await tx
        .update(categoriaEgreso)
        .set({ eliminadoEn: new Date() })
        .where(eq(categoriaEgreso.id, parsedInput.id))
        .returning()
      if (!eliminada) throw new Error('La categoría indicada no existe')
      await registrarAuditoria(tx, {
        actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
        accion: 'eliminar', entidad: 'categoria_egreso', entidadId: eliminada.id,
      })
      return eliminada
    })
  })

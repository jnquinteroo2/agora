"use server"

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, conContextoRLS, registrarAuditoria } from '../../datos/cliente'
import {
  jornada,
  ciclo,
  area,
  asignatura,
  periodo,
  curso,
  planAsignatura,
} from '../../datos/esquema'
import { accionSuperadmin } from '../middleware'

type RolSuperadmin = 'superadmin'

const esqCrearJornada = z.object({
  codigo: z.string().length(1),
  nombre: z.string().min(2).max(40),
  detalle: z.string().max(200).optional(),
})

export const crearJornada = accionSuperadmin
  .schema(esqCrearJornada)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(
      db,
      { usuarioId: ctx.usuario.id, rol: ctx.usuario.rol as RolSuperadmin },
      async (tx) => {
        const [nueva] = await tx.insert(jornada).values(parsedInput).returning()
        await registrarAuditoria(tx, {
          actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
          accion: 'crear', entidad: 'jornada', entidadId: nueva!.id,
        })
        return nueva!
      }
    )
  })

const esqCrearCiclo = z.object({
  codigo: z.string().min(2).max(20),
  gradoEquivalente: z.string().min(2).max(40),
  esquemaPeriodos: z.enum(['cuatro', 'tres', 'dos', 'anual']),
})

export const crearCiclo = accionSuperadmin
  .schema(esqCrearCiclo)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(
      db,
      { usuarioId: ctx.usuario.id, rol: ctx.usuario.rol as RolSuperadmin },
      async (tx) => {
        const [nuevo] = await tx.insert(ciclo).values(parsedInput).returning()
        await registrarAuditoria(tx, {
          actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
          accion: 'crear', entidad: 'ciclo', entidadId: nuevo!.id,
        })
        return nuevo!
      }
    )
  })

const esqCrearArea = z.object({
  nombre: z.string().min(2).max(100),
})

export const crearArea = accionSuperadmin
  .schema(esqCrearArea)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(
      db,
      { usuarioId: ctx.usuario.id, rol: ctx.usuario.rol as RolSuperadmin },
      async (tx) => {
        const [nueva] = await tx.insert(area).values(parsedInput).returning()
        await registrarAuditoria(tx, {
          actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
          accion: 'crear', entidad: 'area', entidadId: nueva!.id,
        })
        return nueva!
      }
    )
  })

const esqCrearAsignatura = z.object({
  areaId: z.string().uuid(),
  nombre: z.string().min(2).max(100),
})

export const crearAsignatura = accionSuperadmin
  .schema(esqCrearAsignatura)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(
      db,
      { usuarioId: ctx.usuario.id, rol: ctx.usuario.rol as RolSuperadmin },
      async (tx) => {
        const [nueva] = await tx.insert(asignatura).values(parsedInput).returning()
        await registrarAuditoria(tx, {
          actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
          accion: 'crear', entidad: 'asignatura', entidadId: nueva!.id,
        })
        return nueva!
      }
    )
  })

const esqCrearPeriodo = z.object({
  anioLectivoId: z.string().uuid(),
  numero: z.number().int().min(1).max(4),
  esquema: z.enum(['cuatro', 'tres', 'dos', 'anual']),
  inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export const crearPeriodo = accionSuperadmin
  .schema(esqCrearPeriodo)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(
      db,
      { usuarioId: ctx.usuario.id, rol: ctx.usuario.rol as RolSuperadmin },
      async (tx) => {
        const [nuevo] = await tx.insert(periodo).values(parsedInput).returning()
        await registrarAuditoria(tx, {
          actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
          accion: 'crear', entidad: 'periodo', entidadId: nuevo!.id,
        })
        return nuevo!
      }
    )
  })

const esqAbrirCerrar = z.object({
  periodoId: z.string().uuid(),
  abrir: z.boolean(),
})

export const abrirCerrarPeriodo = accionSuperadmin
  .schema(esqAbrirCerrar)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(
      db,
      { usuarioId: ctx.usuario.id, rol: ctx.usuario.rol as RolSuperadmin },
      async (tx) => {
        const ahora = new Date()
        const [actualizado] = await tx
          .update(periodo)
          .set({
            notasAbiertas: parsedInput.abrir,
            cerradoEn: parsedInput.abrir ? null : ahora,
          })
          .where(eq(periodo.id, parsedInput.periodoId))
          .returning()
        await registrarAuditoria(tx, {
          actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
          accion: parsedInput.abrir ? 'abrir_periodo' : 'cerrar_periodo',
          entidad: 'periodo', entidadId: parsedInput.periodoId,
        })
        return actualizado!
      }
    )
  })

const esqCrearCurso = z.object({
  anioLectivoId: z.string().uuid(),
  cicloId: z.string().uuid(),
  jornadaId: z.string().uuid(),
  nombre: z.string().min(2).max(60),
})

export const crearCurso = accionSuperadmin
  .schema(esqCrearCurso)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(
      db,
      { usuarioId: ctx.usuario.id, rol: ctx.usuario.rol as RolSuperadmin },
      async (tx) => {
        const [nuevo] = await tx.insert(curso).values(parsedInput).returning()
        await registrarAuditoria(tx, {
          actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
          accion: 'crear', entidad: 'curso', entidadId: nuevo!.id,
        })
        return nuevo!
      }
    )
  })

const esqPlanAsignatura = z.object({
  anioLectivoId: z.string().uuid(),
  cicloId: z.string().uuid(),
  asignaturaId: z.string().uuid(),
  horasSemana: z.number().int().min(1).max(40).default(1),
})

export const agregarAsignaturaPlan = accionSuperadmin
  .schema(esqPlanAsignatura)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(
      db,
      { usuarioId: ctx.usuario.id, rol: ctx.usuario.rol as RolSuperadmin },
      async (tx) => {
        const [nuevo] = await tx
          .insert(planAsignatura)
          .values(parsedInput)
          .onConflictDoUpdate({
            target: [planAsignatura.anioLectivoId, planAsignatura.cicloId, planAsignatura.asignaturaId],
            set: { horasSemana: parsedInput.horasSemana },
          })
          .returning()
        return nuevo!
      }
    )
  })


const esqEliminarAsignatura = z.object({ id: z.string().uuid() })

export const eliminarAsignatura = accionSuperadmin
  .schema(esqEliminarAsignatura)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(
      db,
      { usuarioId: ctx.usuario.id, rol: ctx.usuario.rol as RolSuperadmin },
      async (tx) => {
        const [eliminada] = await tx
          .update(asignatura)
          .set({ eliminadoEn: new Date() })
          .where(eq(asignatura.id, parsedInput.id))
          .returning()
        if (!eliminada) throw new Error('La asignatura indicada no existe')
        await registrarAuditoria(tx, {
          actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
          accion: 'eliminar', entidad: 'asignatura', entidadId: eliminada.id,
        })
        return eliminada
      }
    )
  })

const esqEliminarCurso = z.object({ id: z.string().uuid() })

export const eliminarCurso = accionSuperadmin
  .schema(esqEliminarCurso)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(
      db,
      { usuarioId: ctx.usuario.id, rol: ctx.usuario.rol as RolSuperadmin },
      async (tx) => {
        const [eliminado] = await tx
          .update(curso)
          .set({ eliminadoEn: new Date() })
          .where(eq(curso.id, parsedInput.id))
          .returning()
        if (!eliminado) throw new Error('El curso indicado no existe')
        await registrarAuditoria(tx, {
          actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
          accion: 'eliminar', entidad: 'curso', entidadId: eliminado.id,
        })
        return eliminado
      }
    )
  })

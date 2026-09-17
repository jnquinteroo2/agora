"use server"

import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { db, conContextoRLS, registrarAuditoria } from '../../datos/cliente'
import { calificacion, calificacionHistorial, periodo, escalaValoracion } from '../../datos/esquema'
import { accionDocente } from '../middleware'
import { obtenerNivelDesempeno, redondearNota } from '../../dominio/calculo-academico'

const esqRegistrar = z.object({
  matriculaId: z.string().uuid(),
  asignaturaId: z.string().uuid(),
  periodoId: z.string().uuid(),
  nota: z.number().min(1.0).max(5.0),
  fallas: z.number().int().min(0).max(999).default(0),
  descriptorId: z.string().uuid().optional(),
  descriptorTexto: z.string().max(2000).optional(),
  razon: z.string().max(500).optional(),
})

export const registrarCalificacion = accionDocente
  .schema(esqRegistrar)
  .action(async ({ parsedInput, ctx }) => {
    const rolCtx = ctx.usuario.rol as 'superadmin' | 'docente'

    const { periodoActual, bandas } = await conContextoRLS(
      db,
      { usuarioId: ctx.usuario.id, rol: rolCtx },
      async (tx) => {
        const [p] = await tx.select().from(periodo).where(eq(periodo.id, parsedInput.periodoId)).limit(1)
        if (!p) throw new Error('El periodo indicado no existe')

        const bandas = await tx
          .select()
          .from(escalaValoracion)
          .where(eq(escalaValoracion.anioLectivoId, p.anioLectivoId))

        return { periodoActual: p, bandas }
      }
    )

    if (!periodoActual.notasAbiertas) {
      throw new Error('El periodo está cerrado: no se pueden registrar ni modificar notas')
    }

    const notaRedondeada = redondearNota(parsedInput.nota)
    const nivel = obtenerNivelDesempeno(
      notaRedondeada,
      bandas.map((b) => ({
        nivel: b.nivel,
        desde: Number(b.desde),
        hasta: Number(b.hasta),
        orden: b.orden,
      }))
    )

    return conContextoRLS(
      db,
      {
        usuarioId: ctx.usuario.id,
        rol: rolCtx,
        anioLectivoId: periodoActual.anioLectivoId,
      },
      async (tx) => {
        const [existente] = await tx
          .select()
          .from(calificacion)
          .where(
            and(
              eq(calificacion.matriculaId, parsedInput.matriculaId),
              eq(calificacion.asignaturaId, parsedInput.asignaturaId),
              eq(calificacion.periodoId, parsedInput.periodoId)
            )
          )
          .limit(1)

        if (existente?.bloqueado) {
          throw new Error('Esta calificación está bloqueada y no se puede modificar')
        }

        let fila: typeof calificacion.$inferSelect

        if (existente) {
          const [actualizada] = await tx
            .update(calificacion)
            .set({
              nota: String(notaRedondeada),
              nivelDesempeno: nivel,
              fallas: parsedInput.fallas,
              descriptorId: parsedInput.descriptorId ?? null,
              descriptorTexto: parsedInput.descriptorTexto ?? null,
              actualizadoEn: new Date(),
            })
            .where(eq(calificacion.id, existente.id))
            .returning()

          if (!actualizada) {
            throw new Error('No se pudo actualizar la calificación (verifique permisos y estado del periodo)')
          }
          fila = actualizada

          await tx.insert(calificacionHistorial).values({
            calificacionId: existente.id,
            notaAnterior: existente.nota,
            notaNueva: String(notaRedondeada),
            fallasAnterior: existente.fallas,
            fallasNueva: parsedInput.fallas,
            razon: parsedInput.razon ?? null,
            modificadoPor: ctx.usuario.id,
          })
        } else {
          const [nueva] = await tx
            .insert(calificacion)
            .values({
              matriculaId: parsedInput.matriculaId,
              asignaturaId: parsedInput.asignaturaId,
              periodoId: parsedInput.periodoId,
              nota: String(notaRedondeada),
              nivelDesempeno: nivel,
              fallas: parsedInput.fallas,
              descriptorId: parsedInput.descriptorId ?? null,
              descriptorTexto: parsedInput.descriptorTexto ?? null,
              registradoPor: ctx.usuario.id,
            })
            .returning()

          if (!nueva) {
            throw new Error('No se pudo registrar la calificación (verifique permisos y estado del periodo)')
          }
          fila = nueva
        }

        await registrarAuditoria(tx, {
          actorId: ctx.usuario.id,
          actorRol: ctx.usuario.rol,
          accion: existente ? 'editar_calificacion' : 'crear_calificacion',
          entidad: 'calificacion',
          entidadId: fila.id,
        })

        return fila
      }
    )
  })

const esqBloquear = z.object({
  calificacionId: z.string().uuid(),
  bloqueado: z.boolean(),
})

export const bloquearCalificacion = accionDocente
  .schema(esqBloquear)
  .action(async ({ parsedInput, ctx }) => {
    if (ctx.usuario.rol !== 'superadmin') {
      throw new Error('Solo el superadmin puede bloquear o desbloquear una calificación')
    }

    return conContextoRLS(
      db,
      { usuarioId: ctx.usuario.id, rol: 'superadmin', anioLectivoId: undefined },
      async (tx) => {
        const [fila] = await tx
          .update(calificacion)
          .set({ bloqueado: parsedInput.bloqueado })
          .where(eq(calificacion.id, parsedInput.calificacionId))
          .returning()

        if (!fila) throw new Error('La calificación indicada no existe')

        await registrarAuditoria(tx, {
          actorId: ctx.usuario.id,
          actorRol: ctx.usuario.rol,
          accion: parsedInput.bloqueado ? 'bloquear_calificacion' : 'desbloquear_calificacion',
          entidad: 'calificacion',
          entidadId: fila.id,
        })

        return fila
      }
    )
  })

"use server"

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, conContextoRLS, registrarAuditoria } from '../../datos/cliente'
import { observadorRegistro, matricula } from '../../datos/esquema'
import { accionDocente } from '../middleware'

const TIPOS_OBSERVADOR = ['academica', 'convivencial', 'felicitacion', 'compromiso', 'decision_final'] as const

const esqRegistrar = z.object({
  matriculaId: z.string().uuid(),
  anioLectivoId: z.string().uuid(),
  tipo: z.enum(TIPOS_OBSERVADOR),
  descripcion: z.string().min(1).max(4000),
})

export const registrarObservacion = accionDocente
  .schema(esqRegistrar)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(
      db,
      {
        usuarioId: ctx.usuario.id,
        rol: ctx.usuario.rol as 'superadmin' | 'docente',
        anioLectivoId: parsedInput.anioLectivoId,
      },
      async (tx) => {
        const [m] = await tx.select().from(matricula).where(eq(matricula.id, parsedInput.matriculaId)).limit(1)
        if (!m) {
          throw new Error('La matrícula indicada no existe o usted no tiene acceso a ella')
        }

        const [nueva] = await tx
          .insert(observadorRegistro)
          .values({
            matriculaId: parsedInput.matriculaId,
            tipo: parsedInput.tipo,
            descripcion: parsedInput.descripcion,
            registradoPor: ctx.usuario.id,
          })
          .returning()

        if (!nueva) throw new Error('No se pudo registrar la observación (verifique permisos)')

        await registrarAuditoria(tx, {
          actorId: ctx.usuario.id,
          actorRol: ctx.usuario.rol,
          accion: 'registrar_observacion',
          entidad: 'observador_registro',
          entidadId: nueva.id,
        })

        return nueva
      }
    )
  })

const esqFirmar = z.object({
  observacionId: z.string().uuid(),
  anioLectivoId: z.string().uuid(),
  firmadoEstudiante: z.boolean().optional(),
  firmadoAcudiente: z.boolean().optional(),
})

export const marcarFirmaObservador = accionDocente
  .schema(esqFirmar)
  .action(async ({ parsedInput, ctx }) => {
    if (parsedInput.firmadoEstudiante === undefined && parsedInput.firmadoAcudiente === undefined) {
      throw new Error('Indique al menos una firma para actualizar')
    }

    return conContextoRLS(
      db,
      {
        usuarioId: ctx.usuario.id,
        rol: ctx.usuario.rol as 'superadmin' | 'docente',
        anioLectivoId: parsedInput.anioLectivoId,
      },
      async (tx) => {
        const cambios: Partial<typeof observadorRegistro.$inferInsert> = {}
        if (parsedInput.firmadoEstudiante !== undefined) cambios.firmadoEstudiante = parsedInput.firmadoEstudiante
        if (parsedInput.firmadoAcudiente !== undefined) cambios.firmadoAcudiente = parsedInput.firmadoAcudiente

        const [actualizada] = await tx
          .update(observadorRegistro)
          .set(cambios)
          .where(eq(observadorRegistro.id, parsedInput.observacionId))
          .returning()

        if (!actualizada) {
          throw new Error('La observación indicada no existe o usted no tiene acceso a ella')
        }

        await registrarAuditoria(tx, {
          actorId: ctx.usuario.id,
          actorRol: ctx.usuario.rol,
          accion: 'firmar_observacion',
          entidad: 'observador_registro',
          entidadId: actualizada.id,
        })

        return actualizada
      }
    )
  })

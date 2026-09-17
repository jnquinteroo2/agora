"use server"

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, conContextoRLS, registrarAuditoria, siguienteConsecutivo } from '../../datos/cliente'
import { egreso, anioLectivo } from '../../datos/esquema'
import { accionSuperadmin } from '../middleware'
import { encolarGeneracionPDF } from '../../colas/productor'

const esqRegistrar = z.object({
  categoriaId: z.string().uuid(),
  beneficiario: z.string().min(1).max(200),
  descripcion: z.string().max(500).optional(),
  valor: z.number().positive(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export const registrarEgreso = accionSuperadmin
  .schema(esqRegistrar)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(db, { usuarioId: ctx.usuario.id, rol: 'superadmin' }, async (tx) => {
      const [anioActivo] = await tx
        .select({ id: anioLectivo.id })
        .from(anioLectivo)
        .where(eq(anioLectivo.activo, true))
        .limit(1)

      if (!anioActivo) throw new Error('No hay año lectivo activo')

      const consecutivo = await siguienteConsecutivo(tx, anioActivo.id, 'comprobante_egreso')

      const [nuevo] = await tx
        .insert(egreso)
        .values({
          anioLectivoId: anioActivo.id,
          consecutivo,
          categoriaId: parsedInput.categoriaId,
          beneficiario: parsedInput.beneficiario,
          descripcion: parsedInput.descripcion,
          valor: String(parsedInput.valor),
          fecha: parsedInput.fecha,
          registradoPor: ctx.usuario.id,
        })
        .returning()

      if (!nuevo) throw new Error('No se pudo registrar el egreso')

      await registrarAuditoria(tx, {
        actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
        accion: 'crear_egreso', entidad: 'egreso', entidadId: nuevo.id,
      })

      return nuevo
    })
  })

const esqAnular = z.object({
  egresoId: z.string().uuid(),
  motivo: z.string().min(3).max(500),
})

export const anularEgreso = accionSuperadmin
  .schema(esqAnular)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(db, { usuarioId: ctx.usuario.id, rol: 'superadmin' }, async (tx) => {
      const [existente] = await tx
        .select({ anulado: egreso.anulado })
        .from(egreso)
        .where(eq(egreso.id, parsedInput.egresoId))
        .limit(1)

      if (!existente) throw new Error('El egreso indicado no existe')
      if (existente.anulado) throw new Error('Este egreso ya está anulado')

      const [anulado] = await tx
        .update(egreso)
        .set({
          anulado: true,
          anulacionMotivo: parsedInput.motivo,
          anuladoPor: ctx.usuario.id,
          anuladoEn: new Date(),
        })
        .where(eq(egreso.id, parsedInput.egresoId))
        .returning()

      if (!anulado) throw new Error('No se pudo anular el egreso')

      await registrarAuditoria(tx, {
        actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
        accion: 'anular_egreso', entidad: 'egreso', entidadId: anulado.id,
        diferencia: { motivo: parsedInput.motivo },
      })

      return anulado
    })
  })

const esqGenerarPDF = z.object({ egresoId: z.string().uuid() })

export const generarPDFEgreso = accionSuperadmin
  .schema(esqGenerarPDF)
  .action(async ({ parsedInput, ctx }) => {
    const fila = await conContextoRLS(db, { usuarioId: ctx.usuario.id, rol: 'superadmin' }, async (tx) => {
      const [e] = await tx.select().from(egreso).where(eq(egreso.id, parsedInput.egresoId)).limit(1)
      if (!e) throw new Error('El egreso indicado no existe')
      return e
    })

    const trabajoId = await encolarGeneracionPDF({
      tipo: 'comprobante_egreso',
      entidadId: fila.id,
      anioLectivoId: fila.anioLectivoId,
      solicitadoPor: { id: ctx.usuario.id, rol: 'superadmin' },
    })

    if (!trabajoId) throw new Error('No se pudo encolar la generación del comprobante de egreso')

    return { trabajoId }
  })

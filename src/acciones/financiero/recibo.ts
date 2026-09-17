"use server"

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, conContextoRLS, registrarAuditoria, siguienteConsecutivo } from '../../datos/cliente'
import { reciboCaja, anioLectivo } from '../../datos/esquema'
import { accionSuperadmin } from '../middleware'
import { encolarGeneracionPDF } from '../../colas/productor'

const FORMAS_PAGO = ['efectivo', 'transferencia', 'cheque', 'tarjeta', 'otro'] as const

const esqRegistrar = z.object({
  matriculaId: z.string().uuid().optional(),
  beneficiario: z.string().min(1).max(200),
  conceptoId: z.string().uuid(),
  descripcion: z.string().max(500).optional(),
  valor: z.number().positive(),
  formaPago: z.enum(FORMAS_PAGO),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export const registrarRecibo = accionSuperadmin
  .schema(esqRegistrar)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(db, { usuarioId: ctx.usuario.id, rol: 'superadmin' }, async (tx) => {
      const [anioActivo] = await tx
        .select({ id: anioLectivo.id })
        .from(anioLectivo)
        .where(eq(anioLectivo.activo, true))
        .limit(1)

      if (!anioActivo) throw new Error('No hay año lectivo activo')

      const consecutivo = await siguienteConsecutivo(tx, anioActivo.id, 'recibo_caja')

      const [nuevo] = await tx
        .insert(reciboCaja)
        .values({
          anioLectivoId: anioActivo.id,
          consecutivo,
          matriculaId: parsedInput.matriculaId,
          beneficiario: parsedInput.beneficiario,
          conceptoId: parsedInput.conceptoId,
          descripcion: parsedInput.descripcion,
          valor: String(parsedInput.valor),
          formaPago: parsedInput.formaPago,
          fecha: parsedInput.fecha,
          registradoPor: ctx.usuario.id,
        })
        .returning()

      if (!nuevo) throw new Error('No se pudo registrar el recibo de caja')

      await registrarAuditoria(tx, {
        actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
        accion: 'crear_recibo', entidad: 'recibo_caja', entidadId: nuevo.id,
      })

      return nuevo
    })
  })

const esqAnular = z.object({
  reciboId: z.string().uuid(),
  motivo: z.string().min(3).max(500),
})

export const anularRecibo = accionSuperadmin
  .schema(esqAnular)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(db, { usuarioId: ctx.usuario.id, rol: 'superadmin' }, async (tx) => {
      const [existente] = await tx
        .select({ anulado: reciboCaja.anulado })
        .from(reciboCaja)
        .where(eq(reciboCaja.id, parsedInput.reciboId))
        .limit(1)

      if (!existente) throw new Error('El recibo indicado no existe')
      if (existente.anulado) throw new Error('Este recibo ya está anulado')

      const [anulado] = await tx
        .update(reciboCaja)
        .set({
          anulado: true,
          anulacionMotivo: parsedInput.motivo,
          anuladoPor: ctx.usuario.id,
          anuladoEn: new Date(),
        })
        .where(eq(reciboCaja.id, parsedInput.reciboId))
        .returning()

      if (!anulado) throw new Error('No se pudo anular el recibo')

      await registrarAuditoria(tx, {
        actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
        accion: 'anular_recibo', entidad: 'recibo_caja', entidadId: anulado.id,
        diferencia: { motivo: parsedInput.motivo },
      })

      return anulado
    })
  })

const esqGenerarPDF = z.object({ reciboId: z.string().uuid() })

export const generarPDFRecibo = accionSuperadmin
  .schema(esqGenerarPDF)
  .action(async ({ parsedInput, ctx }) => {
    const recibo = await conContextoRLS(db, { usuarioId: ctx.usuario.id, rol: 'superadmin' }, async (tx) => {
      const [r] = await tx.select().from(reciboCaja).where(eq(reciboCaja.id, parsedInput.reciboId)).limit(1)
      if (!r) throw new Error('El recibo indicado no existe')
      return r
    })

    const trabajoId = await encolarGeneracionPDF({
      tipo: 'recibo_caja',
      entidadId: recibo.id,
      anioLectivoId: recibo.anioLectivoId,
      solicitadoPor: { id: ctx.usuario.id, rol: 'superadmin' },
    })

    if (!trabajoId) throw new Error('No se pudo encolar la generación del recibo')

    return { trabajoId }
  })

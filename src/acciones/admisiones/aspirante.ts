"use server"

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { db, conContextoRLS, registrarAuditoria, siguienteConsecutivo } from '../../datos/cliente'
import { verificarLimiteTasa } from '../../datos/limite-tasa'
import { validarTokenFormulario } from '../../datos/formulario-token'
import { aspirante, anioLectivo, matricula } from '../../datos/esquema'
import { accion, accionSuperadmin } from '../middleware'

const esqFormularioAspirante = z.object({
  primerNombre: z.string().min(1).max(60),
  segundoNombre: z.string().max(60).optional(),
  primerApellido: z.string().min(1).max(60),
  segundoApellido: z.string().max(60).optional(),
  tipoDocumento: z.enum(['TI', 'RC', 'CE', 'PA', 'NIP']),
  numeroDocumento: z.string().min(4).max(20),
  fechaNacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  lugarNacimiento: z.string().max(100).optional(),
  genero: z.enum(['M', 'F', 'NB', 'NR']).optional(),
  cicloId: z.string().uuid(),
  jornadaId: z.string().uuid(),
  telefonoAcudiente: z.string().max(20),
  nombreAcudiente: z.string().min(2).max(120),
  correoAcudiente: z.string().email().optional(),
  autorizacionDatos: z.literal(true, {
    error: 'Debe autorizar el tratamiento de datos',
  }),
  sitio: z.string().optional().default(''),
  formularioServido: z.string().min(1),
})

export const registrarAspirante = accion
  .schema(esqFormularioAspirante)
  .action(async ({ parsedInput }) => {
    if (parsedInput.sitio) {
      return { radicado: 'RAD-0000-0000', aspiranteId: '' }
    }

    validarTokenFormulario(parsedInput.formularioServido)

    const h = await headers()
    const xff = h.get('x-forwarded-for')
    const ip = xff ? xff.split(',').pop()!.trim() : h.get('x-real-ip')

    if (!ip) {
      throw new Error('No se puede procesar la solicitud')
    }

    return conContextoRLS(
      db,
      { usuarioId: '', rol: 'anonimo' },
      async (tx) => {
        await verificarLimiteTasa(tx, `aspirante:${ip}`, 5, 15)

        const [anioActivo] = await tx
          .select({ id: anioLectivo.id, nombre: anioLectivo.nombre })
          .from(anioLectivo)
          .where(eq(anioLectivo.activo, true))
          .limit(1)

        if (!anioActivo) throw new Error('No hay año lectivo activo')

        const consecutivo = await siguienteConsecutivo(tx, anioActivo.id, 'radicado_aspirante')
        const anio = anioActivo.nombre.slice(0, 4)
        const radicado = `RAD-${anio}-${String(consecutivo).padStart(4, '0')}`

        const [nuevo] = await tx
          .insert(aspirante)
          .values({
            radicado,
            cicloId: parsedInput.cicloId,
            jornadaId: parsedInput.jornadaId,
            autorizacionDatos: true,
            autorizacionFecha: new Date(),
            autorizacionVersion: '1.0',
            datosFormulario: parsedInput as Record<string, unknown>,
          })
          .returning()

        return { radicado: nuevo!.radicado, aspiranteId: nuevo!.id }
      }
    )
  })

const esqProcesar = z.object({
  aspiranteId: z.string().uuid(),
  decision: z.enum(['aprobado', 'rechazado']),
  motivoRechazo: z.string().max(500).optional(),
  cursoId: z.string().uuid().optional(),
})

export const procesarAspirante = accionSuperadmin
  .schema(esqProcesar)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(
      db,
      { usuarioId: ctx.usuario.id, rol: ctx.usuario.rol as 'superadmin' },
      async (tx) => {
        const [actualizado] = await tx
          .update(aspirante)
          .set({
            estado: parsedInput.decision,
            motivoRechazo: parsedInput.motivoRechazo,
            revisadoPor: ctx.usuario.id,
            revisadoEn: new Date(),
          })
          .where(eq(aspirante.id, parsedInput.aspiranteId))
          .returning()

        if (!actualizado) throw new Error('Aspirante no encontrado')

        let matriculaId: string | undefined
        if (parsedInput.decision === 'aprobado' && parsedInput.cursoId && actualizado.personaId) {
          const [anioActivo] = await tx
            .select({ id: anioLectivo.id })
            .from(anioLectivo)
            .where(eq(anioLectivo.activo, true))
            .limit(1)

          if (anioActivo) {
            const [nuevaMatricula] = await tx
              .insert(matricula)
              .values({
                anioLectivoId: anioActivo.id,
                estudianteId: actualizado.personaId,
                cursoId: parsedInput.cursoId,
                aspiranteId: actualizado.id,
                estado: 'activo',
              })
              .returning()
            matriculaId = nuevaMatricula!.id
          }
        }

        await registrarAuditoria(tx, {
          actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
          accion: `aspirante_${parsedInput.decision}`,
          entidad: 'aspirante', entidadId: parsedInput.aspiranteId,
        })

        return { estado: actualizado.estado, matriculaId }
      }
    )
  })

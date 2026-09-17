"use server"

import { z } from 'zod'
import { db, conContextoRLS, registrarAuditoria } from '../../datos/cliente'
import { planCobro } from '../../datos/esquema'
import { accionSuperadmin } from '../middleware'

const esqCrear = z.object({
  matriculaId: z.string().uuid(),
  conceptoId: z.string().uuid(),
  mes: z.number().int().min(1).max(12).optional(),
  valorProgramado: z.number().positive(),
})

export const crearPlanCobro = accionSuperadmin
  .schema(esqCrear)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(db, { usuarioId: ctx.usuario.id, rol: 'superadmin' }, async (tx) => {
      const [nuevo] = await tx
        .insert(planCobro)
        .values({
          matriculaId: parsedInput.matriculaId,
          conceptoId: parsedInput.conceptoId,
          mes: parsedInput.mes,
          valorProgramado: String(parsedInput.valorProgramado),
        })
        .returning()

      if (!nuevo) throw new Error('No se pudo crear el plan de cobro')

      await registrarAuditoria(tx, {
        actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
        accion: 'crear', entidad: 'plan_cobro', entidadId: nuevo.id,
      })

      return nuevo
    })
  })

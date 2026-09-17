"use server"

import { z } from 'zod'
import { db, conContextoRLS, registrarAuditoria } from '../../datos/cliente'
import { configuracionInstitucional } from '../../datos/esquema'
import { accionSuperadmin } from '../middleware'

const esqGuardar = z.object({
  nombreLegal: z.string().min(4).max(200),
  nombreCorto: z.string().min(2).max(40),
  lema: z.string().max(200).optional(),
  nit: z.string().max(20).optional(),
  dane: z.string().max(20).optional(),
  resolucion: z.string().max(100).optional(),
  direccion: z.string().max(200).optional(),
  municipio: z.string().max(100).optional(),
  departamento: z.string().max(100).optional(),
  telefono: z.string().max(20).optional(),
  correo: z.string().email().optional(),
  rectorNombre: z.string().min(2).max(100),
  dirAdmNombre: z.string().min(2).max(100),
})

export const guardarConfiguracion = accionSuperadmin
  .schema(esqGuardar)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(
      db,
      { usuarioId: ctx.usuario.id, rol: ctx.usuario.rol as 'superadmin' },
      async (tx) => {
        const existentes = await tx.select().from(configuracionInstitucional).limit(1)
        let resultado
        if (existentes[0]) {
          const [actualizado] = await tx
            .update(configuracionInstitucional)
            .set({ ...parsedInput, actualizadoEn: new Date() })
            .returning()
          resultado = actualizado!
        } else {
          const [nuevo] = await tx
            .insert(configuracionInstitucional)
            .values(parsedInput)
            .returning()
          resultado = nuevo!
        }
        await registrarAuditoria(tx, {
          actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
          accion: 'guardar', entidad: 'configuracion_institucional', entidadId: resultado.id,
        })
        return resultado
      }
    )
  })

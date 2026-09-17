"use server"

import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { db, conContextoRLS } from '../../datos/cliente'
import { periodo, matricula } from '../../datos/esquema'
import { accionDocente, accionSuperadmin } from '../middleware'
import { encolarGeneracionPDF } from '../../colas/productor'

const esqGenerar = z.object({
  matriculaId: z.string().uuid(),
  periodoId: z.string().uuid(),
})

export const generarBoletin = accionDocente
  .schema(esqGenerar)
  .action(async ({ parsedInput, ctx }) => {
    const rolCtx = ctx.usuario.rol as 'superadmin' | 'docente'

    const { periodoActual } = await conContextoRLS(
      db,
      { usuarioId: ctx.usuario.id, rol: rolCtx },
      async (tx) => {
        const [p] = await tx.select().from(periodo).where(eq(periodo.id, parsedInput.periodoId)).limit(1)
        if (!p) throw new Error('El periodo indicado no existe')
        return { periodoActual: p }
      }
    )

    await conContextoRLS(
      db,
      { usuarioId: ctx.usuario.id, rol: rolCtx, anioLectivoId: periodoActual.anioLectivoId },
      async (tx) => {
        const [m] = await tx.select().from(matricula).where(eq(matricula.id, parsedInput.matriculaId)).limit(1)
        if (!m) {
          throw new Error('La matrícula indicada no existe o usted no tiene acceso a ella')
        }
      }
    )

    const trabajoId = await encolarGeneracionPDF({
      tipo: 'boletin',
      entidadId: parsedInput.matriculaId,
      periodoId: parsedInput.periodoId,
      anioLectivoId: periodoActual.anioLectivoId,
      solicitadoPor: { id: ctx.usuario.id, rol: rolCtx },
    })

    if (!trabajoId) throw new Error('No se pudo encolar la generación del boletín')

    return { trabajoId }
  })


const esqGenerarCurso = z.object({
  cursoId: z.string().uuid(),
  periodoId: z.string().uuid(),
})

export const generarBoletinesCurso = accionSuperadmin
  .schema(esqGenerarCurso)
  .action(async ({ parsedInput, ctx }) => {
    const [periodoActual] = await conContextoRLS(
      db,
      { usuarioId: ctx.usuario.id, rol: 'superadmin' },
      async (tx) => tx.select().from(periodo).where(eq(periodo.id, parsedInput.periodoId)).limit(1)
    )
    if (!periodoActual) throw new Error('El periodo indicado no existe')

    const matriculasActivas = await conContextoRLS(
      db,
      { usuarioId: ctx.usuario.id, rol: 'superadmin' },
      async (tx) =>
        tx
          .select()
          .from(matricula)
          .where(and(eq(matricula.cursoId, parsedInput.cursoId), eq(matricula.estado, 'activo')))
    )

    if (matriculasActivas.length === 0) {
      throw new Error('El curso no tiene matrículas activas')
    }

    let encolados = 0
    for (const m of matriculasActivas) {
      const trabajoId = await encolarGeneracionPDF({
        tipo: 'boletin',
        entidadId: m.id,
        periodoId: parsedInput.periodoId,
        anioLectivoId: periodoActual.anioLectivoId,
        solicitadoPor: { id: ctx.usuario.id, rol: 'superadmin' },
      })
      if (trabajoId) encolados += 1
    }

    return { total: matriculasActivas.length, encolados }
  })

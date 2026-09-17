"use server"

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, conContextoRLS, registrarAuditoria } from '../../datos/cliente'
import { matricula, asignacionDocente, persona } from '../../datos/esquema'
import { accionSuperadmin } from '../middleware'
import { esqPersona } from '../personas/persona'

const esqMatricular = z.object({
  anioLectivoId: z.string().uuid(),
  estudianteId: z.string().uuid(),
  cursoId: z.string().uuid(),
  estado: z.enum(['activo', 'retirado', 'trasladado']).default('activo'),
})

export const matricularEstudiante = accionSuperadmin
  .schema(esqMatricular)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(
      db,
      { usuarioId: ctx.usuario.id, rol: ctx.usuario.rol as 'superadmin', anioLectivoId: parsedInput.anioLectivoId },
      async (tx) => {
        const [nueva] = await tx
          .insert(matricula)
          .values(parsedInput)
          .returning()
        await registrarAuditoria(tx, {
          actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
          accion: 'matricular', entidad: 'matricula', entidadId: nueva!.id,
        })
        return nueva!
      }
    )
  })

const esqAsignar = z.object({
  anioLectivoId: z.string().uuid(),
  docenteId: z.string().uuid(),
  asignaturaId: z.string().uuid(),
  cursoId: z.string().uuid(),
})

export const asignarDocente = accionSuperadmin
  .schema(esqAsignar)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(
      db,
      { usuarioId: ctx.usuario.id, rol: ctx.usuario.rol as 'superadmin', anioLectivoId: parsedInput.anioLectivoId },
      async (tx) => {
        const [nueva] = await tx
          .insert(asignacionDocente)
          .values(parsedInput)
          .onConflictDoNothing()
          .returning()
        await registrarAuditoria(tx, {
          actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
          accion: 'asignar_docente', entidad: 'asignacion_docente', entidadId: nueva?.id,
        })
        return nueva ?? null
      }
    )
  })


const esqMatricularNuevo = z.object({
  anioLectivoId: z.string().uuid(),
  cursoId: z.string().uuid(),
  persona: esqPersona,
})

export const matricularNuevoEstudiante = accionSuperadmin
  .schema(esqMatricularNuevo)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(
      db,
      { usuarioId: ctx.usuario.id, rol: ctx.usuario.rol as 'superadmin', anioLectivoId: parsedInput.anioLectivoId },
      async (tx) => {
        const [nuevaPersona] = await tx.insert(persona).values(parsedInput.persona).returning()

        const [nuevaMatricula] = await tx
          .insert(matricula)
          .values({
            anioLectivoId: parsedInput.anioLectivoId,
            cursoId: parsedInput.cursoId,
            estudianteId: nuevaPersona!.id,
          })
          .returning()

        await registrarAuditoria(tx, {
          actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
          accion: 'crear', entidad: 'persona', entidadId: nuevaPersona!.id,
        })
        await registrarAuditoria(tx, {
          actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
          accion: 'matricular', entidad: 'matricula', entidadId: nuevaMatricula!.id,
        })

        return { persona: nuevaPersona!, matricula: nuevaMatricula! }
      }
    )
  })

const esqEditarMatricula = z.object({
  id: z.string().uuid(),
  cursoId: z.string().uuid().optional(),
  estado: z.enum(['activo', 'retirado', 'trasladado']).optional(),
})

export const editarMatricula = accionSuperadmin
  .schema(esqEditarMatricula)
  .action(async ({ parsedInput, ctx }) => {
    const { id, ...datos } = parsedInput
    if (Object.keys(datos).length === 0) throw new Error('No hay cambios para guardar')
    return conContextoRLS(
      db,
      { usuarioId: ctx.usuario.id, rol: ctx.usuario.rol as 'superadmin' },
      async (tx) => {
        const [actualizada] = await tx
          .update(matricula)
          .set(datos)
          .where(eq(matricula.id, id))
          .returning()
        if (!actualizada) throw new Error('La matrícula indicada no existe')
        await registrarAuditoria(tx, {
          actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
          accion: 'editar', entidad: 'matricula', entidadId: actualizada.id,
        })
        return actualizada
      }
    )
  })

const esqQuitarAsignacion = z.object({ id: z.string().uuid() })

export const quitarAsignacionDocente = accionSuperadmin
  .schema(esqQuitarAsignacion)
  .action(async ({ parsedInput, ctx }) => {
    return conContextoRLS(
      db,
      { usuarioId: ctx.usuario.id, rol: ctx.usuario.rol as 'superadmin' },
      async (tx) => {
        const [eliminada] = await tx
          .delete(asignacionDocente)
          .where(eq(asignacionDocente.id, parsedInput.id))
          .returning()
        if (!eliminada) throw new Error('La asignación indicada no existe')
        await registrarAuditoria(tx, {
          actorId: ctx.usuario.id, actorRol: ctx.usuario.rol,
          accion: 'quitar_asignacion', entidad: 'asignacion_docente', entidadId: eliminada.id,
        })
        return eliminada
      }
    )
  })

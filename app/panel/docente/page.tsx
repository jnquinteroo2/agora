import Link from 'next/link'
import { eq } from 'drizzle-orm'
import { obtenerUsuarioActual } from '@/src/auth/sesion'
import { db, conContextoRLS } from '@/src/datos/cliente'
import { anioLectivo, asignacionDocente, asignatura, area, curso, ciclo } from '@/src/datos/esquema'

export default async function InicioDocente() {
  const usuario = await obtenerUsuarioActual()
  if (!usuario) return null

  const [anioActivo] = await db.select().from(anioLectivo).where(eq(anioLectivo.activo, true)).limit(1)

  if (!anioActivo) {
    return (
      <p className="text-panel-secundario">
        No hay un año lectivo activo configurado todavía. Contacte a coordinación académica.
      </p>
    )
  }

  const asignaciones = await conContextoRLS(
    db,
    { usuarioId: usuario.id, rol: 'docente', anioLectivoId: anioActivo.id },
    async (tx) =>
      tx
        .select({ asignacion: asignacionDocente, asignatura, area, curso, ciclo })
        .from(asignacionDocente)
        .innerJoin(asignatura, eq(asignatura.id, asignacionDocente.asignaturaId))
        .innerJoin(area, eq(area.id, asignatura.areaId))
        .innerJoin(curso, eq(curso.id, asignacionDocente.cursoId))
        .innerJoin(ciclo, eq(ciclo.id, curso.cicloId))
        .where(eq(asignacionDocente.anioLectivoId, anioActivo.id))
  )

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl">Mis asignaciones — {anioActivo.nombre}</h1>

      {asignaciones.length === 0 ? (
        <p className="text-panel-secundario">Todavía no tiene asignaturas asignadas para este año lectivo.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {asignaciones.map((a) => (
            <li key={a.asignacion.id}>
              <Link
                href={`/panel/docente/planilla/${a.asignacion.id}`}
                className="flex items-center justify-between rounded-sm border border-panel-borde bg-panel-lateral/40 px-4 py-3 hover:border-carmin"
              >
                <span>
                  <span className="text-panel-secundario">{a.area.nombre} · </span>
                  {a.asignatura.nombre}
                </span>
                <span className="text-panel-secundario">
                  {a.curso.nombre} ({a.ciclo.gradoEquivalente})
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

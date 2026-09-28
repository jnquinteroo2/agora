import { BookOpen, CalendarDays, Presentation } from 'lucide-react'
import { EncabezadoDeInicio, AccesosRapidos } from '@/src/ui/inicio-panel'
import { EstadoVacio } from '@/src/ui/estado-vacio'
import { eq } from 'drizzle-orm'
import { obtenerUsuarioActual } from '@/src/auth/sesion'
import { db, conContextoRLS } from '@/src/datos/cliente'
import { anioLectivo, asignacionDocente, asignatura, area, curso, ciclo } from '@/src/datos/esquema'

export default async function InicioDocente() {
  const usuario = await obtenerUsuarioActual()
  if (!usuario) return null

  const [anioActivo] = await db
    .select()
    .from(anioLectivo)
    .where(eq(anioLectivo.activo, true))
    .limit(1)

  if (!anioActivo) {
    return (
      <div className="flex flex-col gap-10">
        <EncabezadoDeInicio
          perfil="Profesor"
          descripcion="Aquí encontrará sus asignaciones, la planilla de notas y el observador."
        />
        <EstadoVacio
          como="h2"
          icono={<CalendarDays strokeWidth={1.5} />}
          titulo="No hay un año lectivo activo"
          descripcion="Cuando la coordinación académica active el año lectivo, aquí aparecerán sus asignaciones."
        />
      </div>
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
    <div className="flex flex-col gap-10">
      <EncabezadoDeInicio
        perfil="Profesor"
        descripcion={`Sus asignaciones en el año lectivo ${anioActivo.nombre}. Abra una para registrar notas, fallas y descriptores.`}
      />

      {asignaciones.length === 0 ? (
        <EstadoVacio
          como="h2"
          icono={<Presentation strokeWidth={1.5} />}
          titulo="Todavía no tiene asignaturas asignadas"
          descripcion="Cuando la coordinación le asigne una materia y un curso para este año lectivo, aparecerán aquí."
        />
      ) : (
        <AccesosRapidos
          titulo="Mis asignaciones"
          accesos={asignaciones.map((a) => ({
            href: `/panel/docente/planilla/${a.asignacion.id}`,
            titulo: a.asignatura.nombre,
            descripcion: `${a.area.nombre}. ${a.curso.nombre}, ciclo ${a.ciclo.codigo} (${a.ciclo.gradoEquivalente.toLowerCase()}).`,
            icono: BookOpen,
          }))}
        />
      )}
    </div>
  )
}

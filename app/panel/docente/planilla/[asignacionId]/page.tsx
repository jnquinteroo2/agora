import Link from 'next/link'
import { eq, and, inArray } from 'drizzle-orm'
import { obtenerUsuarioActual } from '@/src/auth/sesion'
import { db, conContextoRLS } from '@/src/datos/cliente'
import {
  asignacionDocente,
  asignatura,
  curso,
  periodo,
  matricula,
  persona,
  calificacion,
  descriptor,
} from '@/src/datos/esquema'
import { TablaPlanilla } from './tabla-planilla'

export default async function PlanillaAsignacion({
  params,
  searchParams,
}: {
  params: Promise<{ asignacionId: string }>
  searchParams: Promise<{ periodo?: string }>
}) {
  const { asignacionId } = await params
  const { periodo: periodoIdParam } = await searchParams

  const usuario = await obtenerUsuarioActual()
  if (!usuario) return null

  const rol = usuario.rol as 'superadmin' | 'docente'

  const { asignacion, periodos, estudiantes, notas, descriptores } = await conContextoRLS(
    db,
    { usuarioId: usuario.id, rol },
    async (tx) => {
      const [asignacionFila] = await tx
        .select({ asignacion: asignacionDocente, asignatura, curso })
        .from(asignacionDocente)
        .innerJoin(asignatura, eq(asignatura.id, asignacionDocente.asignaturaId))
        .innerJoin(curso, eq(curso.id, asignacionDocente.cursoId))
        .where(eq(asignacionDocente.id, asignacionId))
        .limit(1)

      if (!asignacionFila) {
        return { asignacion: null, periodos: [], estudiantes: [], notas: [], descriptores: [] }
      }

      const periodosFila = await tx
        .select()
        .from(periodo)
        .where(eq(periodo.anioLectivoId, asignacionFila.asignacion.anioLectivoId))
        .orderBy(periodo.numero)

      const periodoSeleccionado =
        periodosFila.find((p) => p.id === periodoIdParam) ??
        periodosFila.find((p) => p.notasAbiertas) ??
        periodosFila[periodosFila.length - 1]

      return conContextoRLS(
        db,
        { usuarioId: usuario.id, rol, anioLectivoId: asignacionFila.asignacion.anioLectivoId },
        async (tx2) => {
          const estudiantesFila = await tx2
            .select({ matricula, persona })
            .from(matricula)
            .innerJoin(persona, eq(persona.id, matricula.estudianteId))
            .where(eq(matricula.cursoId, asignacionFila.asignacion.cursoId))

          const matriculaIds = estudiantesFila.map((e) => e.matricula.id)

          const notasFila =
            matriculaIds.length && periodoSeleccionado
              ? await tx2
                  .select()
                  .from(calificacion)
                  .where(
                    and(
                      inArray(calificacion.matriculaId, matriculaIds),
                      eq(calificacion.asignaturaId, asignacionFila.asignacion.asignaturaId),
                      eq(calificacion.periodoId, periodoSeleccionado.id)
                    )
                  )
              : []

          const descriptoresFila = await tx2
            .select()
            .from(descriptor)
            .where(eq(descriptor.asignaturaId, asignacionFila.asignacion.asignaturaId))

          return {
            asignacion: { ...asignacionFila, periodoSeleccionado },
            periodos: periodosFila,
            estudiantes: estudiantesFila,
            notas: notasFila,
            descriptores: descriptoresFila,
          }
        }
      )
    }
  )

  if (!asignacion) {
    return <p className="text-panel-secundario">No se encontró esa asignación o usted no tiene acceso a ella.</p>
  }

  const periodoActual = asignacion.periodoSeleccionado

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/panel/docente" className="text-sm text-panel-secundario hover:text-panel-texto">
          ← Mis asignaturas
        </Link>
        <h1 className="mt-2 font-display text-2xl">
          {asignacion.asignatura.nombre} · {asignacion.curso.nombre}
        </h1>
      </div>

      <div className="flex flex-wrap gap-2">
        {periodos.map((p) => (
          <Link
            key={p.id}
            href={`/panel/docente/planilla/${asignacionId}?periodo=${p.id}`}
            className={`rounded-sm border px-3 py-1 text-sm ${
              periodoActual?.id === p.id
                ? 'border-carmin bg-carmin text-hueso'
                : 'border-panel-borde text-panel-secundario hover:text-panel-texto'
            }`}
          >
            Periodo {p.numero}
            {p.notasAbiertas ? '' : ' (cerrado)'}
          </Link>
        ))}
      </div>

      {!periodoActual ? (
        <p className="text-panel-secundario">Este año lectivo todavía no tiene periodos configurados.</p>
      ) : (
        <TablaPlanilla
          asignaturaId={asignacion.asignacion.asignaturaId}
          periodoId={periodoActual.id}
          periodoAbierto={periodoActual.notasAbiertas}
          estudiantes={estudiantes.map((e) => ({
            matriculaId: e.matricula.id,
            nombre: [e.persona.primerNombre, e.persona.primerApellido].filter(Boolean).join(' '),
          }))}
          notasExistentes={notas.map((n) => ({
            matriculaId: n.matriculaId,
            nota: n.nota,
            fallas: n.fallas,
            descriptorId: n.descriptorId,
            bloqueado: n.bloqueado,
          }))}
          descriptores={descriptores.map((d) => ({ id: d.id, nivel: d.nivel, texto: d.texto }))}
        />
      )}
    </div>
  )
}

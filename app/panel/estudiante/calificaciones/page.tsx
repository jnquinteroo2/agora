import { eq, and, desc } from 'drizzle-orm'
import { obtenerUsuarioActual } from '@/src/auth/sesion'
import { db, conContextoRLS } from '@/src/datos/cliente'
import {
  matricula,
  curso,
  periodo,
  calificacion,
  asignatura,
  area,
  documentoGenerado,
  archivo,
  anioLectivo,
} from '@/src/datos/esquema'

export default async function CalificacionesEstudiante() {
  const usuario = await obtenerUsuarioActual()
  if (!usuario) return null

  const [anioActivo] = await db.select().from(anioLectivo).where(eq(anioLectivo.activo, true)).limit(1)

  const { matriculaActual, periodos, filas, documentos } = await conContextoRLS(
    db,
    { usuarioId: usuario.id, rol: 'estudiante' },
    async (tx) => {
      const [m] = await tx
        .select()
        .from(matricula)
        .where(and(eq(matricula.estudianteId, usuario.personaId), eq(matricula.estado, 'activo')))
        .limit(1)

      if (!m) return { matriculaActual: null, periodos: [], filas: [], documentos: [] }

      const periodosFila = anioActivo
        ? await tx.select().from(periodo).where(eq(periodo.anioLectivoId, anioActivo.id)).orderBy(periodo.numero)
        : []

      const filasFila = await tx
        .select({ calificacion, asignatura, area, periodo })
        .from(calificacion)
        .innerJoin(asignatura, eq(asignatura.id, calificacion.asignaturaId))
        .innerJoin(area, eq(area.id, asignatura.areaId))
        .innerJoin(periodo, eq(periodo.id, calificacion.periodoId))
        .where(eq(calificacion.matriculaId, m.id))
        .orderBy(desc(periodo.numero))

      const documentosFila = await tx
        .select({ documentoGenerado, archivo })
        .from(documentoGenerado)
        .innerJoin(archivo, eq(archivo.id, documentoGenerado.archivoId))
        .where(and(eq(documentoGenerado.tipo, 'boletin'), eq(documentoGenerado.entidadId, m.id)))
        .orderBy(desc(documentoGenerado.creadoEn))

      return { matriculaActual: m, periodos: periodosFila, filas: filasFila, documentos: documentosFila }
    }
  )

  if (!matriculaActual) {
    return <p className="text-panel-secundario">No se encontró una matrícula activa para su usuario.</p>
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-2xl">Mis calificaciones</h1>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-panel-borde text-left text-panel-secundario">
            <th className="py-2">Área</th>
            <th className="py-2">Asignatura</th>
            <th className="py-2">Periodo</th>
            <th className="py-2">Nota</th>
            <th className="py-2">Desempeño</th>
            <th className="py-2">Fallas</th>
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-4 text-center text-panel-secundario">
                Todavía no hay calificaciones registradas.
              </td>
            </tr>
          ) : (
            filas.map((f) => (
              <tr key={f.calificacion.id} className="border-b border-panel-borde/50">
                <td className="py-2">{f.area.nombre}</td>
                <td className="py-2">{f.asignatura.nombre}</td>
                <td className="py-2">{f.periodo.numero}</td>
                <td className="py-2">{f.calificacion.nota ? Number(f.calificacion.nota).toFixed(1) : '—'}</td>
                <td className="py-2">{f.calificacion.nivelDesempeno ?? '—'}</td>
                <td className="py-2">{f.calificacion.fallas}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div>
        <h2 className="mb-3 font-display text-xl">Boletines generados</h2>
        {documentos.length === 0 ? (
          <p className="text-panel-secundario">
            Todavía no hay boletines generados. Pídale a su docente que lo genere desde la planilla.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {documentos.map((d) => (
              <li key={d.documentoGenerado.id}>
                <a
                  href={`/api/documentos/${d.archivo.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-carmin hover:underline"
                >
                  {d.archivo.nombreOrig}
                </a>
                <span className="ml-2 text-xs text-panel-secundario">
                  {new Date(d.documentoGenerado.creadoEn).toLocaleDateString('es-CO')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-panel-secundario">
        Periodos del año lectivo activo: {periodos.map((p) => `P${p.numero}${p.notasAbiertas ? ' (en curso)' : ''}`).join(', ') || '—'}
      </p>
    </div>
  )
}

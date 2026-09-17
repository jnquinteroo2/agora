import { eq, and, desc } from 'drizzle-orm'
import { db, conContextoRLS } from '@/src/datos/cliente'
import { obtenerUsuarioActual } from '@/src/auth/sesion'
import {
  anioLectivo,
  curso,
  periodo,
  matricula,
  persona,
  documentoGenerado,
  archivo,
} from '@/src/datos/esquema'
import { tarjeta, tituloTarjeta, encabezadoTabla } from '@/src/ui/estilos'
import { FormularioBoletinIndividual, FormularioBoletinMasivo } from './formularios'

export default async function BoletinesAdmin() {
  const usuarioActual = await obtenerUsuarioActual()
  if (!usuarioActual) return null

  const datos = await conContextoRLS(
    db,
    { usuarioId: usuarioActual.id, rol: 'superadmin' },
    async (tx) => {
      const [activo] = await tx.select().from(anioLectivo).where(eq(anioLectivo.activo, true)).limit(1)
      if (!activo) return { activo: null, cursos: [], periodos: [], matriculas: [], documentos: [] }

      const cursos = (await tx.select().from(curso).where(eq(curso.anioLectivoId, activo.id))).filter(
        (c) => !c.eliminadoEn
      )

      const periodos = await tx.select().from(periodo).where(eq(periodo.anioLectivoId, activo.id)).orderBy(periodo.numero)

      const matriculasFilas = await tx
        .select({ matricula, persona, curso })
        .from(matricula)
        .innerJoin(persona, eq(matricula.estudianteId, persona.id))
        .innerJoin(curso, eq(matricula.cursoId, curso.id))
        .where(and(eq(matricula.anioLectivoId, activo.id), eq(matricula.estado, 'activo')))
        .orderBy(persona.primerApellido, persona.primerNombre)

      const documentosFilas = await tx
        .select({ documentoGenerado, archivo, matricula, persona })
        .from(documentoGenerado)
        .innerJoin(archivo, eq(documentoGenerado.archivoId, archivo.id))
        .innerJoin(matricula, eq(documentoGenerado.entidadId, matricula.id))
        .innerJoin(persona, eq(matricula.estudianteId, persona.id))
        .where(eq(documentoGenerado.tipo, 'boletin'))
        .orderBy(desc(documentoGenerado.creadoEn))
        .limit(30)

      return { activo, cursos, periodos, matriculas: matriculasFilas, documentos: documentosFilas }
    }
  )

  const opcionesMatricula = datos.matriculas.map((f) => ({
    id: f.matricula.id,
    nombre: `${f.persona.primerNombre} ${f.persona.primerApellido} — ${f.curso.nombre}`,
  }))
  const opcionesCurso = datos.cursos.map((c) => ({ id: c.id, nombre: c.nombre }))
  const opcionesPeriodo = datos.periodos.map((p) => ({ id: p.id, nombre: `Periodo ${p.numero}` }))

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-display text-2xl">Boletines</h1>
        <p className="text-sm text-panel-secundario">
          Año lectivo activo: {datos.activo ? datos.activo.nombre : 'ninguno configurado'}
        </p>
      </div>

      {!datos.activo && (
        <p className="text-sm text-panel-secundario">
          Active un año lectivo en Materias para poder generar boletines.
        </p>
      )}

      {datos.activo && (
        <>
          <section className={tarjeta}>
            <h2 className={tituloTarjeta}>Generar boletín individual</h2>
            <FormularioBoletinIndividual matriculas={opcionesMatricula} periodos={opcionesPeriodo} />
          </section>

          <section className={tarjeta}>
            <h2 className={tituloTarjeta}>Generar boletines de todo un curso</h2>
            <p className="mb-2 text-xs text-panel-secundario">
              Encola un boletín por cada estudiante activo del curso en el periodo elegido. La generación toma unos
              segundos por estudiante; los archivos aparecen abajo a medida que el worker los procesa.
            </p>
            <FormularioBoletinMasivo cursos={opcionesCurso} periodos={opcionesPeriodo} />
          </section>

          <section className={tarjeta}>
            <h2 className={tituloTarjeta}>Boletines generados recientemente ({datos.documentos.length})</h2>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className={encabezadoTabla}>
                  <th className="py-2">Estudiante</th>
                  <th className="py-2">Fecha</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {datos.documentos.map((d) => (
                  <tr key={d.documentoGenerado.id} className="border-b border-panel-borde/50">
                    <td className="py-2 pr-3">{d.persona.primerNombre} {d.persona.primerApellido}</td>
                    <td className="py-2 pr-3">{d.documentoGenerado.creadoEn.toISOString().slice(0, 10)}</td>
                    <td className="py-2">
                      <a href={`/api/documentos/${d.archivo.id}`} target="_blank" rel="noreferrer" className="text-carmin hover:underline">
                        Ver PDF
                      </a>
                    </td>
                  </tr>
                ))}
                {datos.documentos.length === 0 && (
                  <tr><td colSpan={3} className="py-3 text-panel-secundario">Sin boletines generados aún</td></tr>
                )}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  )
}

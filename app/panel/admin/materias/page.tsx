import { eq } from 'drizzle-orm'
import { db, conContextoRLS } from '@/src/datos/cliente'
import { obtenerUsuarioActual } from '@/src/auth/sesion'
import {
  anioLectivo,
  jornada,
  ciclo,
  area,
  asignatura,
  planAsignatura,
  periodo,
  curso,
} from '@/src/datos/esquema'
import { tarjeta, tituloTarjeta, encabezadoTabla } from '@/src/ui/estilos'
import {
  FormularioAnioLectivo,
  FilaAnioLectivo,
  FormularioJornada,
  FormularioCiclo,
  FormularioArea,
  FormularioAsignatura,
  FilaAsignatura,
  FormularioPlanAsignatura,
  FormularioPeriodo,
  FilaPeriodo,
  FormularioCurso,
  FilaCurso,
} from './formularios'

export default async function MateriasAdmin() {
  const usuarioActual = await obtenerUsuarioActual()
  if (!usuarioActual) return null

  const datos = await conContextoRLS(
    db,
    { usuarioId: usuarioActual.id, rol: 'superadmin' },
    async (tx) => {
      const anios = await tx.select().from(anioLectivo).orderBy(anioLectivo.nombre)
      const activo = anios.find((a) => a.activo) ?? null

      const jornadas = await tx.select().from(jornada)
      const ciclos = await tx.select().from(ciclo)
      const areas = (await tx.select().from(area)).filter((a) => !a.eliminadoEn)

      const asignaturasFilas = await tx
        .select({ asignatura, area })
        .from(asignatura)
        .innerJoin(area, eq(asignatura.areaId, area.id))
      const asignaturasVigentes = asignaturasFilas.filter((f) => !f.asignatura.eliminadoEn)

      const planFilas = activo
        ? await tx
            .select({ planAsignatura, ciclo, asignatura })
            .from(planAsignatura)
            .innerJoin(ciclo, eq(planAsignatura.cicloId, ciclo.id))
            .innerJoin(asignatura, eq(planAsignatura.asignaturaId, asignatura.id))
            .where(eq(planAsignatura.anioLectivoId, activo.id))
        : []

      const periodos = activo
        ? await tx.select().from(periodo).where(eq(periodo.anioLectivoId, activo.id)).orderBy(periodo.numero)
        : []

      const cursosFilas = activo
        ? await tx
            .select({ curso, ciclo, jornada })
            .from(curso)
            .innerJoin(ciclo, eq(curso.cicloId, ciclo.id))
            .innerJoin(jornada, eq(curso.jornadaId, jornada.id))
            .where(eq(curso.anioLectivoId, activo.id))
        : []
      const cursosVigentes = cursosFilas.filter((f) => !f.curso.eliminadoEn)

      return { anios, activo, jornadas, ciclos, areas, asignaturasVigentes, planFilas, periodos, cursosVigentes }
    }
  )

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-display text-2xl">Materias</h1>
        <p className="text-sm text-panel-secundario">
          Estructura académica: año lectivo, jornadas, ciclos, áreas, materias, plan de estudios, periodos y cursos.
        </p>
      </div>

      <section className={tarjeta}>
        <h2 className={tituloTarjeta}>Año lectivo</h2>
        <table className="mb-3 w-full border-collapse text-sm">
          <thead>
            <tr className={encabezadoTabla}>
              <th className="py-2">Nombre</th>
              <th className="py-2">Fechas</th>
              <th className="py-2">Estado</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {datos.anios.map((a) => <FilaAnioLectivo key={a.id} anio={a} />)}
            {datos.anios.length === 0 && (
              <tr><td colSpan={4} className="py-3 text-panel-secundario">Sin años lectivos aún</td></tr>
            )}
          </tbody>
        </table>
        <FormularioAnioLectivo />
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className={tarjeta}>
          <h2 className={tituloTarjeta}>Jornadas</h2>
          <ul className="mb-3 flex flex-col gap-1 text-sm">
            {datos.jornadas.map((j) => (
              <li key={j.id} className="text-panel-secundario">{j.codigo} — {j.nombre}</li>
            ))}
            {datos.jornadas.length === 0 && <li className="text-panel-secundario">Sin jornadas aún</li>}
          </ul>
          <FormularioJornada />
        </div>

        <div className={tarjeta}>
          <h2 className={tituloTarjeta}>Ciclos</h2>
          <ul className="mb-3 flex flex-col gap-1 text-sm">
            {datos.ciclos.map((c) => (
              <li key={c.id} className="text-panel-secundario">{c.codigo} — {c.gradoEquivalente} ({c.esquemaPeriodos})</li>
            ))}
            {datos.ciclos.length === 0 && <li className="text-panel-secundario">Sin ciclos aún</li>}
          </ul>
          <FormularioCiclo />
        </div>
      </section>

      <section className={tarjeta}>
        <h2 className={tituloTarjeta}>Áreas</h2>
        <ul className="mb-3 flex flex-col gap-1 text-sm">
          {datos.areas.map((a) => (
            <li key={a.id} className="text-panel-secundario">{a.nombre}</li>
          ))}
          {datos.areas.length === 0 && <li className="text-panel-secundario">Sin áreas aún</li>}
        </ul>
        <FormularioArea />
      </section>

      <section className={tarjeta}>
        <h2 className={tituloTarjeta}>Materias ({datos.asignaturasVigentes.length})</h2>
        <table className="mb-3 w-full border-collapse text-sm">
          <thead>
            <tr className={encabezadoTabla}>
              <th className="py-2">Materia</th>
              <th className="py-2">Área</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {datos.asignaturasVigentes.map((f) => (
              <FilaAsignatura key={f.asignatura.id} asignatura={f.asignatura} nombreArea={f.area.nombre} />
            ))}
            {datos.asignaturasVigentes.length === 0 && (
              <tr><td colSpan={3} className="py-3 text-panel-secundario">Sin materias aún</td></tr>
            )}
          </tbody>
        </table>
        <FormularioAsignatura areas={datos.areas} />
      </section>

      <section className={tarjeta}>
        <h2 className={tituloTarjeta}>Plan de estudios del año activo ({datos.planFilas.length})</h2>
        <ul className="mb-3 flex flex-col gap-1 text-sm">
          {datos.planFilas.map((f) => (
            <li key={f.planAsignatura.id} className="text-panel-secundario">
              {f.ciclo.gradoEquivalente} — {f.asignatura.nombre}: {f.planAsignatura.horasSemana} h/semana
            </li>
          ))}
          {datos.planFilas.length === 0 && <li className="text-panel-secundario">Sin plan de estudios aún</li>}
        </ul>
        <FormularioPlanAsignatura
          anioLectivoId={datos.activo?.id ?? null}
          ciclos={datos.ciclos.map((c) => ({ id: c.id, nombre: `${c.codigo} — ${c.gradoEquivalente}` }))}
          asignaturas={datos.asignaturasVigentes.map((f) => f.asignatura)}
        />
      </section>

      <section className={tarjeta}>
        <h2 className={tituloTarjeta}>Periodos del año activo ({datos.periodos.length})</h2>
        <table className="mb-3 w-full border-collapse text-sm">
          <thead>
            <tr className={encabezadoTabla}>
              <th className="py-2">Periodo</th>
              <th className="py-2">Fechas</th>
              <th className="py-2">Estado</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {datos.periodos.map((p) => <FilaPeriodo key={p.id} periodo={p} />)}
            {datos.periodos.length === 0 && (
              <tr><td colSpan={4} className="py-3 text-panel-secundario">Sin periodos aún</td></tr>
            )}
          </tbody>
        </table>
        <FormularioPeriodo anioLectivoId={datos.activo?.id ?? null} />
      </section>

      <section className={tarjeta}>
        <h2 className={tituloTarjeta}>Cursos del año activo ({datos.cursosVigentes.length})</h2>
        <table className="mb-3 w-full border-collapse text-sm">
          <thead>
            <tr className={encabezadoTabla}>
              <th className="py-2">Curso</th>
              <th className="py-2">Ciclo</th>
              <th className="py-2">Jornada</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {datos.cursosVigentes.map((f) => (
              <FilaCurso key={f.curso.id} curso={f.curso} cicloNombre={f.ciclo.gradoEquivalente} jornadaNombre={f.jornada.nombre} />
            ))}
            {datos.cursosVigentes.length === 0 && (
              <tr><td colSpan={4} className="py-3 text-panel-secundario">Sin cursos aún</td></tr>
            )}
          </tbody>
        </table>
        <FormularioCurso
          anioLectivoId={datos.activo?.id ?? null}
          ciclos={datos.ciclos.map((c) => ({ id: c.id, nombre: `${c.codigo} — ${c.gradoEquivalente}` }))}
          jornadas={datos.jornadas.map((j) => ({ id: j.id, nombre: j.nombre }))}
        />
      </section>
    </div>
  )
}

import { eq } from 'drizzle-orm'
import { db, conContextoRLS } from '@/src/datos/cliente'
import { obtenerUsuarioActual } from '@/src/auth/sesion'
import {
  anioLectivo,
  usuario,
  persona,
  asignatura,
  curso,
  asignacionDocente,
} from '@/src/datos/esquema'
import { tarjeta, tituloTarjeta, encabezadoTabla } from '@/src/ui/estilos'
import {
  FormularioNuevoDocente,
  FilaDocente,
  FormularioAsignarMateria,
  FilaAsignacion,
} from './formularios'

export default async function ProfesoresAdmin() {
  const usuarioActual = await obtenerUsuarioActual()
  if (!usuarioActual) return null

  const datos = await conContextoRLS(
    db,
    { usuarioId: usuarioActual.id, rol: 'superadmin' },
    async (tx) => {
      const [activo] = await tx.select().from(anioLectivo).where(eq(anioLectivo.activo, true)).limit(1)

      const docentesFilas = await tx
        .select({ usuario, persona })
        .from(usuario)
        .innerJoin(persona, eq(usuario.personaId, persona.id))
        .where(eq(usuario.rol, 'docente'))
        .orderBy(persona.primerApellido, persona.primerNombre)

      const asignaturasVigentes = (await tx.select().from(asignatura)).filter((a) => !a.eliminadoEn)

      const cursosAnio = activo
        ? (await tx.select().from(curso).where(eq(curso.anioLectivoId, activo.id))).filter((c) => !c.eliminadoEn)
        : []

      const asignaciones = activo
        ? await tx
            .select({ asignacionDocente, docentePersona: persona, asignatura, curso })
            .from(asignacionDocente)
            .innerJoin(usuario, eq(asignacionDocente.docenteId, usuario.id))
            .innerJoin(persona, eq(usuario.personaId, persona.id))
            .innerJoin(asignatura, eq(asignacionDocente.asignaturaId, asignatura.id))
            .innerJoin(curso, eq(asignacionDocente.cursoId, curso.id))
            .where(eq(asignacionDocente.anioLectivoId, activo.id))
        : []

      return { anioActivo: activo, docentesFilas, asignaturasVigentes, cursosAnio, asignaciones }
    }
  )

  const docentesOpciones = datos.docentesFilas.map(({ usuario: u, persona: p }) => ({
    id: u.id,
    nombre: `${p.primerNombre} ${p.primerApellido}`,
  }))

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-display text-2xl">Profesores</h1>
        <p className="text-sm text-panel-secundario">
          Año lectivo activo: {datos.anioActivo ? datos.anioActivo.nombre : 'ninguno configurado'}
        </p>
      </div>

      <section className={tarjeta}>
        <h2 className={tituloTarjeta}>Registrar docente</h2>
        <FormularioNuevoDocente />
      </section>

      <section className={tarjeta}>
        <h2 className={tituloTarjeta}>Docentes ({datos.docentesFilas.length})</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className={encabezadoTabla}>
              <th className="py-2">Nombre</th>
              <th className="py-2">Correo</th>
              <th className="py-2">Estado</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {datos.docentesFilas.map(({ usuario: u, persona: p }) => (
              <FilaDocente key={u.id} docente={u} nombreCompleto={`${p.primerNombre} ${p.primerApellido}`} />
            ))}
            {datos.docentesFilas.length === 0 && (
              <tr><td colSpan={4} className="py-3 text-panel-secundario">Sin docentes registrados aún</td></tr>
            )}
          </tbody>
        </table>
      </section>

      <section className={tarjeta}>
        <h2 className={tituloTarjeta}>Asignar materia a un docente</h2>
        <FormularioAsignarMateria
          anioLectivoId={datos.anioActivo?.id ?? null}
          docentes={docentesOpciones}
          asignaturas={datos.asignaturasVigentes}
          cursos={datos.cursosAnio}
        />
      </section>

      <section className={tarjeta}>
        <h2 className={tituloTarjeta}>Asignaciones vigentes ({datos.asignaciones.length})</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className={encabezadoTabla}>
              <th className="py-2">Docente</th>
              <th className="py-2">Materia</th>
              <th className="py-2">Curso</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {datos.asignaciones.map((fila) => (
              <FilaAsignacion
                key={fila.asignacionDocente.id}
                id={fila.asignacionDocente.id}
                docenteNombre={`${fila.docentePersona.primerNombre} ${fila.docentePersona.primerApellido}`}
                asignaturaNombre={fila.asignatura.nombre}
                cursoNombre={fila.curso.nombre}
              />
            ))}
            {datos.asignaciones.length === 0 && (
              <tr><td colSpan={4} className="py-3 text-panel-secundario">Sin asignaciones en el año activo</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}

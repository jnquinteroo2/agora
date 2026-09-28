import { eq, and } from 'drizzle-orm'
import { db, conContextoRLS } from '@/src/datos/cliente'
import { obtenerUsuarioActual } from '@/src/auth/sesion'
import { env } from '@/src/env'
import { anioLectivo, curso, matricula, persona } from '@/src/datos/esquema'
import { tarjeta, tituloTarjeta, encabezadoTabla } from '@/src/ui/estilos'
import {
  FormularioNuevoEstudiante,
  FormularioMatricularExistente,
  FilaMatricula,
} from './formularios'

export default async function EstudiantesAdmin() {
  const usuario = await obtenerUsuarioActual()
  if (!usuario) return null

  const { anioActivo, cursos, filas } = await conContextoRLS(
    db,
    { usuarioId: usuario.id, rol: 'superadmin' },
    async (tx) => {
      const [activo] = await tx
        .select()
        .from(anioLectivo)
        .where(eq(anioLectivo.activo, true))
        .limit(1)

      if (!activo) return { anioActivo: null, cursos: [], filas: [] }

      const cursosAnio = await tx
        .select()
        .from(curso)
        .where(and(eq(curso.anioLectivoId, activo.id)))

      const cursosVigentes = cursosAnio.filter((c) => !c.eliminadoEn)

      const filasMatricula = await tx
        .select({ matricula, persona })
        .from(matricula)
        .innerJoin(persona, eq(matricula.estudianteId, persona.id))
        .where(eq(matricula.anioLectivoId, activo.id))
        .orderBy(persona.primerApellido, persona.primerNombre)

      return { anioActivo: activo, cursos: cursosVigentes, filas: filasMatricula }
    }
  )

  const cursosPorId = new Map(cursos.map((c) => [c.id, c.nombre]))

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-titulo text-titulo font-medium">Estudiantes</h1>
        <p className="text-nota text-texto-secundario">
          Año lectivo activo: {anioActivo ? anioActivo.nombre : 'ninguno configurado'}
        </p>
      </div>

      <section className={tarjeta}>
        <h2 className={tituloTarjeta}>Registrar y matricular estudiante nuevo</h2>
        <FormularioNuevoEstudiante anioLectivoId={anioActivo?.id ?? null} cursos={cursos} />
      </section>

      <section className={tarjeta}>
        <h2 className={tituloTarjeta}>Matricular estudiante ya existente</h2>
        <p className="mb-2 text-menudo text-texto-secundario">
          Para un estudiante de un año lectivo anterior: búsquelo por documento y asígnele curso en
          el año activo.
        </p>
        <FormularioMatricularExistente anioLectivoId={anioActivo?.id ?? null} cursos={cursos} />
      </section>

      <section className={tarjeta}>
        <h2 className={tituloTarjeta}>Matriculados en el año activo ({filas.length})</h2>
        <div
          role="region"
          aria-label="Tabla con desplazamiento horizontal"
          tabIndex={0}
          className="-mx-1 overflow-x-auto px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
        >
          <table className="w-full border-collapse text-nota">
            <thead>
              <tr className={encabezadoTabla}>
                <th className="py-2">Estudiante</th>
                <th className="py-2">Documento</th>
                <th className="py-2">Curso</th>
                <th className="py-2">Estado</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filas.map(({ matricula: m, persona: p }) => (
                <FilaMatricula
                  key={m.id}
                  matricula={m}
                  nombreEstudiante={`${p.primerNombre} ${p.primerApellido}`}
                  documento={`${p.tipoDocumento} ${p.numeroDocumento}`}
                  cursos={cursos}
                  conKeycloak={env.AUTH_KEYCLOAK_HABILITADO}
                />
              ))}
              {filas.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-3 text-texto-secundario">
                    Sin estudiantes matriculados aún
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {cursosPorId.size === 0 && anioActivo && (
          <p className="mt-3 text-menudo text-texto-secundario">
            No hay cursos creados en el año activo. Cree al menos uno en Materias antes de
            matricular.
          </p>
        )}
      </section>
    </div>
  )
}

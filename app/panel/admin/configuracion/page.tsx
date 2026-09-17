import { eq, and } from 'drizzle-orm'
import { db, conContextoRLS } from '@/src/datos/cliente'
import { obtenerUsuarioActual } from '@/src/auth/sesion'
import {
  configuracionInstitucional,
  anioLectivo,
  matricula,
  persona,
  conceptoIngreso,
  categoriaEgreso,
} from '@/src/datos/esquema'
import { tarjeta, tituloTarjeta } from '@/src/ui/estilos'
import {
  FormularioInstitucion,
  FormularioConcepto,
  FilaConcepto,
  FormularioCategoria,
  FilaCategoria,
  FormularioPlanCobro,
} from './formularios'

export default async function ConfiguracionAdmin() {
  const usuarioActual = await obtenerUsuarioActual()
  if (!usuarioActual) return null

  const datos = await conContextoRLS(
    db,
    { usuarioId: usuarioActual.id, rol: 'superadmin' },
    async (tx) => {
      const [configuracion] = await tx.select().from(configuracionInstitucional).limit(1)
      const [activo] = await tx.select().from(anioLectivo).where(eq(anioLectivo.activo, true)).limit(1)

      const conceptos = (await tx.select().from(conceptoIngreso)).filter((c) => !c.eliminadoEn)
      const categorias = (await tx.select().from(categoriaEgreso)).filter((c) => !c.eliminadoEn)

      const matriculasFilas = activo
        ? await tx
            .select({ matricula, persona })
            .from(matricula)
            .innerJoin(persona, eq(matricula.estudianteId, persona.id))
            .where(and(eq(matricula.anioLectivoId, activo.id), eq(matricula.estado, 'activo')))
            .orderBy(persona.primerApellido, persona.primerNombre)
        : []

      return { configuracion: configuracion ?? null, conceptos, categorias, matriculasFilas }
    }
  )

  const opcionesMatricula = datos.matriculasFilas.map((f) => ({
    id: f.matricula.id,
    nombre: `${f.persona.primerNombre} ${f.persona.primerApellido}`,
  }))

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-display text-2xl">Configuración</h1>
        <p className="text-sm text-panel-secundario">
          Datos institucionales y catálogos financieros (conceptos, categorías, planes de cobro).
        </p>
      </div>

      <section className={tarjeta}>
        <h2 className={tituloTarjeta}>Institución</h2>
        <FormularioInstitucion actual={datos.configuracion} />
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className={tarjeta}>
          <h2 className={tituloTarjeta}>Conceptos de ingreso</h2>
          <ul className="mb-3 flex flex-col gap-1 text-sm">
            {datos.conceptos.map((c) => <FilaConcepto key={c.id} concepto={c} />)}
            {datos.conceptos.length === 0 && <li className="text-panel-secundario">Sin conceptos aún</li>}
          </ul>
          <FormularioConcepto />
        </div>

        <div className={tarjeta}>
          <h2 className={tituloTarjeta}>Categorías de egreso</h2>
          <ul className="mb-3 flex flex-col gap-1 text-sm">
            {datos.categorias.map((c) => <FilaCategoria key={c.id} categoria={c} />)}
            {datos.categorias.length === 0 && <li className="text-panel-secundario">Sin categorías aún</li>}
          </ul>
          <FormularioCategoria />
        </div>
      </section>

      <section className={tarjeta}>
        <h2 className={tituloTarjeta}>Planes de cobro</h2>
        <p className="mb-2 text-xs text-panel-secundario">
          Cuánto se espera cobrar por estudiante (matrícula, mensualidad, etc.) — no cuánto se ha cobrado ya, eso lo
          registra un recibo en Finanzas.
        </p>
        <FormularioPlanCobro matriculas={opcionesMatricula} conceptos={datos.conceptos} />
      </section>
    </div>
  )
}

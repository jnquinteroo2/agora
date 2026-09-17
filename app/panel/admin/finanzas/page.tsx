import { eq, desc } from 'drizzle-orm'
import { db, conContextoRLS } from '@/src/datos/cliente'
import { obtenerUsuarioActual } from '@/src/auth/sesion'
import {
  anioLectivo,
  conceptoIngreso,
  categoriaEgreso,
  reciboCaja,
  egreso,
} from '@/src/datos/esquema'
import {
  FormularioRecibo,
  FormularioEgreso,
  FilaRecibo,
  FilaEgreso,
} from './formularios'

export default async function InicioFinanzas() {
  const usuario = await obtenerUsuarioActual()
  if (!usuario) return null

  const { conceptos, categorias, recibos, egresos, anioActivo } = await conContextoRLS(
    db,
    { usuarioId: usuario.id, rol: 'superadmin' },
    async (tx) => {
      const [activo] = await tx.select().from(anioLectivo).where(eq(anioLectivo.activo, true)).limit(1)

      const [conceptos, categorias, recibos, egresos] = await Promise.all([
        tx.select().from(conceptoIngreso),
        tx.select().from(categoriaEgreso),
        tx.select().from(reciboCaja).orderBy(desc(reciboCaja.creadoEn)).limit(20),
        tx.select().from(egreso).orderBy(desc(egreso.creadoEn)).limit(20),
      ])

      return { conceptos, categorias, recibos, egresos, anioActivo: activo }
    }
  )

  const conceptosActivos = conceptos.filter((c) => !c.eliminadoEn)
  const categoriasActivas = categorias.filter((c) => !c.eliminadoEn)

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-display text-2xl">Finanzas</h1>
        <p className="text-sm text-panel-secundario">
          Año lectivo activo: {anioActivo ? anioActivo.nombre : 'ninguno configurado'}
        </p>
      </div>

      {conceptosActivos.length === 0 && (
        <p className="text-sm text-panel-secundario">
          No hay conceptos de ingreso creados. Cree al menos uno en Configuración antes de registrar recibos.
        </p>
      )}

      <section className="rounded-sm border border-panel-borde p-4">
        <h2 className="mb-3 font-display text-lg">Registrar recibo de caja</h2>
        <FormularioRecibo conceptos={conceptosActivos} />
      </section>

      <section className="rounded-sm border border-panel-borde p-4">
        <h2 className="mb-3 font-display text-lg">Recibos recientes</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-panel-borde text-left text-panel-secundario">
              <th className="py-2">N.º</th>
              <th className="py-2">Fecha</th>
              <th className="py-2">Beneficiario</th>
              <th className="py-2">Valor</th>
              <th className="py-2">Estado</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {recibos.map((r) => (
              <FilaRecibo key={r.id} recibo={r} />
            ))}
            {recibos.length === 0 && (
              <tr><td colSpan={6} className="py-3 text-panel-secundario">Sin recibos registrados</td></tr>
            )}
          </tbody>
        </table>
      </section>

      {categoriasActivas.length === 0 && (
        <p className="text-sm text-panel-secundario">
          No hay categorías de egreso creadas. Cree al menos una en Configuración antes de registrar egresos.
        </p>
      )}

      <section className="rounded-sm border border-panel-borde p-4">
        <h2 className="mb-3 font-display text-lg">Registrar egreso</h2>
        <FormularioEgreso categorias={categoriasActivas} />
      </section>

      <section className="rounded-sm border border-panel-borde p-4">
        <h2 className="mb-3 font-display text-lg">Egresos recientes</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-panel-borde text-left text-panel-secundario">
              <th className="py-2">N.º</th>
              <th className="py-2">Fecha</th>
              <th className="py-2">Beneficiario</th>
              <th className="py-2">Valor</th>
              <th className="py-2">Estado</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {egresos.map((e) => (
              <FilaEgreso key={e.id} egreso={e} />
            ))}
            {egresos.length === 0 && (
              <tr><td colSpan={6} className="py-3 text-panel-secundario">Sin egresos registrados</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}

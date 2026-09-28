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
import { FormularioRecibo, FormularioEgreso, FilaRecibo, FilaEgreso } from './formularios'

export default async function InicioFinanzas() {
  const usuario = await obtenerUsuarioActual()
  if (!usuario) return null

  const { conceptos, categorias, recibos, egresos, anioActivo } = await conContextoRLS(
    db,
    { usuarioId: usuario.id, rol: 'superadmin' },
    async (tx) => {
      const [activo] = await tx
        .select()
        .from(anioLectivo)
        .where(eq(anioLectivo.activo, true))
        .limit(1)

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
        <h1 className="font-titulo text-titulo font-medium">Finanzas</h1>
        <p className="text-nota text-texto-secundario">
          Año lectivo activo: {anioActivo ? anioActivo.nombre : 'ninguno configurado'}
        </p>
      </div>

      {conceptosActivos.length === 0 && (
        <p className="text-nota text-texto-secundario">
          No hay conceptos de ingreso creados. Cree al menos uno en Configuración antes de registrar
          recibos.
        </p>
      )}

      <section className="rounded-control border border-borde p-4">
        <h2 className="mb-3 font-titulo text-rubro">Registrar recibo de caja</h2>
        <FormularioRecibo conceptos={conceptosActivos} />
      </section>

      <section className="rounded-control border border-borde p-4">
        <h2 className="mb-3 font-titulo text-rubro">Recibos recientes</h2>
        <div
          role="region"
          aria-label="Tabla con desplazamiento horizontal"
          tabIndex={0}
          className="-mx-1 overflow-x-auto px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
        >
          <table className="w-full border-collapse text-nota">
            <thead>
              <tr className="border-b border-borde text-left text-texto-secundario">
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
                <tr>
                  <td colSpan={6} className="py-3 text-texto-secundario">
                    Sin recibos registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {categoriasActivas.length === 0 && (
        <p className="text-nota text-texto-secundario">
          No hay categorías de egreso creadas. Cree al menos una en Configuración antes de registrar
          egresos.
        </p>
      )}

      <section className="rounded-control border border-borde p-4">
        <h2 className="mb-3 font-titulo text-rubro">Registrar egreso</h2>
        <FormularioEgreso categorias={categoriasActivas} />
      </section>

      <section className="rounded-control border border-borde p-4">
        <h2 className="mb-3 font-titulo text-rubro">Egresos recientes</h2>
        <div
          role="region"
          aria-label="Tabla con desplazamiento horizontal"
          tabIndex={0}
          className="-mx-1 overflow-x-auto px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
        >
          <table className="w-full border-collapse text-nota">
            <thead>
              <tr className="border-b border-borde text-left text-texto-secundario">
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
                <tr>
                  <td colSpan={6} className="py-3 text-texto-secundario">
                    Sin egresos registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

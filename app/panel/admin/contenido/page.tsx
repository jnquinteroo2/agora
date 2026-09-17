import Link from 'next/link'
import { desc } from 'drizzle-orm'
import { db, conContextoRLS } from '@/src/datos/cliente'
import { obtenerUsuarioActual } from '@/src/auth/sesion'
import { cmsEntrada } from '@/src/datos/esquema'
import { FormularioCrearEntrada, FilaEntrada } from './formularios'

export default async function ContenidoPage() {
  const usuario = await obtenerUsuarioActual()
  if (!usuario) return null

  const entradas = await conContextoRLS(db, { usuarioId: usuario.id, rol: 'superadmin' }, async (tx) =>
    tx.select().from(cmsEntrada).orderBy(desc(cmsEntrada.creadoEn))
  )

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl">Contenido del sitio</h1>
        <p className="text-sm text-panel-secundario">
          Noticias y álbumes que aparecen en /blog y /galeria una vez publicados.
        </p>
      </div>

      <section className="rounded-sm border border-panel-borde p-4">
        <h2 className="mb-3 font-display text-lg">Crear entrada</h2>
        <FormularioCrearEntrada />
      </section>

      <section className="rounded-sm border border-panel-borde p-4">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-panel-borde text-left text-panel-secundario">
              <th className="py-2">Tipo</th>
              <th className="py-2">Título</th>
              <th className="py-2">Slug</th>
              <th className="py-2">Estado</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {entradas.map((entrada) => (
              <FilaEntrada key={entrada.id} entrada={entrada} />
            ))}
            {entradas.length === 0 && (
              <tr><td colSpan={5} className="py-3 text-panel-secundario">Sin entradas todavía</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}

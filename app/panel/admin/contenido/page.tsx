import { desc } from 'drizzle-orm'
import { db, conContextoRLS } from '@/src/datos/cliente'
import { obtenerUsuarioActual } from '@/src/auth/sesion'
import { cmsEntrada } from '@/src/datos/esquema'
import { FormularioCrearEntrada, FilaEntrada } from './formularios'

export default async function ContenidoPage() {
  const usuario = await obtenerUsuarioActual()
  if (!usuario) return null

  const entradas = await conContextoRLS(
    db,
    { usuarioId: usuario.id, rol: 'superadmin' },
    async (tx) => tx.select().from(cmsEntrada).orderBy(desc(cmsEntrada.creadoEn))
  )

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-titulo text-titulo font-medium">Contenido del sitio</h1>
        <p className="text-nota text-texto-secundario">
          Noticias y álbumes que aparecen en /blog y /galeria una vez publicados.
        </p>
      </div>

      <section className="rounded-control border border-borde p-4">
        <h2 className="mb-3 font-titulo text-rubro">Crear entrada</h2>
        <FormularioCrearEntrada />
      </section>

      <section className="rounded-control border border-borde p-4">
        <div
          role="region"
          aria-label="Tabla con desplazamiento horizontal"
          tabIndex={0}
          className="-mx-1 overflow-x-auto px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
        >
          <table className="w-full border-collapse text-nota">
            <thead>
              <tr className="border-b border-borde text-left text-texto-secundario">
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
                <tr>
                  <td colSpan={5} className="py-3 text-texto-secundario">
                    Sin entradas todavía
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

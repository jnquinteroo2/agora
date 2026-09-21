import { metadatosDePagina } from '@/src/seo/metadatos'
import { obtenerEntradas } from '@/src/datos/cms-publico'
import { obtenerConfiguracion } from '@/src/datos/configuracion-publica'
import { Contenedor } from '@/src/ui/contenedor'
import { Seccion, EncabezadoDePagina } from '@/src/ui/seccion'
import { Migas } from '@/src/ui/migas'
import { EstadoVacio } from '@/src/ui/estado-vacio'
import { EnlaceBoton } from '@/src/ui/boton'

export const dynamic = 'force-dynamic'

export const metadata = metadatosDePagina({
  titulo: 'Aliados',
  descripcion:
    'Entidades y organizaciones que trabajan con la institución en admisiones, bienestar estudiantil y el paso a la educación superior o al trabajo.',
  ruta: '/aliados',
})

export default async function AliadosPage() {
  const [aliados, config] = await Promise.all([obtenerEntradas('aliado'), obtenerConfiguracion()])
  const hayContacto = Boolean(config?.telefono || config?.correo)

  return (
    <>
      <Seccion aire="md">
        <Contenedor ancho="amplio">
          <EncabezadoDePagina
            migas={
              <Migas ruta={[{ etiqueta: 'Inicio', href: '/inicio' }, { etiqueta: 'Aliados' }]} />
            }
            titulo="Alianzas institucionales"
            entrada="Entidades, empresas y organizaciones que trabajan con la institución en admisiones, bienestar estudiantil y el paso a la educación superior o al trabajo."
          />
        </Contenedor>
      </Seccion>

      <Seccion aire="md" filete="arriba">
        <Contenedor ancho="amplio">
          {aliados.length > 0 ? (
            <ul className="grid gap-px bg-niebla sm:grid-cols-2 lg:grid-cols-3">
              {aliados.map((aliado) => (
                <li key={aliado.id} className="flex flex-col gap-2 bg-hueso pt-6 pr-6 pb-8">
                  <h2 className="font-display text-rubro font-medium text-tinta">
                    {aliado.titulo}
                  </h2>
                  {aliado.subtitulo ? (
                    <p className="versalitas text-menudo text-piedra">{aliado.subtitulo}</p>
                  ) : null}
                  {aliado.cuerpo ? (
                    <p className="prosa text-nota leading-relaxed text-piedra">{aliado.cuerpo}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <EstadoVacio
              titulo="No hay alianzas publicadas"
              descripcion="Esta página muestra solo convenios firmados por la institución, sin logos ni nombres de entidades que no tengan un acuerdo formal."
              accion={
                hayContacto ? (
                  <EnlaceBoton href="/contacto" tono="secundario">
                    Proponer una alianza
                  </EnlaceBoton>
                ) : undefined
              }
            />
          )}
        </Contenedor>
      </Seccion>
    </>
  )
}

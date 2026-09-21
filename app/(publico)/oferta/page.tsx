import { metadatosDePagina, resumir } from '@/src/seo/metadatos'
import { obtenerOferta, claveOferta, cuentaCiclosPorJornada } from '@/src/datos/oferta-publica'
import { Contenedor } from '@/src/ui/contenedor'
import { Seccion, TituloDeSeccion, EncabezadoDePagina } from '@/src/ui/seccion'
import { Migas } from '@/src/ui/migas'
import { EnlaceBoton } from '@/src/ui/boton'
import { EstadoVacio } from '@/src/ui/estado-vacio'
import { ordenarCiclos } from '@/src/ui/escalera-clei'
import { obtenerConfiguracion } from '@/src/datos/configuracion-publica'
import { cardinal, listaConjuntiva } from '@/src/ui/numero'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const { jornadas, anio } = await obtenerOferta()
  const nombres = listaConjuntiva(jornadas.map((j) => j.nombre.toLowerCase()))
  return metadatosDePagina({
    titulo: 'Oferta educativa',
    descripcion: resumir(
      jornadas.length > 0
        ? `Los ciclos que abre la institución${anio ? ` en ${anio}` : ''} y las jornadas en que se estudia: ${nombres}.`
        : 'Los ciclos que abre la institución y las jornadas en que se estudia.'
    ),
    ruta: '/oferta',
  })
}

export default async function OfertaPage() {
  const [oferta, config] = await Promise.all([obtenerOferta(), obtenerConfiguracion()])
  const hayContacto = Boolean(config?.telefono || config?.correo)
  const { ciclos, jornadas, anio, combinaciones, completa } = oferta
  const peldanos = ordenarCiclos(ciclos)
  const hayOferta = peldanos.length > 0 && jornadas.length > 0

  const nombresJornadas = listaConjuntiva(jornadas.map((j) => j.nombre.toLowerCase()))

  return (
    <>
      <Seccion aire="md">
        <Contenedor ancho="amplio">
          <EncabezadoDePagina
            migas={
              <Migas
                ruta={[{ etiqueta: 'Inicio', href: '/inicio' }, { etiqueta: 'Oferta educativa' }]}
              />
            }
            titulo="Ciclos y jornadas"
            entrada="El ciclo define el grado que se va a cursar. La jornada define cuándo se estudia. Lo primero depende de los estudios ya aprobados; lo segundo es lo que hay que elegir."
          />
        </Contenedor>
      </Seccion>

      {!hayOferta ? (
        <Seccion aire="md" filete="arriba">
          <Contenedor ancho="amplio">
            <EstadoVacio
              titulo={anio ? `No hay oferta publicada para ${anio}` : 'No hay oferta publicada'}
              accion={
                hayContacto ? (
                  <EnlaceBoton href="/contacto" tono="secundario">
                    Consultar con la institución
                  </EnlaceBoton>
                ) : undefined
              }
            />
          </Contenedor>
        </Seccion>
      ) : null}

      {hayOferta && completa ? (
        <Seccion aire="md" filete="arriba">
          <Contenedor ancho="amplio" className="flex flex-col gap-8">
            <p className="equilibrado max-w-[26ch] font-display text-titulo font-light text-tinta">
              Los {cardinal(peldanos.length)} ciclos están abiertos en jornada {nombresJornadas}.
            </p>
            <p className="prosa max-w-medida text-nota leading-relaxed text-piedra">
              El ciclo de ingreso depende de los estudios ya aprobados, no de la jornada.
            </p>
          </Contenedor>
        </Seccion>
      ) : null}

      {hayOferta && !completa ? (
        <Seccion aire="md" filete="arriba">
          <Contenedor ancho="amplio" className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <TituloDeSeccion>
                {anio ? `Cuadro de oferta ${anio}` : 'Cuadro de oferta'}
              </TituloDeSeccion>
              <p className="prosa max-w-medida text-nota leading-relaxed text-piedra">
                No todos los ciclos se abren en todas las jornadas. Cada marca indica un ciclo
                abierto este año.
              </p>
            </div>
            <div
              role="region"
              aria-label="Cuadro de oferta por ciclo y jornada"
              tabIndex={0}
              className="relative w-full min-w-0 overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carmin"
            >
              <table className="w-full min-w-[34rem] border-collapse text-nota">
                <caption className="sr-only">
                  Ciclos cruzados con jornadas{anio ? ` para el año ${anio}` : ''}.
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="w-1/3 border-b border-tinta pb-3 text-left">
                      <span className="versalitas text-menudo text-piedra">Ciclo</span>
                    </th>
                    {jornadas.map((j) => (
                      <th
                        key={j.id}
                        scope="col"
                        className="border-b border-tinta px-4 pb-3 text-left align-bottom"
                      >
                        <span className="font-display text-rubro font-medium text-tinta">
                          {j.nombre}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {peldanos.map((c, indice) => (
                    <tr key={c.id}>
                      <th
                        scope="row"
                        className="border-b border-niebla py-4 text-left align-middle"
                        style={{ ['--nivel' as string]: indice }}
                      >
                        <span
                          className="flex items-baseline gap-4"
                          style={{
                            paddingInlineStart: 'calc(var(--nivel) * clamp(0.5rem, 1.4vw, 1.5rem))',
                          }}
                        >
                          <span aria-hidden="true" className="h-px w-5 shrink-0 bg-tinta" />
                          <span className="font-display text-rubro font-medium text-tinta tabular-nums">
                            {c.codigo}
                          </span>
                          <span className="text-menudo text-piedra">{c.gradoEquivalente}</span>
                        </span>
                      </th>
                      {jornadas.map((j) => {
                        const abierto = combinaciones.has(claveOferta(c.id, j.id))
                        return (
                          <td key={j.id} className="border-b border-niebla px-4 py-4 align-middle">
                            {abierto ? (
                              <>
                                <span aria-hidden="true" className="block h-2.5 w-2.5 bg-tinta" />
                                <span className="sr-only">Disponible</span>
                              </>
                            ) : (
                              <span className="sr-only">No se abre este año</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Contenedor>
        </Seccion>
      ) : null}

      {hayOferta ? (
        <Seccion aire="lg" filete="arriba">
          <Contenedor ancho="amplio" className="flex flex-col gap-10">
            <div className="flex flex-col gap-3">
              <TituloDeSeccion>
                {jornadas.length > 1 ? 'Elegir la jornada' : 'La jornada'}
              </TituloDeSeccion>
              {jornadas.length > 1 ? (
                <p className="prosa max-w-medida leading-relaxed text-piedra">
                  Es la decisión que cambia de un estudiante a otro. El ciclo y el plan de estudios
                  no cambian con la jornada.
                </p>
              ) : null}
            </div>

            <ul className="flex flex-col border-t border-tinta">
              {jornadas.map((j) => {
                const abiertos = cuentaCiclosPorJornada(oferta, j.id)
                return (
                  <li
                    key={j.id}
                    className="grid gap-x-10 gap-y-4 border-b border-niebla py-7 md:grid-cols-12"
                  >
                    <h3 className="font-display text-titulo font-medium text-tinta md:col-span-5">
                      {j.nombre}
                    </h3>
                    <dl className="flex flex-col gap-4 md:col-span-7 md:pt-1.5">
                      <div className="flex flex-col gap-1">
                        <dt className="versalitas text-menudo text-piedra">Horario</dt>
                        {j.detalle ? (
                          <dd className="prosa max-w-medida leading-relaxed text-tinta">
                            {j.detalle}
                          </dd>
                        ) : (
                          <dd className="prosa max-w-medida leading-relaxed text-piedra">
                            Se confirma con la institución.
                          </dd>
                        )}
                      </div>
                      {!completa ? (
                        <div className="flex flex-col gap-1">
                          <dt className="versalitas text-menudo text-piedra">Ciclos abiertos</dt>
                          <dd className="font-mono font-tnum text-nota text-tinta">
                            {abiertos} de {peldanos.length}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  </li>
                )
              })}
            </ul>

            <div className="flex flex-wrap items-center gap-6 pt-2">
              <EnlaceBoton href="/admisiones" tono="primario" talla="lg">
                Iniciar el proceso de admisión
              </EnlaceBoton>
              <p className="prosa max-w-medida text-nota leading-relaxed text-piedra">
                {jornadas.length > 1
                  ? 'La jornada se escoge en el formulario y se confirma con la institución.'
                  : 'El cupo se confirma con la institución.'}
              </p>
            </div>
          </Contenedor>
        </Seccion>
      ) : null}
    </>
  )
}

import { metadatosDePagina, resumir } from '@/src/seo/metadatos'
import { obtenerOferta, claveOferta, cuentaCiclosPorJornada } from '@/src/datos/oferta-publica'
import { Contenedor } from '@/src/ui/contenedor'
import { Seccion, TituloDeSeccion, EncabezadoDePagina } from '@/src/ui/seccion'
import { Migas } from '@/src/ui/migas'
import { CalendarDays, Sun } from 'lucide-react'
import { EnlaceBoton } from '@/src/ui/boton'
import { TarjetaMagica } from '@/src/ui/tarjeta-magica'
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
            <div className="flex flex-col gap-3">
              <TituloDeSeccion>
                Los {cardinal(peldanos.length)} ciclos, en jornada {nombresJornadas}
              </TituloDeSeccion>
              <p className="prosa max-w-medida text-cuerpo leading-relaxed text-texto-secundario">
                El ciclo de ingreso depende de los estudios ya aprobados, no de la jornada.
              </p>
            </div>
            <ul className="aparece-escalonado grid grid-cols-2 gap-3 md:grid-cols-3">
              {peldanos.map((c, indice) => (
                <li key={c.id} style={{ ['--indice' as string]: indice }}>
                  <TarjetaMagica className="h-full">
                    <span className="font-mono text-titulo leading-none font-medium text-texto font-tnum">
                      {c.codigo}
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className="sr-only">equivale a</span>
                      <span className="font-titulo text-rubro text-texto">
                        {c.gradoEquivalente}
                      </span>
                      <span className="text-menudo text-texto-secundario">
                        {indice + 1} de {peldanos.length}
                      </span>
                    </span>
                  </TarjetaMagica>
                </li>
              ))}
            </ul>
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
              <p className="prosa max-w-medida text-nota leading-relaxed text-texto-secundario">
                No todos los ciclos se abren en todas las jornadas. Cada marca indica un ciclo
                abierto este año.
              </p>
            </div>
            <div
              role="region"
              aria-label="Cuadro de oferta por ciclo y jornada"
              tabIndex={0}
              className="relative w-full min-w-0 overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco"
            >
              <table className="w-full min-w-[34rem] border-collapse text-nota">
                <caption className="sr-only">
                  Ciclos cruzados con jornadas{anio ? ` para el año ${anio}` : ''}.
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="w-1/3 border-b border-texto pb-3 text-left">
                      <span className="text-menudo font-semibold text-texto-secundario">Ciclo</span>
                    </th>
                    {jornadas.map((j) => (
                      <th
                        key={j.id}
                        scope="col"
                        className="border-b border-texto px-4 pb-3 text-left align-bottom"
                      >
                        <span className="font-titulo text-rubro font-medium text-texto">
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
                        className="border-b border-borde py-4 text-left align-middle"
                        style={{ ['--nivel' as string]: indice }}
                      >
                        <span
                          className="flex items-baseline gap-4"
                          style={{
                            paddingInlineStart: 'calc(var(--nivel) * clamp(0.5rem, 1.4vw, 1.5rem))',
                          }}
                        >
                          <span aria-hidden="true" className="h-px w-5 shrink-0 bg-texto" />
                          <span className="font-mono text-rubro font-medium text-texto font-tnum">
                            {c.codigo}
                          </span>
                          <span className="text-menudo text-texto-secundario">
                            {c.gradoEquivalente}
                          </span>
                        </span>
                      </th>
                      {jornadas.map((j) => {
                        const abierto = combinaciones.has(claveOferta(c.id, j.id))
                        return (
                          <td key={j.id} className="border-b border-borde px-4 py-4 align-middle">
                            {abierto ? (
                              <>
                                <span
                                  aria-hidden="true"
                                  className="block size-2.5 rounded-full bg-texto"
                                />
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
                <p className="prosa max-w-medida leading-relaxed text-texto-secundario">
                  Es la decisión que cambia de un estudiante a otro. El ciclo y el plan de estudios
                  no cambian con la jornada.
                </p>
              ) : null}
            </div>

            <ul className="grid gap-3 md:grid-cols-2">
              {jornadas.map((j) => {
                const abiertos = cuentaCiclosPorJornada(oferta, j.id)
                return (
                  <li key={j.id}>
                    <TarjetaMagica className="h-full">
                      <span
                        aria-hidden="true"
                        className="inline-flex size-10 items-center justify-center rounded-control border border-borde text-texto-secundario"
                      >
                        {j.codigo === 'S' ? (
                          <CalendarDays className="size-5" strokeWidth={1.75} />
                        ) : (
                          <Sun className="size-5" strokeWidth={1.75} />
                        )}
                      </span>
                      <h3 className="font-titulo text-titulo font-medium text-texto">{j.nombre}</h3>
                      <dl className="mt-auto grid gap-4 border-t border-borde pt-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-1">
                          <dt className="text-menudo text-texto-secundario">Horario</dt>
                          <dd
                            className={
                              j.detalle ? 'text-nota text-texto' : 'text-nota text-texto-secundario'
                            }
                          >
                            {j.detalle ?? 'Se confirma con la institución.'}
                          </dd>
                        </div>
                        <div className="flex flex-col gap-1">
                          <dt className="text-menudo text-texto-secundario">Ciclos abiertos</dt>
                          <dd className="text-nota text-texto">
                            <span className="font-mono font-tnum">{abiertos}</span> de{' '}
                            <span className="font-mono font-tnum">{peldanos.length}</span>
                            {anio ? ` en ${anio}` : ''}
                          </dd>
                        </div>
                      </dl>
                    </TarjetaMagica>
                  </li>
                )
              })}
            </ul>

            <div className="flex flex-wrap items-center gap-6 pt-2">
              <EnlaceBoton href="/admisiones" tono="primario" talla="lg">
                Iniciar el proceso de admisión
              </EnlaceBoton>
              <p className="prosa max-w-medida text-nota leading-relaxed text-texto-secundario">
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

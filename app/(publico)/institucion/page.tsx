import { metadatosDePagina, resumir } from '@/src/seo/metadatos'
import { obtenerConfiguracion, nombreLegal, ubicacion } from '@/src/datos/configuracion-publica'
import { Contenedor } from '@/src/ui/contenedor'
import { Seccion, TituloDeSeccion, EncabezadoDePagina } from '@/src/ui/seccion'
import { Migas } from '@/src/ui/migas'
import { EscudoDeVirtudes } from '@/src/ui/marca'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const config = await obtenerConfiguracion()
  const lugar = ubicacion(config) ?? 'Funza, Cundinamarca'
  return metadatosDePagina({
    titulo: 'Institución',
    descripcion: resumir(
      `${nombreLegal(config)}: un colegio de inspiración estoica en ${lugar}. Su escudo, las cuatro virtudes y lo que las inspira.`
    ),
    ruta: '/institucion',
  })
}

const VIRTUDES = ['Justicia', 'Sabiduría', 'Templanza', 'Coraje']

export default async function InstitucionPage() {
  const config = await obtenerConfiguracion()
  const legal = nombreLegal(config)

  const datos = [
    { termino: 'Código DANE', valor: config?.dane },
    { termino: 'Resolución', valor: config?.resolucion },
    { termino: 'NIT', valor: config?.nit },
  ].filter((d) => Boolean(d.valor))

  const direccion = [
    { termino: 'Rectoría', valor: config?.rectorNombre },
    { termino: 'Dirección administrativa', valor: config?.dirAdmNombre },
  ].filter((d) => Boolean(d.valor))

  return (
    <>
      <Seccion aire="md">
        <Contenedor ancho="amplio">
          <EncabezadoDePagina
            migas={
              <Migas
                ruta={[{ etiqueta: 'Inicio', href: '/inicio' }, { etiqueta: 'Institución' }]}
              />
            }
            titulo={legal}
            entrada={
              config?.lema
                ? `Un colegio de inspiración estoica en Funza. Su lema lo resume: «${config.lema.replace(/\.$/, '')}».`
                : 'Un colegio de inspiración estoica en Funza, Cundinamarca.'
            }
          />
        </Contenedor>
      </Seccion>

      <Seccion aire="md" filete="arriba">
        <Contenedor ancho="amplio" className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="mx-auto w-full max-w-sm lg:col-span-5">
            <EscudoDeVirtudes
              lado={480}
              alt="Escudo del Colegio Ágora: la lambda sobre un disco negro, rodeada por una greca, las cuatro virtudes Justicia, Sabiduría, Templanza y Coraje, una corona de laurel y un aro dorado."
            />
          </div>

          <div className="flex flex-col gap-6 lg:col-span-7">
            <TituloDeSeccion>Las cuatro virtudes del escudo</TituloDeSeccion>
            <p className="prosa max-w-medida leading-relaxed text-texto-secundario">
              El escudo lleva inscritas las cuatro virtudes cardinales del estoicismo, la tradición
              filosófica que da nombre y orientación a la institución.
            </p>
            <ul className="grid grid-cols-2 gap-3">
              {VIRTUDES.map((virtud) => (
                <li
                  key={virtud}
                  className="rounded-tarjeta border border-borde px-5 py-6 font-titulo text-titulo font-normal text-texto shadow-sutil"
                >
                  {virtud}
                </li>
              ))}
            </ul>
          </div>
        </Contenedor>
      </Seccion>

      <Seccion aire="md" filete="arriba">
        <Contenedor ancho="amplio" className="grid gap-4 lg:grid-cols-12">
          <div className="flex flex-col gap-4 rounded-tarjeta border border-borde p-6 shadow-sutil sm:p-8 lg:col-span-7">
            <TituloDeSeccion>Misión</TituloDeSeccion>
            <p className="prosa max-w-medida text-guia text-texto">
              Ofrecer educación formal para jóvenes y adultos bajo el modelo de Ciclos Lectivos
              Especiales Integrados, que permita completar la educación básica y media con calidad,
              flexibilidad horaria y acompañamiento cercano a cada estudiante.
            </p>
          </div>
          <div className="flex flex-col gap-4 rounded-tarjeta border border-borde p-6 sm:p-8 lg:col-span-5">
            <TituloDeSeccion>Visión</TituloDeSeccion>
            <p className="prosa max-w-medida text-cuerpo leading-relaxed text-texto-secundario">
              Ser reconocida en Funza y Cundinamarca como una institución de puertas abiertas para
              quienes retoman sus estudios, con procesos académicos y administrativos claros,
              documentados y accesibles.
            </p>
          </div>
        </Contenedor>
      </Seccion>

      {direccion.length > 0 || datos.length > 0 ? (
        <Seccion aire="md" filete="arriba">
          <Contenedor ancho="amplio" className="flex flex-col gap-10">
            {direccion.length > 0 ? (
              <div className="flex flex-col gap-6">
                <TituloDeSeccion>Rectoría y dirección</TituloDeSeccion>
                <dl className="grid gap-3 sm:grid-cols-2">
                  {direccion.map((persona) => (
                    <div
                      key={persona.termino}
                      className="flex flex-col gap-1.5 rounded-tarjeta border border-borde p-6"
                    >
                      <dt className="text-nota text-texto-secundario">{persona.termino}</dt>
                      <dd className="font-titulo text-rubro text-texto">{persona.valor}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}

            {datos.length > 0 ? (
              <div className="flex flex-col gap-6">
                <TituloDeSeccion>Datos institucionales</TituloDeSeccion>
                <dl className="flex max-w-texto flex-col border-t border-borde">
                  {datos.map((dato) => (
                    <div
                      key={dato.termino}
                      className="flex items-baseline justify-between gap-6 border-b border-borde py-3"
                    >
                      <dt className="text-nota text-texto-secundario">{dato.termino}</dt>
                      <dd className="font-mono font-tnum text-nota text-texto">{dato.valor}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </Contenedor>
        </Seccion>
      ) : null}
    </>
  )
}

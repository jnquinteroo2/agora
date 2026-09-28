import { metadatosDePagina, resumir } from '@/src/seo/metadatos'
import Link from 'next/link'
import Image from 'next/image'
import type { Route } from 'next'
import { ArrowRight, CalendarDays, FileText, Hash, MessagesSquare, Sun } from 'lucide-react'
import { obtenerConfiguracion, nombreLegal, ubicacion } from '@/src/datos/configuracion-publica'
import { obtenerOferta, cuentaCiclosPorJornada } from '@/src/datos/oferta-publica'
import { obtenerEntradas } from '@/src/datos/cms-publico'
import { Contenedor } from '@/src/ui/contenedor'
import { Seccion, TituloDeSeccion, EntradaDeSeccion } from '@/src/ui/seccion'
import { EnlaceBoton, EnlaceSubrayado } from '@/src/ui/boton'
import { EscaleraPortada, ordenarCiclos } from '@/src/ui/escalera-clei'
import { fechaLarga, fechaMaquina } from '@/src/ui/fecha'
import { cardinal, conMayuscula, listaConjuntiva } from '@/src/ui/numero'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const [config, oferta] = await Promise.all([obtenerConfiguracion(), obtenerOferta()])
  const lugar = ubicacion(config)
  const nombres = listaConjuntiva(oferta.jornadas.map((j) => j.nombre.toLowerCase()))
  return metadatosDePagina({
    titulo: nombreLegal(config),
    tituloAbsoluto: true,
    descripcion: resumir(
      `Educación formal para jóvenes y adultos por Ciclos Lectivos Especiales Integrados${lugar ? ` en ${lugar}` : ''}${oferta.jornadas.length > 0 ? `, en jornada ${nombres}` : ''}.`
    ),
    ruta: '/inicio',
  })
}

const PASOS_DE_INGRESO = [
  {
    icono: FileText,
    titulo: 'Diligencie el formulario de inscripción',
    texto: 'Con los datos del aspirante, el ciclo al que aspira y la jornada que prefiere.',
  },
  {
    icono: Hash,
    titulo: 'Reciba su número de radicado',
    texto: 'Con ese número la institución identifica la solicitud.',
  },
  {
    icono: MessagesSquare,
    titulo: 'La institución se comunica con usted',
    texto: 'Confirma el ciclo con los certificados de estudios y continúa el proceso de admisión.',
  },
]

export default async function InicioPage() {
  const [config, oferta, noticias] = await Promise.all([
    obtenerConfiguracion(),
    obtenerOferta(),
    obtenerEntradas('noticia', 3),
  ])

  const legal = nombreLegal(config)
  const peldanos = ordenarCiclos(oferta.ciclos)
  const jornadas = oferta.jornadas
  const nombresJornadas = listaConjuntiva(jornadas.map((j) => j.nombre.toLowerCase()))
  const primero = peldanos[0]
  const ultimo = peldanos[peldanos.length - 1]
  const destacada = noticias[0]
  const restantes = noticias.slice(1)

  return (
    <>
      <Seccion aire="ninguno" className="border-b border-borde">
        <Contenedor
          ancho="amplio"
          className="grid gap-12 pt-14 pb-16 sm:pt-20 lg:grid-cols-12 lg:items-end lg:gap-16 lg:pt-24 lg:pb-24"
        >
          <div className="flex flex-col gap-7 lg:col-span-7">
            <h1 className="equilibrado font-interfaz text-nota font-semibold tracking-[0.02em] text-texto-secundario">
              {legal}
            </h1>
            {config?.lema ? (
              <p className="equilibrado max-w-[16ch] font-titulo text-lema font-normal text-texto italic">
                {config.lema}
              </p>
            ) : null}
            <p className="prosa max-w-[46ch] text-guia text-texto-secundario">
              Educación formal para jóvenes y adultos por Ciclos Lectivos Especiales Integrados
              {jornadas.length > 0 ? `, en jornada ${nombresJornadas}` : ''}.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <EnlaceBoton href="/admisiones" tono="primario" talla="lg">
                Inscribirse
                <ArrowRight aria-hidden="true" strokeWidth={1.75} />
              </EnlaceBoton>
              <EnlaceBoton href="/modelo-clei" tono="secundario" talla="lg">
                Conocer el modelo CLEI
              </EnlaceBoton>
            </div>
          </div>

          {peldanos.length > 0 ? (
            <figure className="flex flex-col gap-4 lg:col-span-5">
              <EscaleraPortada ciclos={peldanos} />
              {primero && ultimo && peldanos.length > 1 ? (
                <figcaption className="text-nota text-texto-secundario">
                  {conMayuscula(cardinal(peldanos.length))} ciclos, de{' '}
                  {primero.gradoEquivalente.toLowerCase()} a {ultimo.gradoEquivalente.toLowerCase()}
                  . Cada ciclo equivale a un grado de la educación regular.
                </figcaption>
              ) : null}
            </figure>
          ) : null}
        </Contenedor>
      </Seccion>

      {jornadas.length > 0 ? (
        <Seccion aire="md" className="border-b border-borde">
          <Contenedor ancho="amplio" className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="flex flex-col gap-4 lg:col-span-5">
              <TituloDeSeccion>
                {jornadas.length === 1
                  ? `Jornada ${jornadas[0]?.nombre.toLowerCase()}`
                  : `${conMayuscula(cardinal(jornadas.length))} jornadas para estudiar`}
              </TituloDeSeccion>
              <EntradaDeSeccion>
                {oferta.completa && peldanos.length > 0
                  ? `Los ${cardinal(peldanos.length)} ciclos se dictan en ${jornadas.length === 1 ? 'la jornada' : jornadas.length === 2 ? 'ambas jornadas' : 'todas las jornadas'}. El ciclo depende de los estudios ya aprobados; la jornada se elige.`
                  : 'El ciclo depende de los estudios ya aprobados; la jornada se elige al inscribirse.'}
              </EntradaDeSeccion>
              <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
                <EnlaceSubrayado href="/oferta" className="text-nota">
                  {jornadas.length > 1 ? 'Comparar las jornadas' : 'Ver la oferta educativa'}
                </EnlaceSubrayado>
                <EnlaceSubrayado href="/modelo-clei" className="text-nota">
                  Ver el modelo completo
                </EnlaceSubrayado>
              </div>
            </div>

            <ul className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
              {jornadas.map((jornada) => {
                const ciclosEnJornada = cuentaCiclosPorJornada(oferta, jornada.id)
                return (
                  <li
                    key={jornada.id}
                    className="flex flex-col gap-5 rounded-tarjeta border border-borde p-6 shadow-sutil"
                  >
                    <span
                      aria-hidden="true"
                      className="inline-flex size-10 items-center justify-center rounded-control border border-borde text-texto-secundario"
                    >
                      {jornada.codigo === 'S' ? (
                        <CalendarDays className="size-5" strokeWidth={1.75} />
                      ) : (
                        <Sun className="size-5" strokeWidth={1.75} />
                      )}
                    </span>
                    <div className="flex flex-col gap-1.5">
                      <h3 className="font-titulo text-rubro font-medium text-texto">
                        {jornada.nombre}
                      </h3>
                      <p className="text-nota text-texto-secundario">
                        {jornada.detalle ?? 'El horario se confirma con la institución.'}
                      </p>
                    </div>
                    {ciclosEnJornada > 0 ? (
                      <p className="mt-auto border-t border-borde pt-4 text-nota text-texto">
                        <span className="font-mono font-tnum">{ciclosEnJornada}</span>{' '}
                        {ciclosEnJornada === 1 ? 'ciclo abierto' : 'ciclos abiertos'}
                        {oferta.anio ? ` en ${oferta.anio}` : ''}
                      </p>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </Contenedor>
        </Seccion>
      ) : null}

      <Seccion aire="md" className="border-b border-borde">
        <Contenedor ancho="amplio" className="flex flex-col gap-10">
          <div className="flex flex-col gap-4">
            <TituloDeSeccion>Cómo se ingresa</TituloDeSeccion>
            <EntradaDeSeccion>
              El proceso empieza en línea y continúa con la institución.
            </EntradaDeSeccion>
          </div>
          <ol className="grid gap-px overflow-hidden rounded-tarjeta border border-borde bg-borde md:grid-cols-3">
            {PASOS_DE_INGRESO.map((paso) => {
              const Icono = paso.icono
              return (
                <li key={paso.titulo} className="flex flex-col gap-4 bg-superficie p-6 sm:p-7">
                  <Icono aria-hidden="true" className="size-6 text-texto" strokeWidth={1.5} />
                  <div className="flex flex-col gap-2">
                    <h3 className="font-titulo text-rubro font-medium text-texto">{paso.titulo}</h3>
                    <p className="prosa text-nota text-texto-secundario">{paso.texto}</p>
                  </div>
                </li>
              )
            })}
          </ol>
          <EnlaceSubrayado href="/admisiones" className="w-fit text-nota">
            Ir al formulario de inscripción
          </EnlaceSubrayado>
        </Contenedor>
      </Seccion>

      {destacada ? (
        <Seccion aire="md">
          <Contenedor ancho="amplio" className="flex flex-col gap-8">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <TituloDeSeccion>Noticias</TituloDeSeccion>
              <EnlaceSubrayado href="/blog" className="text-nota">
                Ver todas las noticias
              </EnlaceSubrayado>
            </div>

            <div className="grid gap-4 lg:grid-cols-12">
              <Link
                href={`/blog/${destacada.slug}` as Route}
                className={`group presionable flex flex-col overflow-hidden rounded-tarjeta border border-borde shadow-sutil ${restantes.length > 0 ? 'lg:col-span-8' : 'lg:col-span-12'}`}
              >
                {destacada.metaImgId ? (
                  <div className="relative aspect-[16/9] overflow-hidden border-b border-borde">
                    <Image
                      src={`/api/galeria/imagen/${destacada.metaImgId}`}
                      alt=""
                      fill
                      sizes="(max-width: 1024px) 100vw, 60vw"
                      className="object-cover"
                    />
                  </div>
                ) : null}
                <div className="flex flex-1 flex-col gap-3 p-6 sm:p-7">
                  <time
                    dateTime={fechaMaquina(destacada.creadoEn)}
                    className="text-menudo text-texto-secundario"
                  >
                    {fechaLarga(destacada.creadoEn)}
                  </time>
                  <h3 className="equilibrado font-titulo text-titulo font-medium text-texto decoration-acento-texto decoration-2 underline-offset-[6px] group-hover:underline">
                    {destacada.titulo}
                  </h3>
                  {destacada.subtitulo ? (
                    <p className="prosa max-w-medida text-cuerpo text-texto-secundario">
                      {destacada.subtitulo}
                    </p>
                  ) : null}
                </div>
              </Link>

              {restantes.length > 0 ? (
                <ul className="flex flex-col gap-4 lg:col-span-4">
                  {restantes.map((n) => (
                    <li key={n.id} className="flex-1">
                      <Link
                        href={`/blog/${n.slug}` as Route}
                        className="group presionable flex h-full flex-col gap-2 rounded-tarjeta border border-borde p-6 shadow-sutil"
                      >
                        <time
                          dateTime={fechaMaquina(n.creadoEn)}
                          className="text-menudo text-texto-secundario"
                        >
                          {fechaLarga(n.creadoEn)}
                        </time>
                        <h3 className="font-titulo text-rubro font-medium text-texto decoration-acento-texto decoration-2 underline-offset-4 group-hover:underline">
                          {n.titulo}
                        </h3>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </Contenedor>
        </Seccion>
      ) : null}
    </>
  )
}

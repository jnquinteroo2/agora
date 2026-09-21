import { metadatosDePagina, resumir } from '@/src/seo/metadatos'
import Link from 'next/link'
import Image from 'next/image'
import type { Route } from 'next'
import { obtenerConfiguracion, nombreLegal, ubicacion } from '@/src/datos/configuracion-publica'
import { obtenerCiclos, obtenerJornadasConOferta } from '@/src/datos/oferta-publica'
import { obtenerEntradas } from '@/src/datos/cms-publico'
import { Contenedor } from '@/src/ui/contenedor'
import { Seccion, TituloDeSeccion } from '@/src/ui/seccion'
import { EnlaceBoton } from '@/src/ui/boton'
import { EscaleraCleiCompacta, ordenarCiclos } from '@/src/ui/escalera-clei'
import { fechaLarga, fechaMaquina } from '@/src/ui/fecha'
import { cardinal, conMayuscula, listaConjuntiva } from '@/src/ui/numero'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const [config, jornadas] = await Promise.all([obtenerConfiguracion(), obtenerJornadasConOferta()])
  const lugar = ubicacion(config)
  const nombres = listaConjuntiva(jornadas.map((j) => j.nombre.toLowerCase()))
  return metadatosDePagina({
    titulo: nombreLegal(config),
    tituloAbsoluto: true,
    descripcion: resumir(
      `Educación formal para jóvenes y adultos por Ciclos Lectivos Especiales Integrados${lugar ? ` en ${lugar}` : ''}${jornadas.length > 0 ? `, en jornada ${nombres}` : ''}.`
    ),
    ruta: '/inicio',
  })
}

export default async function InicioPage() {
  const [config, ciclos, jornadas, noticias] = await Promise.all([
    obtenerConfiguracion(),
    obtenerCiclos(),
    obtenerJornadasConOferta(),
    obtenerEntradas('noticia', 3),
  ])

  const legal = nombreLegal(config)
  const nombresJornadas = listaConjuntiva(jornadas.map((j) => j.nombre.toLowerCase()))
  const peldanos = ordenarCiclos(ciclos)
  const primero = peldanos[0]
  const ultimo = peldanos[peldanos.length - 1]
  const tituloCiclos =
    primero && ultimo && peldanos.length > 1
      ? `${conMayuscula(cardinal(peldanos.length))} ciclos, de ${primero.gradoEquivalente.toLowerCase()} a ${ultimo.gradoEquivalente.toLowerCase()}`
      : 'Los ciclos'
  const destacada = noticias[0]
  const restantes = noticias.slice(1)

  return (
    <>
      <Seccion aire="lg" className="border-b border-niebla">
        <Contenedor ancho="amplio" className="flex flex-col gap-7">
          <h1 className="equilibrado font-display text-portada font-medium text-tinta">{legal}</h1>
          {config?.lema ? (
            <p className="equilibrado max-w-[18ch] font-display text-lema leading-[1.08] font-light text-tinta italic">
              {config.lema}
            </p>
          ) : null}
          <p className="prosa max-w-medida text-guia leading-relaxed text-piedra">
            Educación formal para jóvenes y adultos por Ciclos Lectivos Especiales Integrados
            {jornadas.length > 0 ? `, en jornada ${nombresJornadas}` : ''}.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <EnlaceBoton href="/admisiones" tono="primario" talla="lg">
              Inscribirse
            </EnlaceBoton>
            <EnlaceBoton href="/modelo-clei" tono="secundario" talla="lg">
              Conocer el modelo CLEI
            </EnlaceBoton>
          </div>
        </Contenedor>
      </Seccion>

      {ciclos.length > 0 ? (
        <Seccion aire="md" className="border-b border-niebla">
          <Contenedor ancho="amplio" className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <TituloDeSeccion>{tituloCiclos}</TituloDeSeccion>
              <p className="prosa max-w-medida text-nota leading-relaxed text-piedra">
                Cada ciclo equivale a un grado de la educación regular. Se avanza de un ciclo al
                siguiente hasta completar la educación media.
              </p>
            </div>
            <EscaleraCleiCompacta ciclos={peldanos} />
            <div className="flex flex-wrap gap-x-8 gap-y-2">
              <Link
                href="/modelo-clei"
                className="transicion-ui w-fit text-nota text-tinta underline decoration-niebla underline-offset-4 hover:decoration-carmin"
              >
                Ver el modelo completo
              </Link>
              <Link
                href="/oferta"
                className="transicion-ui w-fit text-nota text-tinta underline decoration-niebla underline-offset-4 hover:decoration-carmin"
              >
                {jornadas.length > 1 ? 'Comparar las jornadas' : 'Ver la oferta educativa'}
              </Link>
            </div>
          </Contenedor>
        </Seccion>
      ) : null}

      {destacada ? (
        <Seccion aire="md">
          <Contenedor ancho="amplio" className="flex flex-col gap-8">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <TituloDeSeccion>Noticias</TituloDeSeccion>
              <Link
                href="/blog"
                className="transicion-ui text-nota text-piedra underline decoration-niebla underline-offset-4 hover:text-tinta"
              >
                Ver todas
              </Link>
            </div>

            <div className="flex flex-col gap-10">
              <Link
                href={`/blog/${destacada.slug}` as Route}
                className="group grid gap-6 border-t border-tinta pt-6 md:grid-cols-12 md:gap-10"
              >
                {destacada.metaImgId ? (
                  <div className="relative aspect-[3/2] overflow-hidden bg-niebla md:col-span-5">
                    <Image
                      src={`/api/galeria/imagen/${destacada.metaImgId}`}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 100vw, 40vw"
                      className="object-cover"
                    />
                  </div>
                ) : null}
                <div
                  className={
                    destacada.metaImgId
                      ? 'flex flex-col gap-3 md:col-span-7'
                      : 'flex flex-col gap-3 md:col-span-9'
                  }
                >
                  <time
                    dateTime={fechaMaquina(destacada.creadoEn)}
                    className="versalitas text-menudo text-piedra"
                  >
                    {fechaLarga(destacada.creadoEn)}
                  </time>
                  <h3 className="equilibrado font-display text-titulo font-medium text-tinta group-hover:underline group-hover:decoration-carmin group-hover:underline-offset-4">
                    {destacada.titulo}
                  </h3>
                  {destacada.subtitulo ? (
                    <p className="prosa max-w-medida leading-relaxed text-piedra">
                      {destacada.subtitulo}
                    </p>
                  ) : null}
                </div>
              </Link>

              {restantes.length > 0 ? (
                <ul className="grid gap-px bg-niebla sm:grid-cols-2">
                  {restantes.map((n) => (
                    <li key={n.id} className="bg-hueso pt-5 pr-6 pb-6">
                      <Link href={`/blog/${n.slug}` as Route} className="group flex flex-col gap-2">
                        <time
                          dateTime={fechaMaquina(n.creadoEn)}
                          className="versalitas text-menudo text-piedra"
                        >
                          {fechaLarga(n.creadoEn)}
                        </time>
                        <h3 className="font-display text-rubro text-tinta group-hover:underline group-hover:underline-offset-4">
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

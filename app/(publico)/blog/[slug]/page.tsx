import Link from 'next/link'
import Image from 'next/image'
import type { Route } from 'next'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { obtenerEntrada, obtenerVecinas } from '@/src/datos/cms-publico'
import { Contenedor } from '@/src/ui/contenedor'
import { Seccion } from '@/src/ui/seccion'
import { Migas } from '@/src/ui/migas'
import { fechaLarga, fechaMaquina } from '@/src/ui/fecha'
import { metadatosDePagina, resumir, NOMBRE_DEL_SITIO } from '@/src/seo/metadatos'
import { JsonLd } from '@/src/seo/json-ld-script'
import { obtenerConfiguracion, nombreLegal } from '@/src/datos/configuracion-publica'
import { urlAbsoluta } from '@/src/sitio'

export const dynamic = 'force-dynamic'

type Parametros = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Parametros): Promise<Metadata> {
  const { slug } = await params
  const entrada = await obtenerEntrada('noticia', slug)
  if (!entrada) return { title: 'Noticia no encontrada', robots: { index: false, follow: false } }
  return metadatosDePagina({
    titulo: entrada.titulo,
    descripcion: resumir(entrada.metaDesc ?? entrada.subtitulo ?? entrada.cuerpo ?? entrada.titulo),
    ruta: `/blog/${entrada.slug}`,
    tipo: 'article',
    imagenDelSitio: false,
  })
}

function parrafos(cuerpo: string): string[] {
  return cuerpo
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
}

export default async function EntradaBlogPage({ params }: Parametros) {
  const { slug } = await params
  const entrada = await obtenerEntrada('noticia', slug)
  if (!entrada) notFound()

  const [{ anterior, siguiente }, config] = await Promise.all([
    obtenerVecinas('noticia', entrada.id),
    obtenerConfiguracion(),
  ])
  const organizacion = {
    '@type': 'EducationalOrganization',
    name: nombreLegal(config),
    url: urlAbsoluta('/inicio'),
  }
  const articulo = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: entrada.titulo,
    ...(entrada.subtitulo ? { description: entrada.subtitulo } : {}),
    datePublished: (entrada.publicarEn ?? entrada.creadoEn).toISOString(),
    dateModified: entrada.actualizadoEn.toISOString(),
    inLanguage: 'es-CO',
    mainEntityOfPage: urlAbsoluta(`/blog/${entrada.slug}`),
    ...(entrada.metaImgId
      ? { image: urlAbsoluta(`/api/galeria/imagen/${entrada.metaImgId}`) }
      : {}),
    author: organizacion,
    publisher: { ...organizacion, logo: urlAbsoluta('/marca/logo-agora.png') },
    isPartOf: { '@type': 'WebSite', name: NOMBRE_DEL_SITIO, url: urlAbsoluta('/inicio') },
  }

  return (
    <>
      <JsonLd datos={articulo} />
      <Seccion aire="md">
        <Contenedor ancho="texto" como="article" className="flex flex-col gap-10">
          <header className="flex flex-col gap-5">
            <Migas
              ruta={[
                { etiqueta: 'Inicio', href: '/inicio' },
                { etiqueta: 'Noticias', href: '/blog' },
                { etiqueta: entrada.titulo },
              ]}
            />
            <time
              dateTime={fechaMaquina(entrada.creadoEn)}
              className="versalitas text-menudo text-piedra"
            >
              {fechaLarga(entrada.creadoEn)}
            </time>
            <h1 className="equilibrado font-display text-portada font-medium text-tinta">
              {entrada.titulo}
            </h1>
            {entrada.subtitulo ? (
              <p className="prosa font-display text-guia leading-snug text-piedra italic">
                {entrada.subtitulo}
              </p>
            ) : null}
          </header>

          {entrada.metaImgId ? (
            <div className="relative aspect-[3/2] overflow-hidden bg-niebla">
              <Image
                src={`/api/galeria/imagen/${entrada.metaImgId}`}
                alt=""
                fill
                priority
                sizes="(max-width: 768px) 100vw, 44rem"
                className="object-cover"
              />
            </div>
          ) : null}

          {entrada.cuerpo ? (
            <div className="flex max-w-[62ch] flex-col gap-[1.1em] border-t border-niebla pt-8 font-display text-[1.25rem] leading-[1.65] text-tinta">
              {parrafos(entrada.cuerpo).map((texto, indice) => (
                <p key={indice} className="prosa whitespace-pre-line">
                  {texto}
                </p>
              ))}
            </div>
          ) : null}
        </Contenedor>
      </Seccion>

      <Seccion aire="sm" filete="arriba">
        <Contenedor
          ancho="texto"
          como="nav"
          aria-label="Otras noticias"
          className="flex flex-col gap-6"
        >
          {anterior || siguiente ? (
            <ul className="grid gap-x-10 sm:grid-cols-2">
              {anterior ? (
                <li className="border-t border-niebla">
                  <Link
                    href={`/blog/${anterior.slug}` as Route}
                    rel="prev"
                    className="group flex flex-col gap-1 py-4 pr-6"
                  >
                    <span className="versalitas text-menudo text-piedra">Anterior</span>
                    <span className="font-display text-rubro text-tinta decoration-carmin underline-offset-4 group-hover:underline">
                      {anterior.titulo}
                    </span>
                  </Link>
                </li>
              ) : null}
              {siguiente ? (
                <li className="border-t border-niebla sm:col-start-2 sm:text-right">
                  <Link
                    href={`/blog/${siguiente.slug}` as Route}
                    rel="next"
                    className="group flex flex-col gap-1 py-4 sm:pl-6"
                  >
                    <span className="versalitas text-menudo text-piedra">Siguiente</span>
                    <span className="font-display text-rubro text-tinta decoration-carmin underline-offset-4 group-hover:underline">
                      {siguiente.titulo}
                    </span>
                  </Link>
                </li>
              ) : null}
            </ul>
          ) : null}
          <Link
            href="/blog"
            className="transicion-ui w-fit text-nota text-tinta underline decoration-piedra underline-offset-4 hover:decoration-carmin"
          >
            Todas las noticias
          </Link>
        </Contenedor>
      </Seccion>
    </>
  )
}

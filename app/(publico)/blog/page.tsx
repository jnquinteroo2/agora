import { metadatosDePagina } from '@/src/seo/metadatos'
import Link from 'next/link'
import Image from 'next/image'
import type { Route } from 'next'
import { obtenerEntradas } from '@/src/datos/cms-publico'
import { Contenedor } from '@/src/ui/contenedor'
import { Seccion, EncabezadoDePagina } from '@/src/ui/seccion'
import { Migas } from '@/src/ui/migas'
import { EstadoVacio } from '@/src/ui/estado-vacio'
import { fechaLarga, fechaMaquina } from '@/src/ui/fecha'

export const dynamic = 'force-dynamic'

export const metadata = metadatosDePagina({
  titulo: 'Noticias',
  descripcion: 'Novedades de la institución: calendario, procesos de admisión y vida escolar.',
  ruta: '/blog',
})

export default async function BlogPage() {
  const entradas = await obtenerEntradas('noticia')

  return (
    <>
      <Seccion aire="md">
        <Contenedor ancho="amplio">
          <EncabezadoDePagina
            migas={
              <Migas ruta={[{ etiqueta: 'Inicio', href: '/inicio' }, { etiqueta: 'Noticias' }]} />
            }
            titulo="Noticias"
            entrada="Novedades de la institución: calendario, procesos de admisión y vida escolar."
          />
        </Contenedor>
      </Seccion>

      <Seccion aire="md" filete="arriba">
        <Contenedor ancho="amplio">
          {entradas.length > 0 ? (
            <ol className="flex flex-col">
              {entradas.map((n) => (
                <li
                  key={n.id}
                  className="border-b border-borde first:border-t first:border-t-texto"
                >
                  <Link
                    href={`/blog/${n.slug}` as Route}
                    className="group grid gap-5 py-8 md:grid-cols-12 md:gap-10"
                  >
                    <time
                      dateTime={fechaMaquina(n.creadoEn)}
                      className="text-nota text-texto-secundario md:col-span-3 md:pt-2"
                    >
                      {fechaLarga(n.creadoEn)}
                    </time>
                    <div
                      className={
                        n.metaImgId
                          ? 'flex flex-col gap-2 md:col-span-5'
                          : 'flex flex-col gap-2 md:col-span-9'
                      }
                    >
                      <h2 className="equilibrado font-titulo text-titulo font-medium text-texto decoration-acento-texto decoration-2 underline-offset-[6px] group-hover:underline">
                        {n.titulo}
                      </h2>
                      {n.subtitulo ? (
                        <p className="prosa max-w-medida leading-relaxed text-texto-secundario">
                          {n.subtitulo}
                        </p>
                      ) : null}
                    </div>
                    {n.metaImgId ? (
                      <div className="relative aspect-[3/2] overflow-hidden rounded-tarjeta border border-borde md:col-span-4">
                        <Image
                          src={`/api/galeria/imagen/${n.metaImgId}`}
                          alt=""
                          fill
                          sizes="(max-width: 768px) 100vw, 30vw"
                          className="object-cover"
                        />
                      </div>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <EstadoVacio titulo="No hay noticias publicadas" />
          )}
        </Contenedor>
      </Seccion>
    </>
  )
}

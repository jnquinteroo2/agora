import { metadatosDePagina } from '@/src/seo/metadatos'
import Link from 'next/link'
import Image from 'next/image'
import type { Route } from 'next'
import { obtenerAlbumes } from '@/src/datos/cms-publico'
import { Contenedor } from '@/src/ui/contenedor'
import { Seccion, EncabezadoDePagina } from '@/src/ui/seccion'
import { Migas } from '@/src/ui/migas'
import { EstadoVacio } from '@/src/ui/estado-vacio'
import { Greca } from '@/src/ui/greca'
import { fechaLarga, fechaMaquina } from '@/src/ui/fecha'

export const dynamic = 'force-dynamic'

export const metadata = metadatosDePagina({
  titulo: 'Galería',
  descripcion: 'Álbumes fotográficos de la vida escolar, publicados por la institución.',
  ruta: '/galeria',
})

export default async function GaleriaPage() {
  const albumes = await obtenerAlbumes()

  return (
    <>
      <Seccion aire="md">
        <Contenedor ancho="amplio">
          <EncabezadoDePagina
            migas={
              <Migas ruta={[{ etiqueta: 'Inicio', href: '/inicio' }, { etiqueta: 'Galería' }]} />
            }
            titulo="Galería"
            entrada="Álbumes fotográficos de la vida escolar, publicados por la institución."
          />
        </Contenedor>
      </Seccion>

      <Seccion aire="md" filete="arriba">
        <Contenedor ancho="amplio">
          {albumes.length > 0 ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {albumes.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/galeria/${a.slug}` as Route}
                    className="group presionable flex h-full flex-col overflow-hidden rounded-tarjeta border border-borde shadow-sutil"
                  >
                    <div className="relative aspect-[3/2] overflow-hidden border-b border-borde">
                      {a.metaImgId ? (
                        <Image
                          src={`/api/galeria/imagen/${a.metaImgId}`}
                          alt=""
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 28rem"
                          className="object-cover transition-transform duration-[var(--duration-slow)] ease-[var(--ease-out)] motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Greca extension="sello" tono="piedra" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5 p-5">
                      <h2 className="font-titulo text-rubro font-medium text-texto decoration-acento-texto decoration-2 underline-offset-4 group-hover:underline">
                        {a.titulo}
                      </h2>
                      {a.subtitulo ? (
                        <p className="prosa text-nota leading-relaxed text-texto-secundario">
                          {a.subtitulo}
                        </p>
                      ) : null}
                      <p className="flex flex-wrap gap-x-3 text-menudo text-texto-secundario">
                        <span className="font-mono font-tnum">
                          {a.fotos === 1 ? '1 fotografía' : `${a.fotos} fotografías`}
                        </span>
                        <span aria-hidden="true">·</span>
                        <time dateTime={fechaMaquina(a.creadoEn)}>{fechaLarga(a.creadoEn)}</time>
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EstadoVacio titulo="No hay álbumes publicados" />
          )}
        </Contenedor>
      </Seccion>
    </>
  )
}

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { obtenerAlbum } from '@/src/datos/cms-publico'
import { Contenedor } from '@/src/ui/contenedor'
import { Seccion, EncabezadoDePagina } from '@/src/ui/seccion'
import { Migas } from '@/src/ui/migas'
import { EstadoVacio } from '@/src/ui/estado-vacio'
import { VisorGaleria } from './visor'
import { esContenidoDePrueba, metadatosDePagina, resumir } from '@/src/seo/metadatos'

export const dynamic = 'force-dynamic'

type Parametros = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Parametros): Promise<Metadata> {
  const { slug } = await params
  const resultado = await obtenerAlbum(slug)
  if (!resultado) return { title: 'Álbum no encontrado', robots: { index: false, follow: false } }
  const { album } = resultado
  return metadatosDePagina({
    titulo: album.titulo,
    descripcion: resumir(
      album.metaDesc ?? album.subtitulo ?? `Álbum fotográfico: ${album.titulo}.`
    ),
    ruta: `/galeria/${album.slug}`,
    indexar: !esContenidoDePrueba(album.slug),
  })
}

export default async function AlbumPage({ params }: Parametros) {
  const { slug } = await params
  const resultado = await obtenerAlbum(slug)
  if (!resultado) notFound()
  const { album, fotos } = resultado

  return (
    <>
      <Seccion aire="md">
        <Contenedor ancho="amplio">
          <EncabezadoDePagina
            migas={
              <Migas
                ruta={[
                  { etiqueta: 'Inicio', href: '/inicio' },
                  { etiqueta: 'Galería', href: '/galeria' },
                  { etiqueta: album.titulo },
                ]}
              />
            }
            titulo={album.titulo}
            entrada={album.subtitulo ?? undefined}
          />
        </Contenedor>
      </Seccion>

      <Seccion aire="md" filete="arriba">
        <Contenedor ancho="amplio">
          {fotos.length > 0 ? (
            <VisorGaleria
              titulo={album.titulo}
              fotos={fotos.map((f) => ({ id: f.id, archivoId: f.archivoId, alt: f.alt }))}
            />
          ) : (
            <EstadoVacio titulo="Este álbum no tiene fotografías" />
          )}
        </Contenedor>
      </Seccion>
    </>
  )
}

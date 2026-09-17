import Image from 'next/image'
import { notFound } from 'next/navigation'
import { and, eq, isNull, lte, or, asc } from 'drizzle-orm'
import { db, conContextoRLS } from '@/src/datos/cliente'
import { cmsEntrada, cmsAlbumFoto } from '@/src/datos/esquema'

export const dynamic = 'force-dynamic'


export default async function AlbumPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const { album, fotos } = await conContextoRLS(db, { usuarioId: '', rol: 'anonimo' }, async (tx) => {
    const [a] = await tx
      .select()
      .from(cmsEntrada)
      .where(
        and(
          eq(cmsEntrada.tipo, 'album'),
          eq(cmsEntrada.slug, slug),
          eq(cmsEntrada.estado, 'publicado'),
          isNull(cmsEntrada.eliminadoEn),
          or(isNull(cmsEntrada.publicarEn), lte(cmsEntrada.publicarEn, new Date()))
        )
      )
      .limit(1)

    if (!a) return { album: null, fotos: [] }

    const fotos = await tx
      .select()
      .from(cmsAlbumFoto)
      .where(eq(cmsAlbumFoto.albumId, a.id))
      .orderBy(asc(cmsAlbumFoto.orden))

    return { album: a, fotos }
  })

  if (!album) notFound()

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="font-mono text-xs uppercase tracking-widest text-piedra">Galería</p>
        <h1 className="font-display text-3xl">{album.titulo}</h1>
        {album.subtitulo && <p className="mt-2 text-piedra">{album.subtitulo}</p>}
      </header>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {fotos.map((f) => (
          <div key={f.id} className="relative aspect-square overflow-hidden rounded-sm bg-niebla">
            <Image src={`/api/galeria/imagen/${f.archivoId}`} alt={f.alt} fill className="object-cover" />
          </div>
        ))}
        {fotos.length === 0 && <p className="text-sm text-piedra">Este álbum todavía no tiene fotos.</p>}
      </div>
    </div>
  )
}

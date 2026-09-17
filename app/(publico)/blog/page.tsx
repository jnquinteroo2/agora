import Link from 'next/link'
import Image from 'next/image'
import { and, desc, eq, isNull, lte, or } from 'drizzle-orm'
import { db, conContextoRLS } from '@/src/datos/cliente'
import { cmsEntrada } from '@/src/datos/esquema'

export const dynamic = 'force-dynamic'


export const metadata = { title: 'Noticias' }

export default async function BlogPage() {
  const entradas = await conContextoRLS(db, { usuarioId: '', rol: 'anonimo' }, async (tx) =>
    tx
      .select()
      .from(cmsEntrada)
      .where(
        and(
          eq(cmsEntrada.tipo, 'noticia'),
          eq(cmsEntrada.estado, 'publicado'),
          isNull(cmsEntrada.eliminadoEn),
          or(isNull(cmsEntrada.publicarEn), lte(cmsEntrada.publicarEn, new Date()))
        )
      )
      .orderBy(desc(cmsEntrada.creadoEn))
  )

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="font-mono text-xs uppercase tracking-widest text-piedra">Noticias</p>
        <h1 className="font-display text-3xl">Últimas publicaciones</h1>
      </header>

      <div className="flex flex-col gap-6">
        {entradas.map((n) => (
          <Link key={n.id} href={`/blog/${n.slug}`} className="flex gap-4 rounded-sm border border-niebla p-4 hover:border-carmin">
            {n.metaImgId && (
              <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-sm bg-niebla">
                <Image src={`/api/galeria/imagen/${n.metaImgId}`} alt="" fill className="object-cover" />
              </div>
            )}
            <div>
              <h2 className="font-display text-lg">{n.titulo}</h2>
              {n.subtitulo && <p className="text-sm text-piedra">{n.subtitulo}</p>}
              <p className="mt-1 text-xs text-piedra">{n.creadoEn.toISOString().slice(0, 10)}</p>
            </div>
          </Link>
        ))}
        {entradas.length === 0 && <p className="text-sm text-piedra">Todavía no hay publicaciones.</p>}
      </div>
    </div>
  )
}

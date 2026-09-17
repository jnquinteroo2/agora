import Image from 'next/image'
import { notFound } from 'next/navigation'
import { and, eq, isNull, lte, or } from 'drizzle-orm'
import { db, conContextoRLS } from '@/src/datos/cliente'
import { cmsEntrada } from '@/src/datos/esquema'

export const dynamic = 'force-dynamic'


export default async function EntradaBlogPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const entrada = await conContextoRLS(db, { usuarioId: '', rol: 'anonimo' }, async (tx) => {
    const [n] = await tx
      .select()
      .from(cmsEntrada)
      .where(
        and(
          eq(cmsEntrada.tipo, 'noticia'),
          eq(cmsEntrada.slug, slug),
          eq(cmsEntrada.estado, 'publicado'),
          isNull(cmsEntrada.eliminadoEn),
          or(isNull(cmsEntrada.publicarEn), lte(cmsEntrada.publicarEn, new Date()))
        )
      )
      .limit(1)
    return n ?? null
  })

  if (!entrada) notFound()

  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-6">
      <header>
        <p className="font-mono text-xs uppercase tracking-widest text-piedra">
          {entrada.creadoEn.toISOString().slice(0, 10)}
        </p>
        <h1 className="font-display text-3xl">{entrada.titulo}</h1>
        {entrada.subtitulo && <p className="mt-2 text-lg italic text-piedra">{entrada.subtitulo}</p>}
      </header>

      {entrada.metaImgId && (
        <div className="relative h-64 w-full overflow-hidden rounded-sm bg-niebla">
          <Image src={`/api/galeria/imagen/${entrada.metaImgId}`} alt="" fill className="object-cover" />
        </div>
      )}

      {entrada.cuerpo && (
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-tinta">{entrada.cuerpo}</div>
      )}
    </article>
  )
}

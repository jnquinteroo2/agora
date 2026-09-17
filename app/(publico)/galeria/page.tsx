import Link from 'next/link'
import Image from 'next/image'
import { and, desc, eq, isNull, lte, or } from 'drizzle-orm'
import { db, conContextoRLS } from '@/src/datos/cliente'
import { cmsEntrada } from '@/src/datos/esquema'

export const dynamic = 'force-dynamic'


export const metadata = { title: 'Galería' }

export default async function GaleriaPage() {
  const albumes = await conContextoRLS(db, { usuarioId: '', rol: 'anonimo' }, async (tx) =>
    tx
      .select()
      .from(cmsEntrada)
      .where(
        and(
          eq(cmsEntrada.tipo, 'album'),
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
        <p className="font-mono text-xs uppercase tracking-widest text-piedra">Galería</p>
        <h1 className="font-display text-3xl">Álbumes fotográficos</h1>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        {albumes.map((a) => (
          <Link key={a.id} href={`/galeria/${a.slug}`} className="flex flex-col gap-2 rounded-sm border border-niebla p-4 hover:border-carmin">
            {a.metaImgId && (
              <div className="relative h-40 w-full overflow-hidden rounded-sm bg-niebla">
                <Image src={`/api/galeria/imagen/${a.metaImgId}`} alt="" fill className="object-cover" />
              </div>
            )}
            <h2 className="font-display text-lg">{a.titulo}</h2>
            {a.subtitulo && <p className="text-sm text-piedra">{a.subtitulo}</p>}
          </Link>
        ))}
        {albumes.length === 0 && <p className="text-sm text-piedra">Todavía no hay álbumes publicados.</p>}
      </div>
    </div>
  )
}

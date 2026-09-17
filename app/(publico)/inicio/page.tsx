import Link from 'next/link'
import Image from 'next/image'
import { and, desc, eq, isNull, lte, or } from 'drizzle-orm'
import { db, conContextoRLS } from '@/src/datos/cliente'
import { configuracionInstitucional, cmsEntrada } from '@/src/datos/esquema'

export const dynamic = 'force-dynamic'


export const metadata = { title: 'Inicio' }

export default async function InicioPage() {
  const [config] = await db.select().from(configuracionInstitucional).limit(1)

  const noticias = await conContextoRLS(db, { usuarioId: '', rol: 'anonimo' }, async (tx) =>
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
      .limit(3)
  )

  const nombreColegio = config?.nombreLegal ?? 'Institución Educativa Ágora'

  return (
    <div className="flex flex-col gap-16">
      <section className="flex flex-col items-center gap-6 py-12 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-piedra">
          {config?.resolucion ? `Resolución ${config.resolucion}` : 'Educación para jóvenes y adultos'}
        </p>
        <h1 className="font-display text-4xl font-light md:text-5xl">Λ</h1>
        <h2 className="font-display text-2xl">{nombreColegio}</h2>
        {config?.lema && <p className="max-w-xl font-display text-lg italic text-piedra">{config.lema}</p>}
        <div className="mt-4 flex gap-4">
          <Link href="/admisiones" className="rounded-sm bg-carmin px-5 py-2 text-hueso hover:bg-carmin-hondo">
            Inscribirse
          </Link>
          <Link href="/modelo-clei" className="rounded-sm border border-tinta px-5 py-2 hover:bg-niebla">
            Conocer el modelo CLEI
          </Link>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {[
          { titulo: 'Jornadas flexibles', texto: 'Diurna, nocturna y semipresencial sabatina, pensadas para quien trabaja o tiene otras responsabilidades.' },
          { titulo: 'Ciclos CLEI', texto: 'Ciclos Lectivos Especiales Integrados: avanza más de un grado por año lectivo bajo el modelo oficial para jóvenes y adultos.' },
          { titulo: 'Acompañamiento real', texto: 'Boletines, observador y comunicación directa con cada docente a través de la plataforma institucional.' },
        ].map((item) => (
          <div key={item.titulo} className="rounded-sm border border-niebla p-5">
            <h3 className="mb-2 font-display text-lg">{item.titulo}</h3>
            <p className="text-sm text-piedra">{item.texto}</p>
          </div>
        ))}
      </section>

      {noticias.length > 0 && (
        <section>
          <h2 className="mb-6 font-display text-2xl">Últimas noticias</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {noticias.map((n) => (
              <Link
                key={n.id}
                href={`/blog/${n.slug}`}
                className="flex flex-col gap-2 rounded-sm border border-niebla p-4 hover:border-carmin"
              >
                {n.metaImgId && (
                  <div className="relative h-32 w-full overflow-hidden rounded-sm bg-niebla">
                    <Image src={`/api/galeria/imagen/${n.metaImgId}`} alt="" fill className="object-cover" />
                  </div>
                )}
                <h3 className="font-display text-lg">{n.titulo}</h3>
                {n.subtitulo && <p className="text-sm text-piedra">{n.subtitulo}</p>}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

import { and, asc, count, desc, eq, inArray, isNull, lte, or } from 'drizzle-orm'
import { db, conContextoRLS } from './cliente'
import { cmsAlbumFoto, cmsEntrada } from './esquema'

export type EntradaCms = typeof cmsEntrada.$inferSelect
export type FotoAlbum = typeof cmsAlbumFoto.$inferSelect

const CONTEXTO_ANONIMO = { usuarioId: '', rol: 'anonimo' } as const

function condicionPublicada(tipo: string) {
  return and(
    eq(cmsEntrada.tipo, tipo),
    eq(cmsEntrada.estado, 'publicado'),
    isNull(cmsEntrada.eliminadoEn),
    or(isNull(cmsEntrada.publicarEn), lte(cmsEntrada.publicarEn, new Date()))
  )
}

export async function obtenerEntradas(tipo: string, limite?: number): Promise<EntradaCms[]> {
  return conContextoRLS(db, CONTEXTO_ANONIMO, async (tx) => {
    const consulta = tx
      .select()
      .from(cmsEntrada)
      .where(condicionPublicada(tipo))
      .orderBy(desc(cmsEntrada.creadoEn), desc(cmsEntrada.id))

    return limite ? consulta.limit(limite) : consulta
  })
}

export async function obtenerEntrada(tipo: string, slug: string): Promise<EntradaCms | null> {
  return conContextoRLS(db, CONTEXTO_ANONIMO, async (tx) => {
    const [fila] = await tx
      .select()
      .from(cmsEntrada)
      .where(and(condicionPublicada(tipo), eq(cmsEntrada.slug, slug)))
      .limit(1)
    return fila ?? null
  })
}

export interface Vecinas {
  anterior: Pick<EntradaCms, 'slug' | 'titulo'> | null
  siguiente: Pick<EntradaCms, 'slug' | 'titulo'> | null
}

export async function obtenerVecinas(tipo: string, id: string): Promise<Vecinas> {
  const todas = await conContextoRLS(db, CONTEXTO_ANONIMO, async (tx) =>
    tx
      .select({ id: cmsEntrada.id, slug: cmsEntrada.slug, titulo: cmsEntrada.titulo })
      .from(cmsEntrada)
      .where(condicionPublicada(tipo))
      .orderBy(desc(cmsEntrada.creadoEn), desc(cmsEntrada.id))
  )
  const posicion = todas.findIndex((e) => e.id === id)
  if (posicion === -1) return { anterior: null, siguiente: null }
  return {
    anterior: todas[posicion + 1] ?? null,
    siguiente: todas[posicion - 1] ?? null,
  }
}

export interface AlbumPublico extends EntradaCms {
  fotos: number
}

export async function obtenerAlbumes(): Promise<AlbumPublico[]> {
  return conContextoRLS(db, CONTEXTO_ANONIMO, async (tx) => {
    const albumes = await tx
      .select()
      .from(cmsEntrada)
      .where(condicionPublicada('album'))
      .orderBy(desc(cmsEntrada.creadoEn), desc(cmsEntrada.id))

    if (albumes.length === 0) return []

    const conteos = await tx
      .select({ albumId: cmsAlbumFoto.albumId, total: count() })
      .from(cmsAlbumFoto)
      .where(
        inArray(
          cmsAlbumFoto.albumId,
          albumes.map((a) => a.id)
        )
      )
      .groupBy(cmsAlbumFoto.albumId)

    const porAlbum = new Map(conteos.map((c) => [c.albumId, Number(c.total)]))
    return albumes.map((a) => ({ ...a, fotos: porAlbum.get(a.id) ?? 0 }))
  })
}

export async function obtenerAlbum(
  slug: string
): Promise<{ album: EntradaCms; fotos: FotoAlbum[] } | null> {
  return conContextoRLS(db, CONTEXTO_ANONIMO, async (tx) => {
    const [album] = await tx
      .select()
      .from(cmsEntrada)
      .where(and(condicionPublicada('album'), eq(cmsEntrada.slug, slug)))
      .limit(1)

    if (!album) return null

    const fotos = await tx
      .select()
      .from(cmsAlbumFoto)
      .where(eq(cmsAlbumFoto.albumId, album.id))
      .orderBy(asc(cmsAlbumFoto.orden), asc(cmsAlbumFoto.id))

    return { album, fotos }
  })
}

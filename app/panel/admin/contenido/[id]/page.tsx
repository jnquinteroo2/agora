import { eq, asc } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { db, conContextoRLS } from '@/src/datos/cliente'
import { obtenerUsuarioActual } from '@/src/auth/sesion'
import { cmsEntrada, cmsAlbumFoto } from '@/src/datos/esquema'
import { EditorEntrada } from './editor'

export default async function EditarEntradaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const usuario = await obtenerUsuarioActual()
  if (!usuario) return null

  const { entrada, fotos } = await conContextoRLS(db, { usuarioId: usuario.id, rol: 'superadmin' }, async (tx) => {
    const [e] = await tx.select().from(cmsEntrada).where(eq(cmsEntrada.id, id)).limit(1)
    if (!e) return { entrada: null, fotos: [] }

    const fotos =
      e.tipo === 'album'
        ? await tx.select().from(cmsAlbumFoto).where(eq(cmsAlbumFoto.albumId, e.id)).orderBy(asc(cmsAlbumFoto.orden))
        : []

    return { entrada: e, fotos }
  })

  if (!entrada) notFound()

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-2xl">Editar: {entrada.titulo}</h1>
      <EditorEntrada entrada={entrada} fotos={fotos} />
    </div>
  )
}

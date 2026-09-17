import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, conContextoRLS } from '@/src/datos/cliente'
import { archivo } from '@/src/datos/esquema'
import { almacenamiento, type Bucket } from '@/src/almacenamiento'

export async function GET(request: NextRequest, { params }: { params: Promise<{ archivoId: string }> }) {
  const { archivoId } = await params

  const archivoFila = await conContextoRLS(db, { usuarioId: '', rol: 'anonimo' }, async (tx) => {
    const [fila] = await tx.select().from(archivo).where(eq(archivo.id, archivoId)).limit(1)
    return fila ?? null
  })

  if (!archivoFila) {
    return NextResponse.json({ error: 'Imagen no encontrada' }, { status: 404 })
  }

  const contenido = await almacenamiento.leer(archivoFila.bucket as Bucket, archivoFila.nombreStor)

  return new NextResponse(new Uint8Array(contenido), {
    headers: {
      'content-type': archivoFila.mime,
      'cache-control': 'public, max-age=86400, immutable',
    },
  })
}

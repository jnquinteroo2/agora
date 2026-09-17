import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { auth } from '@/src/auth/config'
import { db, conContextoRLS } from '@/src/datos/cliente'
import { archivo, usuario as usuarioTabla } from '@/src/datos/esquema'
import { almacenamiento, type Bucket } from '@/src/almacenamiento'

export async function GET(request: NextRequest, { params }: { params: Promise<{ archivoId: string }> }) {
  const { archivoId } = await params
  const sesion = await auth.api.getSession({ headers: request.headers })
  if (!sesion?.user?.email) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const [usuarioActual] = await db
    .select()
    .from(usuarioTabla)
    .where(eq(usuarioTabla.correo, sesion.user.email))
    .limit(1)

  if (!usuarioActual || !usuarioActual.activo) {
    return NextResponse.json({ error: 'Cuenta inactiva o sin acceso' }, { status: 403 })
  }

  const archivoFila = await conContextoRLS(
    db,
    { usuarioId: usuarioActual.id, rol: usuarioActual.rol as 'superadmin' | 'docente' | 'estudiante' },
    async (tx) => {
      const [fila] = await tx.select().from(archivo).where(eq(archivo.id, archivoId)).limit(1)
      return fila ?? null
    }
  )

  if (!archivoFila) {
    return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })
  }

  const contenido = await almacenamiento.leer(archivoFila.bucket as Bucket, archivoFila.nombreStor)

  return new NextResponse(new Uint8Array(contenido), {
    headers: {
      'content-type': archivoFila.mime,
      'content-disposition': `inline; filename="${archivoFila.nombreOrig}"`,
      'cache-control': 'private, no-store',
    },
  })
}

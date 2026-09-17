import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import sharp from 'sharp'
import { auth } from '@/src/auth/config'
import { db, conContextoRLS, registrarAuditoria } from '@/src/datos/cliente'
import { archivo, usuario as usuarioTabla } from '@/src/datos/esquema'
import { eq } from 'drizzle-orm'
import {
  almacenamiento,
  verificarBytesMagicos,
  nombreSeguro,
  TIPOS_PERMITIDOS,
  LIMITES_TAMANO,
  type Bucket,
} from '@/src/almacenamiento'

const EXTENSION_POR_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'application/pdf': 'pdf',
}

type FormatoSharp = Parameters<ReturnType<typeof sharp>['toFormat']>[0]

const FORMATO_SHARP_POR_MIME: Partial<Record<string, FormatoSharp>> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
}

const BUCKET_POR_TIPO: Record<string, Bucket> = {
  imagen: 'galeria',
  soporte: 'soportes',
  documento: 'pdf',
}

export async function POST(req: NextRequest) {
  const sesion = await auth.api.getSession({ headers: req.headers })
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

  const formData = await req.formData().catch(() => null)
  if (!formData) {
    return NextResponse.json({ error: 'Formato de solicitud inválido' }, { status: 400 })
  }

  const file = formData.get('archivo')
  const tipoGrupo = (formData.get('tipo') as string) ?? 'soporte'

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Se requiere un archivo' }, { status: 400 })
  }

  const mime = file.type
  const tiposPermitidos = TIPOS_PERMITIDOS[tipoGrupo as keyof typeof TIPOS_PERMITIDOS]
  if (!tiposPermitidos || !tiposPermitidos.includes(mime as never)) {
    return NextResponse.json({ error: `Tipo MIME no permitido: ${mime}` }, { status: 415 })
  }

  const limiteBytes = LIMITES_TAMANO[tipoGrupo] ?? LIMITES_TAMANO['soporte']!
  if (file.size > limiteBytes) {
    return NextResponse.json(
      { error: `Archivo supera el límite de ${Math.round(limiteBytes / 1024 / 1024)} MB` },
      { status: 413 }
    )
  }

  let datos = Buffer.from(await file.arrayBuffer())

  if (!verificarBytesMagicos(datos, mime)) {
    return NextResponse.json({ error: 'El contenido no coincide con el tipo declarado' }, { status: 415 })
  }

  const formatoSharp = FORMATO_SHARP_POR_MIME[mime]
  if (formatoSharp) {
    try {
      datos = await sharp(datos).rotate().toFormat(formatoSharp).toBuffer()
    } catch {
      return NextResponse.json({ error: 'No se pudo procesar la imagen' }, { status: 415 })
    }
  }

  const extension = EXTENSION_POR_MIME[mime] ?? 'bin'
  const nombreEnStorage = nombreSeguro(extension)
  const bucket: Bucket = BUCKET_POR_TIPO[tipoGrupo] ?? 'soportes'

  await almacenamiento.guardar({ bucket, nombre: nombreEnStorage, datos, mime })

  const hash = createHash('sha256').update(datos).digest('hex')

  let nuevoArchivo: typeof archivo.$inferSelect
  try {
    nuevoArchivo = await conContextoRLS(
      db,
      { usuarioId: usuarioActual.id, rol: usuarioActual.rol as 'superadmin' | 'docente' | 'estudiante' },
      async (tx) => {
        const [fila] = await tx
          .insert(archivo)
          .values({
            nombreOrig: file.name,
            nombreStor: nombreEnStorage,
            bucket,
            mime,
            bytes: datos.length,
            hashSha256: hash,
            subidoPor: usuarioActual.id,
          })
          .returning()

        if (!fila) throw new Error('No se pudo registrar el archivo (verifique permisos)')

        await registrarAuditoria(tx, {
          actorId: usuarioActual.id,
          actorRol: usuarioActual.rol,
          accion: 'subir_archivo',
          entidad: 'archivo',
          entidadId: fila.id,
        })

        return fila
      }
    )
  } catch {
    return NextResponse.json({ error: 'No se pudo registrar el archivo. Verifique su rol y permisos.' }, { status: 403 })
  }

  return NextResponse.json(nuevoArchivo, { status: 201 })
}

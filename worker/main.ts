import { PgBoss } from 'pg-boss'
import { logger } from '../src/logger'
import { env } from '../src/env'
import { COLAS, type TrabajoPDF } from '../src/colas/tipos'

export { COLAS }

async function iniciarWorker() {
  const boss = new PgBoss({
    connectionString: env.PGBOSS_DATABASE_URL,
    max: 5,
    monitorIntervalSeconds: 30,
  })

  boss.on('error', (error) => logger.error({ error }, 'Error en pg-boss'))

  await boss.start()
  logger.info('Worker pg-boss iniciado')

  const SIETE_DIAS_SEGUNDOS = 7 * 24 * 60 * 60

  await boss.createQueue(COLAS.GENERAR_PDF, { deleteAfterSeconds: SIETE_DIAS_SEGUNDOS })
  await boss.createQueue(COLAS.LIMPIAR_RATE_LIMIT, { deleteAfterSeconds: SIETE_DIAS_SEGUNDOS })

  await boss.work(
    COLAS.GENERAR_PDF,
    { localConcurrency: env.PDF_WORKER_CONCURRENCY, batchSize: 1 },
    async (trabajos) => {
      for (const trabajo of trabajos) {
        logger.info({ id: trabajo.id, tipo: trabajo.data }, 'Procesando trabajo PDF')
        await procesarPDF(trabajo.data as TrabajoPDF)
      }
    }
  )

  await boss.work(COLAS.LIMPIAR_RATE_LIMIT, { localConcurrency: 1 }, async () => {
    const { db } = await import('../src/datos/cliente')
    const { limiteTasa } = await import('../src/datos/esquema')
    const { lt } = await import('drizzle-orm')
    const hace1Hora = new Date(Date.now() - 60 * 60 * 1000)
    await db.delete(limiteTasa).where(lt(limiteTasa.ventana, hace1Hora))
  })

  await boss.schedule(COLAS.LIMPIAR_RATE_LIMIT, '*/30 * * * *')

  process.on('SIGTERM', async () => {
    logger.info('SIGTERM recibido, deteniendo worker')
    await boss.stop()
    process.exit(0)
  })
}

async function procesarPDF(datos: TrabajoPDF): Promise<void> {
  const { chromium } = await import('playwright')
  const { crearTokenRenderPDF } = await import('../src/datos/pdf-token')

  const navegador = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    const pagina = await navegador.newPage()
    const token = crearTokenRenderPDF({
      tipo: datos.tipo,
      entidadId: datos.entidadId,
      periodoId: datos.periodoId,
      solicitante: datos.solicitadoPor,
    })
    const parametrosUrl = new URLSearchParams({ token })
    if (datos.periodoId) parametrosUrl.set('periodo', datos.periodoId)
    const url = `${env.PDF_RENDER_BASE_URL}/api/pdf/render/${datos.tipo}/${datos.entidadId}?${parametrosUrl.toString()}`
    const respuesta = await pagina.goto(url, { waitUntil: 'networkidle' })
    if (!respuesta || !respuesta.ok()) {
      throw new Error(`La ruta de renderizado respondió ${respuesta?.status() ?? 'sin respuesta'}`)
    }

    const pdf = await pagina.pdf({
      format: 'Letter',
      margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' },
      printBackground: true,
    })

    await guardarPDF(datos, pdf)
    logger.info({ tipo: datos.tipo, entidadId: datos.entidadId }, 'PDF generado')
  } finally {
    await navegador.close()
  }
}

async function guardarPDF(datos: TrabajoPDF, contenido: Buffer): Promise<void> {
  const { almacenamiento, nombreSeguro } = await import('../src/almacenamiento')
  const { db, conContextoRLS, registrarAuditoria } = await import('../src/datos/cliente')
  const { archivo, documentoGenerado } = await import('../src/datos/esquema')
  const { createHash } = await import('crypto')

  const nombre = nombreSeguro('pdf')
  const hash = createHash('sha256').update(contenido).digest('hex')

  await conContextoRLS(
    db,
    { usuarioId: datos.solicitadoPor.id, rol: datos.solicitadoPor.rol, anioLectivoId: datos.anioLectivoId },
    async (tx) => {
      const [archivoGuardado] = await tx
        .insert(archivo)
        .values({
          nombreOrig: `${datos.tipo}_${datos.entidadId}.pdf`,
          nombreStor: nombre,
          bucket: 'pdf',
          mime: 'application/pdf',
          bytes: contenido.byteLength,
          hashSha256: hash,
          subidoPor: datos.solicitadoPor.id,
        })
        .returning()

      if (!archivoGuardado) throw new Error('No se pudo guardar el archivo en la base de datos')

      await almacenamiento.guardar({ bucket: 'pdf', nombre, datos: contenido, mime: 'application/pdf' })

      const [documento] = await tx
        .insert(documentoGenerado)
        .values({
          tipo: datos.tipo,
          entidadId: datos.entidadId,
          periodoId: datos.periodoId ?? null,
          anioLectivoId: datos.anioLectivoId ?? null,
          archivoId: archivoGuardado.id,
          hashContenido: hash,
          generadoPor: datos.solicitadoPor.id,
        })
        .returning()

      if (!documento) throw new Error('No se pudo registrar el documento generado en la base de datos')

      await registrarAuditoria(tx, {
        actorId: datos.solicitadoPor.id,
        actorRol: datos.solicitadoPor.rol,
        accion: 'generar_pdf',
        entidad: 'documento_generado',
        entidadId: documento.id,
      })
    }
  )
}

iniciarWorker().catch((error) => {
  logger.error({ error }, 'Error fatal en worker')
  process.exit(1)
})

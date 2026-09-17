import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db, conContextoRLS } from '@/src/datos/cliente'
import { documentoGenerado } from '@/src/datos/esquema'

const NOMBRE_TIPO: Record<string, string> = {
  boletin: 'Boletín de calificaciones',
  recibo_caja: 'Recibo de caja',
  comprobante_egreso: 'Comprobante de egreso',
  constancia: 'Constancia',
  certificado: 'Certificado',
  contrato: 'Contrato',
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const documento = await conContextoRLS(db, { usuarioId: '', rol: 'verificacion_publica' }, async (tx) => {
    const [d] = await tx.select().from(documentoGenerado).where(eq(documentoGenerado.id, id)).limit(1)
    return d ?? null
  })

  if (!documento) {
    return new NextResponse(paginaResultado(false), {
      status: 404,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })
  }

  return new NextResponse(paginaResultado(true, documento), {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}

function paginaResultado(
  encontrado: boolean,
  documento?: typeof documentoGenerado.$inferSelect
): string {
  const cuerpo = encontrado && documento
    ? `
      <p class="ok">✓ Documento auténtico</p>
      <dl>
        <dt>Tipo</dt><dd>${NOMBRE_TIPO[documento.tipo] ?? documento.tipo}</dd>
        <dt>Generado el</dt><dd>${documento.creadoEn.toISOString().slice(0, 10)}</dd>
        <dt>Huella de integridad</dt><dd class="hash">${documento.hashContenido}</dd>
      </dl>
      <p class="nota">Compare la huella de integridad con la que aparece impresa en su documento físico.</p>`
    : `<p class="error">✗ No se encontró ningún documento con este identificador.</p>`

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Verificación de documento — Colegio Ágora</title>
<style>
  body { font-family: Georgia, serif; background: #F6F4EF; color: #0B0B0C; margin: 0; padding: 24px; }
  .tarjeta { max-width: 480px; margin: 40px auto; padding: 24px; border: 1px solid #E4E0D8; border-radius: 4px; background: #FFFFFF; }
  h1 { font-size: 1.1rem; margin: 0 0 16px; }
  p.ok { color: #2F6F4E; font-weight: bold; }
  p.error { color: #B3121A; font-weight: bold; }
  dl { font-size: 0.875rem; }
  dt { color: #6B6660; margin-top: 8px; }
  dd { margin: 0; }
  dd.hash { font-family: monospace; word-break: break-all; font-size: 0.75rem; }
  p.nota { font-size: 0.75rem; color: #6B6660; margin-top: 16px; }
</style>
</head>
<body>
  <div class="tarjeta">
    <h1>Verificación de documento — Colegio Ágora</h1>
    ${cuerpo}
  </div>
</body>
</html>`
}

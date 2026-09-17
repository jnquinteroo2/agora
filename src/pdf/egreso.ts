import { eq } from 'drizzle-orm'
import { db, conContextoRLS } from '../datos/cliente'
import { egreso, categoriaEgreso, configuracionInstitucional } from '../datos/esquema'
import type { IdentidadSolicitante } from '../datos/pdf-token'
import { escaparHTML, formatearMoneda } from './util'

export async function construirEgresoHTML(
  egresoId: string,
  solicitante: IdentidadSolicitante
): Promise<string> {
  const fila = await conContextoRLS(db, { usuarioId: solicitante.id, rol: solicitante.rol }, async (tx) => {
    const [e] = await tx.select().from(egreso).where(eq(egreso.id, egresoId)).limit(1)
    if (!e) throw new Error('El egreso indicado no existe o no es visible para este solicitante')
    return e
  })

  return conContextoRLS(
    db,
    { usuarioId: solicitante.id, rol: solicitante.rol, anioLectivoId: fila.anioLectivoId },
    async (tx) => {
      const [categoria] = await tx
        .select()
        .from(categoriaEgreso)
        .where(eq(categoriaEgreso.id, fila.categoriaId))
        .limit(1)

      const [config] = await tx.select().from(configuracionInstitucional).limit(1)

      const nombreColegio = config?.nombreLegal ?? 'Institución Educativa'
      const nit = config?.nit ? `NIT ${escaparHTML(config.nit)}` : ''

      return `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Comprobante de egreso N.º ${fila.consecutivo}</title>
<style>
  @page { size: letter; margin: 0; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #111; margin: 0; padding: 16mm; }
  ${fila.anulado ? '.marca-agua { position: fixed; top: 40%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 96px; font-weight: bold; color: rgba(180,20,20,0.2); z-index: 0; letter-spacing: 8px; }' : ''}
  header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #111; padding-bottom: 10px; margin-bottom: 16px; }
  header h1 { font-size: 18px; margin: 0; }
  header p { font-size: 11px; margin: 2px 0 0; color: #444; }
  .consecutivo { text-align: right; font-size: 14px; }
  .consecutivo strong { color: #b41414; font-size: 22px; display: block; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 20px; }
  td { padding: 8px 0; border-bottom: 1px solid #ddd; }
  td.etiqueta { color: #666; width: 160px; }
  .valor-total { margin-top: 20px; text-align: right; font-size: 20px; font-weight: bold; }
  footer { margin-top: 60px; display: flex; justify-content: space-between; font-size: 11px; }
  footer .firma { text-align: center; width: 220px; }
  footer .firma .linea { border-top: 1px solid #111; margin-top: 30px; padding-top: 4px; }
  .pie-generacion { margin-top: 24px; font-size: 9px; color: #888; text-align: right; }
</style>
</head>
<body>
  ${fila.anulado ? '<div class="marca-agua">ANULADO</div>' : ''}
  <header>
    <div>
      <h1>${escaparHTML(nombreColegio)}</h1>
      <p>${nit}</p>
    </div>
    <div class="consecutivo">
      Comprobante de egreso
      <strong>N.º ${fila.consecutivo}</strong>
    </div>
  </header>
  <table>
    <tr><td class="etiqueta">Fecha</td><td>${fila.fecha}</td></tr>
    <tr><td class="etiqueta">Pagado a</td><td>${escaparHTML(fila.beneficiario)}</td></tr>
    <tr><td class="etiqueta">Categoría</td><td>${escaparHTML(categoria?.nombre ?? '—')}</td></tr>
    ${fila.descripcion ? `<tr><td class="etiqueta">Descripción</td><td>${escaparHTML(fila.descripcion)}</td></tr>` : ''}
  </table>
  <div class="valor-total">${formatearMoneda(fila.valor)}</div>
  ${fila.anulado ? `<p style="color:#b41414;">Anulado: ${escaparHTML(fila.anulacionMotivo)}</p>` : ''}
  <footer>
    <div class="firma"><div class="linea">Elaborado por</div></div>
    <div class="firma"><div class="linea">Recibido por</div></div>
  </footer>
  <div class="pie-generacion">Generado el ${new Date().toISOString().slice(0, 10)}</div>
</body>
</html>`
    }
  )
}

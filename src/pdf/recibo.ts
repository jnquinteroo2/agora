import { eq } from 'drizzle-orm'
import { db, conContextoRLS } from '../datos/cliente'
import { reciboCaja, conceptoIngreso, matricula, persona, configuracionInstitucional } from '../datos/esquema'
import type { IdentidadSolicitante } from '../datos/pdf-token'
import { escaparHTML, formatearMoneda } from './util'

export async function construirReciboHTML(
  reciboId: string,
  solicitante: IdentidadSolicitante
): Promise<string> {
  const recibo = await conContextoRLS(db, { usuarioId: solicitante.id, rol: solicitante.rol }, async (tx) => {
    const [r] = await tx.select().from(reciboCaja).where(eq(reciboCaja.id, reciboId)).limit(1)
    if (!r) throw new Error('El recibo indicado no existe o no es visible para este solicitante')
    return r
  })

  return conContextoRLS(
    db,
    { usuarioId: solicitante.id, rol: solicitante.rol, anioLectivoId: recibo.anioLectivoId },
    async (tx) => {
      const [concepto] = await tx
        .select()
        .from(conceptoIngreso)
        .where(eq(conceptoIngreso.id, recibo.conceptoId))
        .limit(1)

      const [config] = await tx.select().from(configuracionInstitucional).limit(1)

      let nombreEstudiante = ''
      if (recibo.matriculaId) {
        const [m] = await tx.select().from(matricula).where(eq(matricula.id, recibo.matriculaId)).limit(1)
        if (m) {
          const [est] = await tx.select().from(persona).where(eq(persona.id, m.estudianteId)).limit(1)
          if (est) {
            nombreEstudiante = [est.primerNombre, est.segundoNombre, est.primerApellido, est.segundoApellido]
              .filter(Boolean)
              .join(' ')
          }
        }
      }

      const nombreColegio = config?.nombreLegal ?? 'Institución Educativa'
      const nit = config?.nit ? `NIT ${escaparHTML(config.nit)}` : ''

      return `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Recibo de caja N.º ${recibo.consecutivo}</title>
<style>
  @page { size: letter; margin: 0; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #111; margin: 0; padding: 16mm; }
  ${recibo.anulado ? '.marca-agua { position: fixed; top: 40%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 96px; font-weight: bold; color: rgba(180,20,20,0.2); z-index: 0; letter-spacing: 8px; }' : ''}
  header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #111; padding-bottom: 10px; margin-bottom: 16px; }
  header h1 { font-size: 18px; margin: 0; }
  header p { font-size: 11px; margin: 2px 0 0; color: #444; }
  .consecutivo { text-align: right; font-size: 14px; }
  .consecutivo strong { color: #b41414; font-size: 22px; display: block; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 20px; }
  td { padding: 8px 0; border-bottom: 1px solid #ddd; }
  td.etiqueta { color: #666; width: 160px; }
  .valor-total { margin-top: 20px; text-align: right; font-size: 20px; font-weight: bold; }
  .pie-generacion { margin-top: 40px; font-size: 9px; color: #888; text-align: right; }
</style>
</head>
<body>
  ${recibo.anulado ? '<div class="marca-agua">ANULADO</div>' : ''}
  <header>
    <div>
      <h1>${escaparHTML(nombreColegio)}</h1>
      <p>${nit}</p>
    </div>
    <div class="consecutivo">
      Recibo de caja
      <strong>N.º ${recibo.consecutivo}</strong>
    </div>
  </header>
  <table>
    <tr><td class="etiqueta">Fecha</td><td>${recibo.fecha}</td></tr>
    <tr><td class="etiqueta">Recibido de</td><td>${escaparHTML(recibo.beneficiario)}</td></tr>
    ${nombreEstudiante ? `<tr><td class="etiqueta">Estudiante</td><td>${escaparHTML(nombreEstudiante)}</td></tr>` : ''}
    <tr><td class="etiqueta">Concepto</td><td>${escaparHTML(concepto?.nombre ?? '—')}</td></tr>
    ${recibo.descripcion ? `<tr><td class="etiqueta">Descripción</td><td>${escaparHTML(recibo.descripcion)}</td></tr>` : ''}
    <tr><td class="etiqueta">Forma de pago</td><td>${escaparHTML(recibo.formaPago)}</td></tr>
  </table>
  <div class="valor-total">${formatearMoneda(recibo.valor)}</div>
  ${recibo.anulado ? `<p style="color:#b41414;">Anulado: ${escaparHTML(recibo.anulacionMotivo)}</p>` : ''}
  <div class="pie-generacion">Generado el ${new Date().toISOString().slice(0, 10)}</div>
</body>
</html>`
    }
  )
}

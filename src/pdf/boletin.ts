import { eq, and, inArray } from 'drizzle-orm'
import { db, conContextoRLS } from '../datos/cliente'
import {
  periodo,
  matricula,
  persona,
  curso,
  ciclo,
  jornada,
  asignatura,
  area,
  planAsignatura,
  calificacion,
  escalaValoracion,
  configuracionInstitucional,
} from '../datos/esquema'
import { calcularPromedio, obtenerNivelDesempeno } from '../dominio/calculo-academico'
import type { IdentidadSolicitante } from '../datos/pdf-token'

function escaparHTML(texto: string | null | undefined): string {
  if (!texto) return ''
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatearNota(nota: string | null): string {
  if (nota === null) return '—'
  return Number(nota).toFixed(1)
}

export async function construirBoletinHTML(
  matriculaId: string,
  periodoId: string,
  solicitante: IdentidadSolicitante
): Promise<string> {
  const { periodoActual, config } = await conContextoRLS(
    db,
    { usuarioId: solicitante.id, rol: solicitante.rol },
    async (tx) => {
      const [p] = await tx.select().from(periodo).where(eq(periodo.id, periodoId)).limit(1)
      if (!p) throw new Error('El periodo indicado no existe')

      const [cfg] = await tx.select().from(configuracionInstitucional).limit(1)

      return { periodoActual: p, config: cfg ?? null }
    }
  )

  return conContextoRLS(
    db,
    { usuarioId: solicitante.id, rol: solicitante.rol, anioLectivoId: periodoActual.anioLectivoId },
    async (tx) => {
      const [m] = await tx.select().from(matricula).where(eq(matricula.id, matriculaId)).limit(1)
      if (!m) throw new Error('La matrícula indicada no existe o no es visible para este solicitante')

      const [estudiante] = await tx.select().from(persona).where(eq(persona.id, m.estudianteId)).limit(1)
      if (!estudiante) throw new Error('No se encontró la persona del estudiante')

      const [cursoFila] = await tx
        .select({ curso, ciclo, jornada })
        .from(curso)
        .innerJoin(ciclo, eq(ciclo.id, curso.cicloId))
        .innerJoin(jornada, eq(jornada.id, curso.jornadaId))
        .where(eq(curso.id, m.cursoId))
        .limit(1)
      if (!cursoFila) throw new Error('No se encontró el curso de la matrícula')

      const plan = await tx
        .select({ asignatura, area })
        .from(planAsignatura)
        .innerJoin(asignatura, eq(asignatura.id, planAsignatura.asignaturaId))
        .innerJoin(area, eq(area.id, asignatura.areaId))
        .where(
          and(
            eq(planAsignatura.anioLectivoId, periodoActual.anioLectivoId),
            eq(planAsignatura.cicloId, cursoFila.ciclo.id)
          )
        )

      const asignaturaIds = plan.map((p) => p.asignatura.id)
      const notas = asignaturaIds.length
        ? await tx
            .select()
            .from(calificacion)
            .where(
              and(
                eq(calificacion.matriculaId, matriculaId),
                eq(calificacion.periodoId, periodoId),
                inArray(calificacion.asignaturaId, asignaturaIds)
              )
            )
        : []

      const notaPorAsignatura = new Map(notas.map((n) => [n.asignaturaId, n]))

      const bandas = await tx
        .select()
        .from(escalaValoracion)
        .where(eq(escalaValoracion.anioLectivoId, periodoActual.anioLectivoId))
      const bandasNum = bandas.map((b) => ({
        nivel: b.nivel,
        desde: Number(b.desde),
        hasta: Number(b.hasta),
        orden: b.orden,
      }))

      const promedioGeneral = calcularPromedio(notas.map((n) => (n.nota === null ? null : Number(n.nota))))
      const nivelGeneral = obtenerNivelDesempeno(promedioGeneral, bandasNum)

      const esBorrador = periodoActual.notasAbiertas

      const nombreEstudiante = [
        estudiante.primerNombre,
        estudiante.segundoNombre,
        estudiante.primerApellido,
        estudiante.segundoApellido,
      ]
        .filter(Boolean)
        .join(' ')

      const filasAsignaturas = plan
        .sort((a, b) => a.area.nombre.localeCompare(b.area.nombre) || a.asignatura.nombre.localeCompare(b.asignatura.nombre))
        .map((p) => {
          const cal = notaPorAsignatura.get(p.asignatura.id)
          const nota = cal?.nota ?? null
          const nivel = cal?.nivelDesempeno ?? '—'
          const descriptor = cal?.descriptorTexto ?? ''
          const fallas = cal?.fallas ?? 0
          return `
            <tr>
              <td class="area">${escaparHTML(p.area.nombre)}</td>
              <td class="asignatura">${escaparHTML(p.asignatura.nombre)}</td>
              <td class="nota">${formatearNota(nota)}</td>
              <td class="nivel">${escaparHTML(nivel)}</td>
              <td class="fallas">${fallas}</td>
              <td class="descriptor">${escaparHTML(descriptor)}</td>
            </tr>`
        })
        .join('\n')

      const nombreColegio = config?.nombreLegal ?? 'Institución Educativa'
      const lema = config?.lema ?? ''
      const escudo = config?.escudoUrl ?? '/marca/escudo-agora.png'

      return `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Boletín — ${escaparHTML(nombreEstudiante)}</title>
<style>
  @page { size: letter; margin: 0; }
  * { box-sizing: border-box; }
  body {
    font-family: Georgia, 'Times New Roman', serif;
    color: #111;
    margin: 0;
    padding: 0;
    position: relative;
  }
  .marca-agua {
    position: fixed;
    top: 40%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-30deg);
    font-size: 96px;
    font-weight: bold;
    color: rgba(180, 20, 20, 0.18);
    z-index: 0;
    letter-spacing: 8px;
    pointer-events: none;
  }
  .contenido { position: relative; z-index: 1; padding: 8mm 4mm; }
  header { display: flex; align-items: center; gap: 16px; border-bottom: 3px solid #111; padding-bottom: 10px; margin-bottom: 14px; }
  header img { width: 64px; height: 64px; object-fit: contain; }
  header h1 { font-size: 18px; margin: 0; }
  header p { font-size: 11px; margin: 2px 0 0; color: #444; }
  .franja { background: #111; color: #fff; padding: 6px 10px; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px; }
  .franja strong { color: #d21f1f; }
  .datos-estudiante { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; font-size: 12px; margin-bottom: 14px; }
  .datos-estudiante div span.etiqueta { color: #666; display: inline-block; width: 110px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #111; color: #fff; text-align: left; padding: 6px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 5px 8px; border-bottom: 1px solid #ddd; vertical-align: top; }
  td.nota, td.fallas { text-align: center; width: 50px; }
  td.nivel { width: 90px; }
  tr.total td { border-top: 2px solid #111; border-bottom: none; font-weight: bold; background: #f5f5f5; }
  footer { margin-top: 24px; display: flex; justify-content: space-between; font-size: 11px; }
  footer .firma { text-align: center; width: 220px; }
  footer .firma .linea { border-top: 1px solid #111; margin-top: 30px; padding-top: 4px; }
  .pie-generacion { margin-top: 24px; font-size: 9px; color: #888; text-align: right; }
</style>
</head>
<body>
  ${esBorrador ? '<div class="marca-agua">BORRADOR</div>' : ''}
  <div class="contenido">
    <header>
      <img src="${escudo}" alt="Escudo institucional" />
      <div>
        <h1>${escaparHTML(nombreColegio)}</h1>
        <p>${escaparHTML(lema)}</p>
        ${config?.resolucion ? `<p>Resolución ${escaparHTML(config.resolucion)}${config.dane ? ` · DANE ${escaparHTML(config.dane)}` : ''}</p>` : ''}
      </div>
    </header>

    <div class="franja">Boletín de calificaciones <strong>· Periodo ${periodoActual.numero}</strong></div>

    <div class="datos-estudiante">
      <div><span class="etiqueta">Estudiante</span> ${escaparHTML(nombreEstudiante)}</div>
      <div><span class="etiqueta">Documento</span> ${escaparHTML(estudiante.tipoDocumento)} ${escaparHTML(estudiante.numeroDocumento)}</div>
      <div><span class="etiqueta">Curso</span> ${escaparHTML(cursoFila.curso.nombre)} (${escaparHTML(cursoFila.ciclo.gradoEquivalente)})</div>
      <div><span class="etiqueta">Jornada</span> ${escaparHTML(cursoFila.jornada.nombre)}</div>
      <div><span class="etiqueta">Periodo</span> ${periodoActual.inicio} — ${periodoActual.fin}</div>
      <div><span class="etiqueta">Estado</span> ${esBorrador ? 'En curso (notas provisionales)' : 'Cerrado'}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Área</th>
          <th>Asignatura</th>
          <th>Nota</th>
          <th>Desempeño</th>
          <th>Fallas</th>
          <th>Observación</th>
        </tr>
      </thead>
      <tbody>
        ${filasAsignaturas || '<tr><td colspan="6" style="text-align:center;color:#888;">Sin asignaturas configuradas para este ciclo</td></tr>'}
        <tr class="total">
          <td colspan="2">Promedio general del periodo</td>
          <td class="nota">${promedioGeneral === null ? '—' : promedioGeneral.toFixed(1)}</td>
          <td class="nivel">${escaparHTML(nivelGeneral ?? '—')}</td>
          <td colspan="2"></td>
        </tr>
      </tbody>
    </table>

    <footer>
      <div class="firma">
        <div class="linea">${escaparHTML(config?.rectorNombre ?? '')}<br/>Rector(a)</div>
      </div>
      <div class="firma">
        <div class="linea">${escaparHTML(config?.dirAdmNombre ?? '')}<br/>Dirección administrativa</div>
      </div>
    </footer>

    <div class="pie-generacion">Generado el ${new Date().toISOString().slice(0, 10)}</div>
  </div>
</body>
</html>`
    }
  )
}

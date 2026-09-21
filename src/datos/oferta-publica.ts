import { and, asc, eq, isNull } from 'drizzle-orm'
import { db } from './cliente'
import { anioLectivo, ciclo, curso, jornada } from './esquema'

export type Ciclo = typeof ciclo.$inferSelect
export type Jornada = typeof jornada.$inferSelect

export interface OfertaPublica {
  ciclos: Ciclo[]
  jornadas: Jornada[]
  anio: string | null
  combinaciones: Set<string>
  completa: boolean
}

export function claveOferta(cicloId: string, jornadaId: string): string {
  return `${cicloId}:${jornadaId}`
}

export async function obtenerCiclos(): Promise<Ciclo[]> {
  return db.select().from(ciclo).orderBy(asc(ciclo.codigo))
}

export async function obtenerJornadasConOferta(): Promise<Jornada[]> {
  return db
    .selectDistinct({
      id: jornada.id,
      codigo: jornada.codigo,
      nombre: jornada.nombre,
      detalle: jornada.detalle,
    })
    .from(curso)
    .innerJoin(jornada, eq(jornada.id, curso.jornadaId))
    .innerJoin(anioLectivo, eq(anioLectivo.id, curso.anioLectivoId))
    .where(and(eq(anioLectivo.activo, true), isNull(curso.eliminadoEn)))
    .orderBy(asc(jornada.codigo))
}

export async function obtenerOferta(): Promise<OfertaPublica> {
  const [ciclos, [anioActivo]] = await Promise.all([
    obtenerCiclos(),
    db
      .select({ id: anioLectivo.id, nombre: anioLectivo.nombre })
      .from(anioLectivo)
      .where(eq(anioLectivo.activo, true))
      .orderBy(asc(anioLectivo.creadoEn), asc(anioLectivo.id))
      .limit(1),
  ])

  if (!anioActivo) {
    return { ciclos, jornadas: [], anio: null, combinaciones: new Set(), completa: false }
  }

  const [jornadas, cursos] = await Promise.all([
    obtenerJornadasConOferta(),
    db
      .select({ cicloId: curso.cicloId, jornadaId: curso.jornadaId })
      .from(curso)
      .where(and(eq(curso.anioLectivoId, anioActivo.id), isNull(curso.eliminadoEn))),
  ])

  const combinaciones = new Set(cursos.map((c) => claveOferta(c.cicloId, c.jornadaId)))

  const cerradas = ciclos.length > 0 && jornadas.length > 0
  const completa =
    cerradas &&
    ciclos.every((c) => jornadas.every((j) => combinaciones.has(claveOferta(c.id, j.id))))

  return { ciclos, jornadas, anio: anioActivo.nombre, combinaciones, completa }
}

export function cuentaCiclosPorJornada(
  oferta: OfertaPublica,
  jornadaId: string
): number {
  return oferta.ciclos.filter((c) => oferta.combinaciones.has(claveOferta(c.id, jornadaId))).length
}

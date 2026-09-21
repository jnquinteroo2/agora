import { asc } from 'drizzle-orm'
import { db } from './cliente'
import { configuracionInstitucional } from './esquema'

export type ConfiguracionInstitucion = typeof configuracionInstitucional.$inferSelect

export async function obtenerConfiguracion(): Promise<ConfiguracionInstitucion | null> {
  const [fila] = await db
    .select()
    .from(configuracionInstitucional)
    .orderBy(asc(configuracionInstitucional.creadoEn), asc(configuracionInstitucional.id))
    .limit(1)

  return fila ?? null
}

export function nombreCorto(config: ConfiguracionInstitucion | null): string {
  return config?.nombreCorto ?? config?.nombreLegal ?? 'Colegio Ágora'
}

export function nombreLegal(config: ConfiguracionInstitucion | null): string {
  return config?.nombreLegal ?? 'Institución Educativa Ágora'
}

export function ubicacion(config: ConfiguracionInstitucion | null): string | null {
  const partes = [config?.municipio, config?.departamento].filter(Boolean)
  return partes.length > 0 ? partes.join(', ') : null
}

export function direccionCompleta(config: ConfiguracionInstitucion | null): string | null {
  if (!config?.direccion) return null
  const lugar = ubicacion(config)
  return lugar ? `${config.direccion}, ${lugar}` : config.direccion
}

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { sql } from 'drizzle-orm'
import * as esquema from './esquema'
import { env } from '../env'

const conexion = postgres(env.DATABASE_URL, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
})

export const db = drizzle(conexion, { schema: esquema })

export type DB = typeof db
export type TX = Parameters<Parameters<typeof db.transaction>[0]>[0]

export interface ContextoRLS {
  usuarioId: string
  rol: 'superadmin' | 'docente' | 'estudiante' | 'anonimo' | 'verificacion_publica'
  anioLectivoId?: string
}

export async function conContextoRLS<T>(
  base: DB,
  contexto: ContextoRLS,
  fn: (tx: TX) => Promise<T>
): Promise<T> {
  return base.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.user_id', ${contexto.usuarioId}, true)`)
    await tx.execute(sql`SELECT set_config('app.role', ${contexto.rol}, true)`)
    await tx.execute(sql`SELECT set_config('app.year', ${contexto.anioLectivoId ?? ''}, true)`)
    return fn(tx)
  })
}

export async function registrarAuditoria(
  tx: TX | DB,
  datos: {
    actorId?: string
    actorRol?: string
    accion: string
    entidad: string
    entidadId?: string
    diferencia?: Record<string, unknown>
    ip?: string
    userAgent?: string
  }
): Promise<void> {
  await tx.insert(esquema.auditoria).values({
    actorId: datos.actorId,
    actorRol: datos.actorRol,
    accion: datos.accion,
    entidad: datos.entidad,
    entidadId: datos.entidadId,
    diferencia: datos.diferencia,
    ip: datos.ip as unknown as undefined,
    userAgent: datos.userAgent,
  })
}

export async function siguienteConsecutivo(
  tx: TX,
  anioLectivoId: string,
  tipo: 'recibo_caja' | 'comprobante_egreso' | 'radicado_aspirante' | 'folio_contrato'
): Promise<number> {
  const [fila] = await tx
    .select({ ultimo: esquema.secuencia.ultimo })
    .from(esquema.secuencia)
    .where(
      sql`${esquema.secuencia.anioLectivoId} = ${anioLectivoId} AND ${esquema.secuencia.tipo} = ${tipo}`
    )
    .for('update')

  if (!fila) {
    await tx.insert(esquema.secuencia).values({
      anioLectivoId,
      tipo,
      ultimo: 1,
    })
    return 1
  }

  const siguiente = Number(fila.ultimo) + 1
  await tx
    .update(esquema.secuencia)
    .set({ ultimo: siguiente })
    .where(
      sql`${esquema.secuencia.anioLectivoId} = ${anioLectivoId} AND ${esquema.secuencia.tipo} = ${tipo}`
    )
  return siguiente
}

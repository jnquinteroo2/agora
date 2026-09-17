import { count, eq, gte, and } from 'drizzle-orm'
import { limiteTasa } from './esquema'
import type { TX } from './cliente'

export async function verificarLimiteTasa(
  tx: TX,
  clave: string,
  maxIntentos: number,
  ventanaMinutos: number
): Promise<void> {
  await tx.insert(limiteTasa).values({ clave, ventana: new Date(), intentos: 1 })

  const desde = new Date(Date.now() - ventanaMinutos * 60 * 1_000)
  const [resultado] = await tx
    .select({ n: count() })
    .from(limiteTasa)
    .where(and(eq(limiteTasa.clave, clave), gte(limiteTasa.ventana, desde)))

  if (Number(resultado!.n) > maxIntentos) {
    throw new Error(`Demasiados intentos. Espere ${ventanaMinutos} minutos antes de reintentar.`)
  }
}

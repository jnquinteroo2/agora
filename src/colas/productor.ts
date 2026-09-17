import { PgBoss } from 'pg-boss'
import { env } from '../env'
import { logger } from '../logger'
import { COLAS, type TrabajoPDF } from './tipos'

let bossListo: Promise<PgBoss> | null = null

async function obtenerBoss(): Promise<PgBoss> {
  if (!bossListo) {
    bossListo = (async () => {
      const boss = new PgBoss({ connectionString: env.PGBOSS_DATABASE_URL, max: 2 })
      boss.on('error', (error) => logger.error({ error }, 'Error en pg-boss (productor)'))
      await boss.start()
      return boss
    })()
  }
  return bossListo
}

export async function encolarGeneracionPDF(trabajo: TrabajoPDF): Promise<string | null> {
  const boss = await obtenerBoss()
  return boss.send(COLAS.GENERAR_PDF, trabajo)
}

import { PgBoss } from 'pg-boss'
import { logger } from '../src/logger'
import { env } from '../src/env'
import { COLAS } from '../src/colas/tipos'
import { exigirSecretoDeAdministracionIdp } from '../src/arranque'
import { iniciarLatido } from './latido'

const SIETE_DIAS_SEGUNDOS = 7 * 24 * 60 * 60

async function iniciarSincronizador() {
  exigirSecretoDeAdministracionIdp()

  const boss = new PgBoss({ connectionString: env.PGBOSS_DATABASE_URL, max: 2 })
  boss.on('error', (error) => logger.error({ error }, 'Error en pg-boss (sincronizador de cuentas)'))
  await boss.start()
  const latido = iniciarLatido(boss, 'cuentas-idp')
  await boss.createQueue(COLAS.SINCRONIZAR_IDP, { deleteAfterSeconds: SIETE_DIAS_SEGUNDOS })

  if (!env.AUTH_KEYCLOAK_HABILITADO) {
    await boss.unschedule(COLAS.SINCRONIZAR_IDP)
    logger.info('Sincronizador de cuentas en espera: AUTH_KEYCLOAK_HABILITADO=false')
  } else {
    await boss.work(COLAS.SINCRONIZAR_IDP, { localConcurrency: 1 }, async () => {
      const { sincronizarPendientesIdp } = await import('../src/auth/idp/cuentas')
      const resultado = await sincronizarPendientesIdp()
      if (resultado.total > 0) logger.info(resultado, 'Sincronización de cuentas con Keycloak')
    })
    await boss.schedule(COLAS.SINCRONIZAR_IDP, '*/10 * * * *')
    logger.info('Sincronizador de cuentas con Keycloak iniciado')
  }

  process.on('SIGTERM', async () => {
    clearInterval(latido)
    await boss.stop()
    process.exit(0)
  })
}

iniciarSincronizador().catch((error) => {
  logger.error({ error: error instanceof Error ? error.message : error }, 'Error fatal en el sincronizador de cuentas')
  process.exit(1)
})

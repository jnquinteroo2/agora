import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { PgBoss } from 'pg-boss'
import { join } from 'path'
import { env } from '../env'
import { logger } from '../logger'

async function instalarEsquemaPgBoss(): Promise<void> {
  const conexionAdmin = postgres(env.DATABASE_URL_MIGRACIONES, { max: 1 })

  logger.info('Instalando/migrando esquema de pg-boss...')
  const boss = new PgBoss({ connectionString: env.DATABASE_URL_MIGRACIONES })
  await boss.start()
  await boss.stop({ graceful: false })

  await conexionAdmin.unsafe(`
    GRANT USAGE, CREATE ON SCHEMA pgboss TO agora_app;
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA pgboss TO agora_app;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA pgboss TO agora_app;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgboss TO agora_app;
    ALTER DEFAULT PRIVILEGES FOR ROLE agora_migraciones IN SCHEMA pgboss
      GRANT ALL PRIVILEGES ON TABLES TO agora_app;
    ALTER DEFAULT PRIVILEGES FOR ROLE agora_migraciones IN SCHEMA pgboss
      GRANT ALL PRIVILEGES ON SEQUENCES TO agora_app;
    ALTER DEFAULT PRIVILEGES FOR ROLE agora_migraciones IN SCHEMA pgboss
      GRANT EXECUTE ON FUNCTIONS TO agora_app;
  `)
  logger.info('Esquema de pg-boss instalado y privilegios de agora_app otorgados.')

  await conexionAdmin.end()
}

async function migrar(): Promise<void> {
  const conexion = postgres(env.DATABASE_URL_MIGRACIONES, { max: 1 })
  const db = drizzle(conexion)

  logger.info('Aplicando migraciones (esquema y políticas RLS)...')
  await migrate(db, { migrationsFolder: join(__dirname, 'migraciones') })
  logger.info('Migraciones aplicadas correctamente.')

  await conexion.end()

  await instalarEsquemaPgBoss()
}

migrar()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error({ error }, 'Error aplicando migraciones')
    process.exit(1)
  })

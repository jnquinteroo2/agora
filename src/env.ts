import { z } from 'zod'

const esquema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url().startsWith('postgres'),
  DATABASE_URL_MIGRACIONES: z.string().url().startsWith('postgres'),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  PDF_RENDER_BASE_URL: z.string().url(),
  STORAGE_PATH: z.string().min(1),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  SMTP_FROM: z.string().min(1),
  SUPERADMIN_EMAIL: z.string().email(),
  SUPERADMIN_CONTRASENA_INICIAL: z.string().min(12),
  PDF_WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(8).default(2),
  RATE_LIMIT_VENTANA_LOGIN: z.coerce.number().int().positive().default(900),
  RATE_LIMIT_MAX_LOGIN: z.coerce.number().int().positive().default(5),
  PGBOSS_DATABASE_URL: z.string().url().startsWith('postgres'),
})

const omitirValidacion =
  process.env.NEXT_PHASE === 'phase-production-build' ||
  process.env.SKIP_ENV_VALIDATION !== undefined

function cargarEnv(): z.infer<typeof esquema> {
  if (omitirValidacion) return {} as z.infer<typeof esquema>

  const resultado = esquema.safeParse(process.env)
  if (!resultado.success) {
    console.error('Variables de entorno inválidas o faltantes:')
    console.error(resultado.error.flatten().fieldErrors)
    process.exit(1)
  }
  return resultado.data
}

export const env = cargarEnv()

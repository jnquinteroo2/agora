import { readFileSync } from 'fs'
import { z } from 'zod'

const esquema = z
  .object({
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
    AUTH_KEYCLOAK_HABILITADO: z
      .enum(['true', 'false'])
      .default('false')
      .transform((valor) => valor === 'true'),
    KEYCLOAK_EMISOR: z.string().url().optional(),
    KEYCLOAK_URL_INTERNA: z.string().url().optional(),
    KEYCLOAK_CLIENTE_ID: z.string().min(1).optional(),
    KEYCLOAK_CLIENTE_SECRETO: z.string().min(32).optional(),
    KEYCLOAK_ADMIN_CLIENTE_ID: z.string().min(1).default('plataforma-admin'),
    KEYCLOAK_ADMIN_CLIENTE_SECRETO: z.string().min(32).optional(),
  })
  .superRefine((datos, contexto) => {
    if (!datos.AUTH_KEYCLOAK_HABILITADO) return
    for (const clave of [
      'KEYCLOAK_EMISOR',
      'KEYCLOAK_CLIENTE_ID',
      'KEYCLOAK_CLIENTE_SECRETO',
    ] as const) {
      if (!datos[clave]) {
        contexto.addIssue({
          code: 'custom',
          path: [clave],
          message: `Obligatoria cuando AUTH_KEYCLOAK_HABILITADO=true`,
        })
      }
    }
  })

const omitirValidacion =
  process.env.NEXT_PHASE === 'phase-production-build' ||
  process.env.SKIP_ENV_VALIDATION !== undefined

const SECRETOS_EN_ARCHIVO = ['KEYCLOAK_ADMIN_CLIENTE_SECRETO'] as const

function leerSecretosDeArchivo(): void {
  for (const clave of SECRETOS_EN_ARCHIVO) {
    const archivo = process.env[`${clave}_FILE`]
    if (!archivo || process.env[clave]) continue
    try {
      process.env[clave] = readFileSync(archivo, 'utf8').trim()
    } catch {
      console.error(`No se pudo leer ${clave}_FILE (${archivo})`)
      process.exit(1)
    }
  }
}

function cargarEnv(): z.infer<typeof esquema> {
  leerSecretosDeArchivo()
  if (omitirValidacion) return { AUTH_KEYCLOAK_HABILITADO: false } as z.infer<typeof esquema>

  const resultado = esquema.safeParse(process.env)
  if (!resultado.success) {
    console.error('Variables de entorno inválidas o faltantes:')
    console.error(resultado.error.flatten().fieldErrors)
    process.exit(1)
  }
  return resultado.data
}

export const env = cargarEnv()

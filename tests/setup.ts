import { beforeAll, afterAll } from 'vitest'

const vars: Record<string, string> = {
  DATABASE_URL: process.env['TEST_DATABASE_URL'] ?? 'postgres://agora_app:dev@localhost:5432/agora_test',
  DATABASE_URL_MIGRACIONES: process.env['TEST_DATABASE_URL'] ?? 'postgres://agora_app:dev@localhost:5432/agora_test',
  BETTER_AUTH_SECRET: '00000000000000000000000000000000',
  BETTER_AUTH_URL: 'http://localhost:3000',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  STORAGE_PATH: '/tmp/agora-test-storage',
  SMTP_HOST: 'localhost',
  SMTP_PORT: '1025',
  SMTP_USER: 'test',
  SMTP_PASS: 'test',
  SMTP_FROM: 'test@localhost',
  SUPERADMIN_EMAIL: 'admin@test.com',
  SUPERADMIN_CONTRASENA_INICIAL: 'test12345678',
  PGBOSS_DATABASE_URL: process.env['TEST_DATABASE_URL'] ?? 'postgres://agora_app:dev@localhost:5432/agora_test',
}

for (const [k, v] of Object.entries(vars)) {
  if (!process.env[k]) process.env[k] = v
}

beforeAll(() => {})
afterAll(() => {})

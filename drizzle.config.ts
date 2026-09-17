import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/datos/esquema.ts',
  out: './src/datos/migraciones',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env['DATABASE_URL_MIGRACIONES'] ?? '',
  },
  migrations: {
    table: '__drizzle_migraciones',
    schema: 'public',
  },
  verbose: true,
  strict: true,
})

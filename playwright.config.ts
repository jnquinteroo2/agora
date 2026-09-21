import { defineConfig } from '@playwright/test'

try {
  process.loadEnvFile('.env')
} catch {}

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3001',
    trace: 'retain-on-failure',
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    launchOptions: { args: ['--lang=es-CO'] },
  },
})

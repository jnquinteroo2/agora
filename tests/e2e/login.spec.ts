import { test, expect } from '@playwright/test'
import { exigirStackLocal } from './stack-local'

exigirStackLocal()

const correo = process.env.SUPERADMIN_EMAIL ?? ''
const contrasena = process.env.SUPERADMIN_CONTRASENA_INICIAL ?? ''

test('el superadministrador inicia sesión por la interfaz, llega al panel y cierra sesión', async ({
  page,
  context,
}) => {
  test.skip(
    !correo || !contrasena,
    'Faltan SUPERADMIN_EMAIL o SUPERADMIN_CONTRASENA_INICIAL en .env'
  )

  const violaciones: string[] = []
  page.on('console', (mensaje) => {
    if (mensaje.type() === 'error') violaciones.push(mensaje.text())
  })

  await page.goto('/login')
  const campoCorreo = page.locator('input[type="email"]')
  await expect(campoCorreo).toBeVisible()
  await expect(page.getByText('Cargando…')).toHaveCount(0)

  await campoCorreo.fill(correo)
  await page.locator('input[type="password"]').fill(contrasena)
  await page.locator('button[type="submit"]').click()

  await page.waitForURL(/\/panel\//, { timeout: 20_000 })
  const cookies = await context.cookies()
  expect(cookies.map((c) => c.name)).toContain('agora.session_token')

  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await page.waitForURL(/\/login/, { timeout: 20_000 })
  await expect(page.locator('input[type="email"]')).toBeVisible()
  expect((await context.cookies()).map((c) => c.name)).not.toContain('agora.session_token')

  await page.goto('/panel')
  await expect(page).toHaveURL(/\/login/)

  expect(violaciones).toEqual([])
})

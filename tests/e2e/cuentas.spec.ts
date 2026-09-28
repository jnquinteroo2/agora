import { test, expect } from '@playwright/test'
import { exigirStackLocal, urlBase } from './stack-local'
import { sufijo, documentoNuevo, sesionSuperadminLocal } from './keycloak-apoyo'

exigirStackLocal()

test('la contraseña temporal se muestra una sola vez y no vuelve en ninguna página ni respuesta', async ({
  browser,
}) => {
  const contexto = await browser.newContext({ baseURL: urlBase })
  await sesionSuperadminLocal(contexto, urlBase)
  const pagina = await contexto.newPage()
  await pagina.goto('/panel/admin/cuentas')

  const formulario = pagina.locator('form').filter({ has: pagina.getByRole('button', { name: 'Crear cuenta' }) })
  await formulario.getByLabel('Número de documento').fill(documentoNuevo())
  await formulario.getByLabel('Primer nombre').fill('Temporal')
  await formulario.getByLabel('Primer apellido').fill(`E2e ${sufijo()}`)
  await formulario.getByLabel('Perfil').selectOption({ label: 'Estudiante' })
  await formulario.getByLabel('El estudiante no tiene correo propio (excepción)').check()
  await formulario.getByRole('button', { name: 'Crear cuenta' }).click()

  const credencial = pagina.locator('dl').filter({ hasText: 'Contraseña temporal' })
  await expect(credencial).toBeVisible({ timeout: 20_000 })
  const contrasena = (await credencial.locator('dd').nth(1).innerText()).trim()
  expect(contrasena.length).toBeGreaterThanOrEqual(12)

  const cuerpos: string[] = []
  pagina.on('response', async (respuesta) => {
    const tipo = respuesta.headers()['content-type'] ?? ''
    if (/text|json|javascript|x-component/.test(tipo)) {
      cuerpos.push(await respuesta.text().catch(() => ''))
    }
  })

  for (const ruta of [
    '/panel/admin/cuentas',
    '/panel/admin/estudiantes',
    '/panel/admin/profesores',
    '/panel/admin',
  ]) {
    await pagina.goto(ruta)
    await pagina.waitForLoadState('networkidle')
    expect(await pagina.content()).not.toContain(contrasena)
  }
  const api = await contexto.request.get('/api/auth/get-session')
  cuerpos.push(await api.text())

  expect(cuerpos.length).toBeGreaterThan(0)
  for (const cuerpo of cuerpos) expect(cuerpo).not.toContain(contrasena)

  await contexto.close()
})

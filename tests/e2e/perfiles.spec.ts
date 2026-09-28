import { test, expect, type Browser, type Page } from '@playwright/test'
import { mkdirSync } from 'fs'
import { join } from 'path'
import { exigirStackLocal, urlBase } from './stack-local'
import { keycloakHabilitado, sufijo, documentoNuevo } from './keycloak-apoyo'
import { PERFILES } from '../../src/ui/perfiles'

exigirStackLocal()

const contrasena = process.env.SEMILLA_PERFILES_CONTRASENA ?? ''
const dominio = process.env.SEMILLA_PERFILES_DOMINIO ?? ''
const CAPTURAS = join(__dirname, '../../capturas/rediseno/fase4')

test.describe.configure({ mode: 'serial' })
test.skip(!contrasena || !dominio, 'Faltan SEMILLA_PERFILES_CONTRASENA o SEMILLA_PERFILES_DOMINIO en .env')
test.skip(keycloakHabilitado, 'Los usuarios de prueba entran con el formulario local (bandera apagada)')

function correoDe(clave: string) {
  return `prueba.${clave}@${dominio}`
}

let ultimaIp = Math.floor(Math.random() * 150)

async function ingresar(browser: Browser, clave: string, opciones: Parameters<Browser['newContext']>[0] = {}) {
  ultimaIp = (ultimaIp + 1) % 250
  const contexto = await browser.newContext({
    baseURL: urlBase,
    extraHTTPHeaders: { 'x-forwarded-for': `203.0.113.${ultimaIp + 1}` },
    ...opciones,
  })
  const pagina = await contexto.newPage()
  await pagina.goto('/login')
  await pagina.locator('input[type="email"]').fill(correoDe(clave))
  await pagina.locator('input[type="password"]').fill(contrasena)
  await pagina.locator('button[type="submit"]').click()
  await pagina.waitForURL(/\/panel\//, { timeout: 20_000 })
  return { contexto, pagina }
}

for (const perfil of PERFILES) {
  test(`${perfil.nombre} llega a su panel y no entra al de otro perfil`, async ({ browser }) => {
    const { contexto, pagina } = await ingresar(browser, perfil.clave)
    await pagina.goto('/panel')
    await expect(pagina).toHaveURL(new RegExp(`${perfil.ruta}$`))
    await expect(pagina.getByRole('heading', { level: 1 })).toBeVisible()

    for (const otro of PERFILES.filter((p) => p.clave !== perfil.clave)) {
      await pagina.goto(otro.ruta)
      await expect(pagina, `${perfil.nombre} en ${otro.ruta}`).toHaveURL(/\/sin-acceso$/)
    }
    await contexto.close()
  })
}

test('el Administrador crea un Contador y no ve la opción de crear Administrador ni Superadministrador', async ({
  browser,
}) => {
  const { contexto, pagina } = await ingresar(browser, 'admin')
  await pagina.goto('/panel/administrador/cuentas')
  const formulario = pagina.locator('form').filter({ has: pagina.getByRole('button', { name: 'Crear cuenta' }) })
  const opciones = await formulario.getByLabel('Perfil').locator('option').allInnerTexts()
  expect(opciones.sort()).toEqual(['Acudiente', 'Contador', 'Estudiante', 'Profesor', 'Secretaría'])

  const filas = pagina.getByRole('table').getByRole('row')
  await expect(filas.filter({ hasText: 'Superadministrador' })).toHaveCount(0)
  const perfiles = await filas.locator('td:nth-child(3)').allInnerTexts()
  expect(perfiles.filter((texto) => texto.trim() === 'Administrador')).toHaveLength(1)
  const propia = filas.filter({ hasText: correoDe('admin') })
  await expect(propia).toHaveCount(1)
  await expect(propia.getByRole('button', { name: /Desactivar|Cambiar perfil/ })).toHaveCount(0)

  const correo = `contador.${sufijo()}@example.com`
  await formulario.getByLabel('Número de documento').fill(documentoNuevo())
  await formulario.getByLabel('Primer nombre').fill('Contador')
  await formulario.getByLabel('Primer apellido').fill('Creado por Administrador')
  await formulario.getByLabel('Perfil').selectOption({ label: 'Contador' })
  await formulario.getByLabel('Correo de acceso').fill(correo)
  await formulario.getByLabel('Contraseña inicial (mínimo 12 caracteres)').fill(`Contador-${sufijo()}-largo`)
  await formulario.getByRole('button', { name: 'Crear cuenta' }).click()
  await expect(pagina.getByText('Cuenta creada.')).toBeVisible({ timeout: 20_000 })

  await pagina.goto('/panel/admin/cuentas')
  await expect(pagina).toHaveURL(/\/sin-acceso$/)
  await contexto.close()
})

async function capturar(pagina: Page, nombre: string) {
  await pagina.waitForLoadState('networkidle')
  await pagina.screenshot({ path: join(CAPTURAS, `${nombre}.png`), fullPage: true })
}

for (const clave of ['docente', 'estudiante'] as const) {
  test(`capturas del inicio de ${clave}`, async ({ browser }) => {
    mkdirSync(CAPTURAS, { recursive: true })
    const perfil = PERFILES.find((p) => p.clave === clave)!
    const { contexto, pagina } = await ingresar(browser, clave, { reducedMotion: 'reduce' })
    for (const [dispositivo, viewport] of [
      ['escritorio', { width: 1440, height: 900 }],
      ['movil', { width: 390, height: 844 }],
    ] as const) {
      for (const tema of ['claro', 'oscuro'] as const) {
        await pagina.setViewportSize(viewport)
        await pagina.emulateMedia({ colorScheme: tema === 'oscuro' ? 'dark' : 'light' })
        await pagina.evaluate((valor) => localStorage.setItem('agora-tema', valor), tema)
        await pagina.goto(perfil.ruta)
        await expect(pagina.locator('html')).toHaveClass(tema === 'oscuro' ? /dark/ : /^(?!.*dark)/)
        await capturar(pagina, `${dispositivo}-${tema}-panel-${clave}`)
      }
    }
    await contexto.close()
  })
}

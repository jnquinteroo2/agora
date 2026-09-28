import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { exigirStackLocal, urlBase } from './stack-local'
import { keycloakHabilitado, urlKeycloak } from './keycloak-apoyo'
import { PERFILES } from '../../src/ui/perfiles'
import {
  RUTAS_PUBLICAS,
  PANTALLAS_POR_PERFIL,
  TEMAS,
  DISPOSITIVOS,
  contextoConTema,
  ingresarLocal,
  contrasenaDePrueba,
  dominioDePrueba,
} from './apoyo-verificacion'

exigirStackLocal()

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function revisarAxe(pagina: Page, descripcion: string) {
  const resultado = await new AxeBuilder({ page: pagina }).withTags(ETIQUETAS_WCAG).analyze()
  const graves = resultado.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)
  expect(graves, `${descripcion}: violaciones serias o críticas de axe`).toEqual([])
}

function vigilarConsola(pagina: Page): string[] {
  const errores: string[] = []
  pagina.on('console', (mensaje) => {
    if (mensaje.type() !== 'error') return
    const texto = mensaje.text()
    if (/status of 404/.test(texto)) return
    errores.push(texto)
  })
  pagina.on('pageerror', (error) => errores.push(`pageerror: ${error.message}`))
  return errores
}

test.describe('axe en el sitio público y /login', () => {
  for (const tema of TEMAS) {
    for (const [dispositivo, viewport] of DISPOSITIVOS) {
      test(`${tema}, ${dispositivo}`, async ({ browser }) => {
        const contexto = await contextoConTema(browser, tema, viewport)
        const pagina = await contexto.newPage()
        for (const ruta of RUTAS_PUBLICAS) {
          await pagina.goto(ruta, { waitUntil: 'networkidle' })
          await expect(pagina.locator('html')).toHaveClass(tema === 'oscuro' ? /\bdark\b/ : /^(?!.*\bdark\b)/)
          await revisarAxe(pagina, `${ruta} (${tema}, ${dispositivo})`)
        }
        await contexto.close()
      })
    }
  }
})

test.describe('axe, consola y CSP en los siete paneles', () => {
  test.skip(!contrasenaDePrueba || !dominioDePrueba, 'Faltan SEMILLA_PERFILES_CONTRASENA o SEMILLA_PERFILES_DOMINIO')
  test.skip(keycloakHabilitado, 'Los usuarios de prueba entran con el formulario local (bandera apagada)')

  for (const [clave, pantallas] of Object.entries(PANTALLAS_POR_PERFIL)) {
    test(`${clave}`, async ({ browser }) => {
      for (const tema of TEMAS) {
        for (const [dispositivo, viewport] of DISPOSITIVOS) {
          const contexto = await contextoConTema(browser, tema, viewport)
          await ingresarLocal(contexto, clave)
          const pagina = await contexto.newPage()
          const errores = vigilarConsola(pagina)
          for (const ruta of pantallas) {
            await pagina.goto(ruta, { waitUntil: 'networkidle' })
            await expect(pagina).toHaveURL(new RegExp(`${ruta}$`))
            await revisarAxe(pagina, `${ruta} (${tema}, ${dispositivo})`)
          }
          expect(errores, `${clave} (${tema}, ${dispositivo}): errores de consola, CSP o hidratación`).toEqual([])
          await contexto.close()
        }
      }
    })
  }
})

test.describe('axe en el tema de Keycloak', () => {
  const autorizacion = `${urlKeycloak}/protocol/openid-connect/auth?${new URLSearchParams({
    client_id: 'plataforma-agora',
    response_type: 'code',
    scope: 'openid',
    redirect_uri: `${urlBase}/api/auth/callback/keycloak`,
    code_challenge: 'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopq',
    code_challenge_method: 'S256',
    state: 'verificacion',
  })}`

  for (const tema of TEMAS) {
    for (const [dispositivo, viewport] of DISPOSITIVOS) {
      test(`${tema}, ${dispositivo}`, async ({ browser }) => {
        const contexto = await contextoConTema(browser, tema, viewport)
        const pagina = await contexto.newPage()
        const errores = vigilarConsola(pagina)
        await pagina.goto(autorizacion)
        await expect(pagina.locator('#username')).toBeVisible()
        await revisarAxe(pagina, `ingreso de Keycloak (${tema}, ${dispositivo})`)

        await pagina.locator('#username').fill(`nadie.${Date.now()}@example.com`)
        await pagina.locator('#password').fill('una-contrasena-equivocada')
        await pagina.locator('#kc-login').click()
        await expect(pagina.locator('#agora-error-credenciales, .agora-aviso').first()).toBeVisible()
        await revisarAxe(pagina, `ingreso de Keycloak con error (${tema}, ${dispositivo})`)

        await pagina.goto(`${urlKeycloak}/login-actions/reset-credentials?client_id=plataforma-agora`)
        await revisarAxe(pagina, `restablecer contraseña en Keycloak (${tema}, ${dispositivo})`)
        expect(errores, `Keycloak (${tema}, ${dispositivo}): errores de consola`).toEqual([])
        await contexto.close()
      })
    }
  }
})

test('/login no muestra los perfiles internos', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Ingresar a la plataforma' })).toBeVisible()
  await expect(page.getByRole('radio')).toHaveCount(0)
  for (const perfil of PERFILES) {
    await expect(page.getByText(perfil.nombre, { exact: true })).toHaveCount(0)
  }
})

test('el tema se aplica antes de hidratar, persiste al recargar y sigue al sistema si nadie eligió', async ({
  browser,
}) => {
  const contexto = await browser.newContext({ baseURL: urlBase, colorScheme: 'light' })
  const pagina = await contexto.newPage()
  await pagina.goto('/inicio')
  await expect(pagina.locator('html')).not.toHaveClass(/\bdark\b/)

  await pagina.getByRole('button', { name: 'Cambiar a modo oscuro' }).first().click()
  await expect(pagina.locator('html')).toHaveClass(/\bdark\b/)
  expect(await pagina.evaluate(() => localStorage.getItem('agora-tema'))).toBe('oscuro')

  await pagina.route(/\/_next\/static\/chunks\//, (ruta) => ruta.abort())
  await pagina.goto('/institucion', { waitUntil: 'domcontentloaded' })
  await expect(pagina.locator('html')).toHaveClass(/\bdark\b/)
  expect(await pagina.evaluate(() => document.documentElement.style.colorScheme)).toBe('dark')
  await pagina.unroute(/\/_next\/static\/chunks\//)

  const sistema = await browser.newContext({ baseURL: urlBase, colorScheme: 'light' })
  const otra = await sistema.newPage()
  await otra.goto('/inicio')
  await expect(otra.locator('html')).not.toHaveClass(/\bdark\b/)
  await otra.emulateMedia({ colorScheme: 'dark' })
  await expect(otra.locator('html')).toHaveClass(/\bdark\b/)

  await contexto.close()
  await sistema.close()
})

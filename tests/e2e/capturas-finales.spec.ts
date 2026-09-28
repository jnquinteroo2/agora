import { test, expect } from '@playwright/test'
import { mkdirSync } from 'fs'
import { join } from 'path'
import { exigirStackLocal, urlBase } from './stack-local'
import { keycloakHabilitado, urlKeycloak } from './keycloak-apoyo'
import { PERFILES } from '../../src/ui/perfiles'
import { RUTAS_PUBLICAS, TEMAS, DISPOSITIVOS, contextoConTema, ingresarLocal } from './apoyo-verificacion'

exigirStackLocal()

const CARPETA = join(__dirname, '../../capturas/rediseno/despues')

test.describe.configure({ mode: 'serial' })
test.skip(process.env.E2E_CAPTURAS !== '1', 'Las capturas finales se toman con E2E_CAPTURAS=1')

function nombreDe(ruta: string): string {
  return ruta.replace(/^\//, '').replace(/\//g, '-') || 'raiz'
}

for (const tema of TEMAS) {
  for (const [dispositivo, viewport] of DISPOSITIVOS) {
    test(`sitio público, /login y Keycloak (${tema}, ${dispositivo})`, async ({ browser }) => {
      test.setTimeout(300_000)
      mkdirSync(CARPETA, { recursive: true })
      const contexto = await contextoConTema(browser, tema, viewport)
      const pagina = await contexto.newPage()
      for (const ruta of RUTAS_PUBLICAS) {
        await pagina.goto(ruta, { waitUntil: 'networkidle' })
        await pagina.screenshot({ path: join(CARPETA, `${dispositivo}-${tema}-${nombreDe(ruta)}.png`), fullPage: true })
      }
      await pagina.goto('/sin-acceso', { waitUntil: 'networkidle' })
      await pagina.screenshot({ path: join(CARPETA, `${dispositivo}-${tema}-sin-acceso.png`), fullPage: true })

      await pagina.goto(
        `${urlKeycloak}/protocol/openid-connect/auth?${new URLSearchParams({
          client_id: 'plataforma-agora',
          response_type: 'code',
          scope: 'openid',
          redirect_uri: `${urlBase}/api/auth/callback/keycloak`,
          code_challenge: 'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopq',
          code_challenge_method: 'S256',
          state: 'capturas',
        })}`
      )
      await expect(pagina.locator('#username')).toBeVisible()
      await pagina.screenshot({ path: join(CARPETA, `${dispositivo}-${tema}-keycloak-ingreso.png`), fullPage: true })
      await pagina.locator('#username').fill('nadie@example.com')
      await pagina.locator('#password').fill('una-contrasena-equivocada')
      await pagina.locator('#kc-login').click()
      await expect(pagina.locator('#agora-error-credenciales, .agora-aviso').first()).toBeVisible()
      await pagina.screenshot({ path: join(CARPETA, `${dispositivo}-${tema}-keycloak-error.png`), fullPage: true })
      await contexto.close()
    })

    test(`inicio de los siete paneles (${tema}, ${dispositivo})`, async ({ browser }) => {
      test.skip(keycloakHabilitado, 'Los usuarios de prueba entran con el formulario local')
      test.setTimeout(300_000)
      mkdirSync(CARPETA, { recursive: true })
      for (const perfil of PERFILES) {
        const contexto = await contextoConTema(browser, tema, viewport)
        await ingresarLocal(contexto, perfil.clave)
        const pagina = await contexto.newPage()
        await pagina.goto(perfil.ruta, { waitUntil: 'networkidle' })
        await pagina.screenshot({
          path: join(CARPETA, `${dispositivo}-${tema}-panel-${perfil.clave}.png`),
          fullPage: true,
        })
        await contexto.close()
      }
    })
  }
}

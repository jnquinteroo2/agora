import { test, expect } from '@playwright/test'
import { exigirStackLocal } from './stack-local'

exigirStackLocal()

const RUTAS = [
  '/inicio',
  '/institucion',
  '/modelo-clei',
  '/oferta',
  '/admisiones',
  '/contacto',
  '/blog',
  '/blog/bienvenida',
  '/galeria',
  '/galeria/album-de-prueba',
  '/aliados',
  '/privacidad',
  '/cookies',
  '/terminos',
  '/accesibilidad',
  '/login',
]

const RUTA_INEXISTENTE = '/esta-pagina-no-existe'

async function revisar(
  page: import('@playwright/test').Page,
  ruta: string,
  estadoEsperado: number
) {
  const errores: string[] = []
  page.on('console', (mensaje) => {
    if (mensaje.type() !== 'error') return
    const texto = mensaje.text()
    if (estadoEsperado === 404 && /status of 404/.test(texto)) return
    errores.push(texto)
  })
  page.on('pageerror', (error) => errores.push(`pageerror: ${error.message}`))

  await page.addInitScript(() => {
    const registro: string[] = []
    Object.defineProperty(window, '__violacionesCsp', { value: registro })
    document.addEventListener('securitypolicyviolation', (evento) => {
      registro.push(`${evento.violatedDirective} ${evento.blockedURI}`)
    })
  })

  const respuesta = await page.goto(ruta, { waitUntil: 'networkidle' })
  expect(respuesta?.status(), `${ruta} respondió con otro estado`).toBe(estadoEsperado)
  await page.waitForTimeout(500)

  const violaciones = await page.evaluate(
    () => (window as unknown as { __violacionesCsp: string[] }).__violacionesCsp
  )
  const scriptsSinNonce = await page.evaluate(
    () =>
      [...document.querySelectorAll('script')].filter(
        (script) =>
          !script.nonce && !script.getAttribute('nonce') && script.type !== 'application/json'
      ).length
  )

  expect(violaciones, `${ruta}: violaciones de CSP`).toEqual([])
  expect(errores, `${ruta}: errores de consola`).toEqual([])
  expect(scriptsSinNonce, `${ruta}: scripts sin nonce`).toBe(0)
}

for (const ruta of RUTAS) {
  test(`${ruta} carga sin violaciones de CSP ni errores de consola`, async ({ page }) => {
    await revisar(page, ruta, 200)
  })
}

test('una URL inexistente muestra el 404 del sitio sin violaciones de CSP', async ({ page }) => {
  await revisar(page, RUTA_INEXISTENTE, 404)
  await expect(page.getByRole('heading', { level: 1, name: 'Esta página no existe' })).toBeVisible()
})

import { test, expect } from '@playwright/test'
import { exigirStackLocal } from './stack-local'

exigirStackLocal()

test('admisión: al enviar con errores el foco va al resumen y cada enlace lleva a su campo', async ({ page }) => {
  await page.goto('/admisiones')
  const enviar = page.getByRole('button', { name: /Enviar/ })
  await enviar.focus()
  await page.keyboard.press('Enter')

  const resumen = page.locator('[aria-labelledby="titulo-resumen"]')
  await expect(resumen).toBeVisible()
  await expect(resumen).toBeFocused()

  const enlaces = resumen.getByRole('link')
  expect(await enlaces.count()).toBeGreaterThan(0)
  const primero = enlaces.first()
  const destino = (await primero.getAttribute('href'))!.replace('#', '')
  await primero.focus()
  await page.keyboard.press('Enter')
  const campo = page.locator(`[id="${destino}"]`)
  await expect(campo).toBeFocused()
  await expect(campo).toHaveAttribute('aria-invalid', 'true')
  const descrito = await campo.getAttribute('aria-describedby')
  expect(descrito).toBeTruthy()
})

test('galería: el visor se abre con Enter, avanza con flechas, retiene el foco y Escape lo devuelve a la miniatura', async ({
  page,
}) => {
  await page.goto('/galeria/album-de-prueba')
  const miniaturas = page.locator('main button:has(img)')
  const total = await miniaturas.count()
  test.skip(total < 2, 'El álbum de prueba necesita al menos dos fotografías')

  await miniaturas.first().focus()
  await page.keyboard.press('Enter')
  const visor = page.getByRole('dialog')
  await expect(visor).toBeVisible()

  const imagen = visor.locator('img').first()
  const antes = await imagen.getAttribute('src')
  await page.keyboard.press('ArrowRight')
  await expect(imagen).not.toHaveAttribute('src', antes!)

  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab')
    expect(await visor.evaluate((nodo) => nodo.contains(document.activeElement))).toBe(true)
  }

  await page.keyboard.press('Escape')
  await expect(visor).toBeHidden()
  const enfocada = await page.evaluate(() => document.activeElement?.tagName)
  expect(enfocada).toBe('BUTTON')
  expect(await page.evaluate(() => !!document.activeElement?.querySelector('img'))).toBe(true)
})

test('ninguna página pública se desborda a lo ancho a 390 píxeles', async ({ browser }) => {
  const contexto = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const pagina = await contexto.newPage()
  for (const ruta of ['/inicio', '/institucion', '/modelo-clei', '/oferta', '/admisiones', '/contacto', '/blog', '/galeria', '/aliados', '/privacidad', '/cookies', '/terminos', '/accesibilidad', '/login']) {
    await pagina.goto(`${process.env.E2E_BASE_URL ?? 'http://localhost:3001'}${ruta}`, { waitUntil: 'networkidle' })
    const desborde = await pagina.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(desborde, `${ruta} se desborda`).toBeLessThanOrEqual(0)
  }
  await contexto.close()
})

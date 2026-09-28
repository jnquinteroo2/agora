import { test, expect, type Browser, type Page } from '@playwright/test'
import postgres from 'postgres'
import { fechaDeHoyEnBogota } from '../../src/dominio/admision'
import { exigirStackLocal, urlSuperusuario } from './stack-local'

exigirStackLocal()

const sql = postgres(urlSuperusuario, { max: 1 })
const radicados: string[] = []

test.afterAll(async () => {
  if (radicados.length > 0) {
    await sql`DELETE FROM aspirante WHERE radicado IN ${sql(radicados)}`
  }
  await sql.end()
})

function desplazar(fecha: string, anios: number, dias = 0): string {
  const [a, m, d] = fecha.split('-').map(Number)
  return new Date(Date.UTC(a! + anios, m! - 1, d! + dias)).toISOString().slice(0, 10)
}

async function abrirFormulario(pagina: Page, fechaNacimiento: string) {
  await pagina.goto('/admisiones')
  await pagina.getByLabel('Primer nombre').fill('Prueba')
  await pagina.getByLabel('Primer apellido').fill('Acudiente')
  await pagina.getByLabel('Tipo de documento').selectOption('CC')
  await pagina.getByLabel('Número de documento').fill(`E2E${Date.now().toString().slice(-9)}`)
  if (fechaNacimiento) await pagina.getByLabel('Fecha de nacimiento').fill(fechaNacimiento)
  await pagina.getByLabel('Ciclo al que aspira').selectOption({ index: 1 })
  await pagina.locator('input[name="jornadaId"]').first().check()
  await pagina.locator('#campo-autorizacionDatos').check()
}

function contextoConIp(browser: Browser) {
  const ip = `198.51.100.${Math.floor(Math.random() * 200) + 30}`
  return browser.newContext({ extraHTTPHeaders: { 'x-forwarded-for': ip } })
}

const hoy = fechaDeHoyEnBogota()

test('quien cumple 18 hoy se inscribe sin acudiente, con teléfono propio', async ({ browser }) => {
  const contexto = await contextoConIp(browser)
  const pagina = await contexto.newPage()
  await abrirFormulario(pagina, desplazar(hoy, -18))
  await expect(
    pagina.getByText('El aspirante es mayor de edad: registrar un acudiente es opcional.')
  ).toBeVisible()
  await pagina.getByLabel('Teléfono del aspirante').fill('3004445566')
  await pagina.waitForTimeout(3_500)
  await pagina.getByRole('button', { name: 'Enviar solicitud' }).click()
  await expect(pagina.getByRole('heading', { level: 1, name: 'Solicitud recibida' })).toBeVisible({
    timeout: 15_000,
  })
  const radicado = (await pagina.locator('#radicado').textContent())?.trim() ?? ''
  radicados.push(radicado)
  const [fila] = await sql<{ telefono: string | null; acudiente: string | null }[]>`
    SELECT datos_formulario->>'telefonoAspirante' AS telefono,
           datos_formulario->>'nombreAcudiente' AS acudiente
    FROM aspirante WHERE radicado = ${radicado}
  `
  expect(fila).toEqual({ telefono: '3004445566', acudiente: null })
  await contexto.close()
})

test('quien cumple 18 mañana no puede enviar la solicitud sin acudiente', async ({ browser }) => {
  const contexto = await contextoConIp(browser)
  const pagina = await contexto.newPage()
  await abrirFormulario(pagina, desplazar(hoy, -18, 1))
  await expect(
    pagina.getByText('El aspirante es menor de 18 años: el acudiente es obligatorio', {
      exact: false,
    })
  ).toBeVisible()
  await pagina.getByRole('button', { name: 'Enviar solicitud' }).click()
  const resumen = pagina.getByRole('alert').filter({ hasText: 'datos por corregir' })
  await expect(resumen).toBeFocused()
  await expect(resumen.getByRole('link', { name: /nombre completo del acudiente/ })).toBeVisible()
  await expect(resumen.getByRole('link', { name: /teléfono del acudiente/ })).toBeVisible()
  await contexto.close()
})

test('una fecha de nacimiento futura se rechaza', async ({ browser }) => {
  const contexto = await contextoConIp(browser)
  const pagina = await contexto.newPage()
  await abrirFormulario(pagina, desplazar(hoy, 0, 1))
  await pagina.getByLabel('Nombre del acudiente').fill('Marta Rincón')
  await pagina.getByLabel('Teléfono del acudiente').fill('3001234567')
  await pagina.getByRole('button', { name: 'Enviar solicitud' }).click()
  await expect(pagina.locator('#error-fechaNacimiento')).toHaveText(
    'La fecha de nacimiento no puede ser posterior a hoy.'
  )
  await contexto.close()
})

test('sin fecha de nacimiento se pide la fecha y el acudiente', async ({ browser }) => {
  const contexto = await contextoConIp(browser)
  const pagina = await contexto.newPage()
  await abrirFormulario(pagina, '')
  await pagina.getByRole('button', { name: 'Enviar solicitud' }).click()
  await expect(pagina.locator('#error-fechaNacimiento')).toHaveText(
    'Indique la fecha de nacimiento.'
  )
  await expect(pagina.locator('#error-nombreAcudiente')).toBeVisible()
  await contexto.close()
})

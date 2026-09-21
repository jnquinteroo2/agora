import { test, expect } from '@playwright/test'
import postgres from 'postgres'
import { POLITICA_DATOS } from '../../src/legal/versiones'
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

test('una solicitud real de admisión queda guardada con el radicado que ve el aspirante', async ({
  browser,
}) => {
  const ip = `198.51.100.${Math.floor(Math.random() * 200) + 30}`
  const documento = `E2E${Date.now().toString().slice(-9)}`
  const contexto = await browser.newContext({ extraHTTPHeaders: { 'x-forwarded-for': ip } })
  const pagina = await contexto.newPage()

  await pagina.goto('/admisiones')
  await expect(
    pagina.getByRole('heading', { level: 1, name: 'Formulario de inscripción' })
  ).toBeVisible()

  await pagina.getByLabel('Primer nombre').fill('Prueba')
  await pagina.getByLabel('Primer apellido').fill('Punta a punta')
  await pagina.getByLabel('Tipo de documento').selectOption('TI')
  await pagina.getByLabel('Número de documento').fill(documento)
  await pagina.getByLabel('Fecha de nacimiento').fill('2004-05-12')
  await pagina.getByLabel('Ciclo al que aspira').selectOption({ index: 1 })
  await pagina.locator('input[name="jornadaId"]').first().check()
  await pagina.getByLabel('Nombre del acudiente').fill('Acudiente de prueba')
  await pagina.getByLabel('Teléfono del acudiente').fill('3000000000')
  await pagina.locator('#campo-autorizacionDatos').check()

  await pagina.waitForTimeout(3_500)
  await pagina.getByRole('button', { name: 'Enviar solicitud' }).click()

  const titulo = pagina.getByRole('heading', { level: 1, name: 'Solicitud recibida' })
  await expect(titulo).toBeVisible({ timeout: 15_000 })
  await expect(titulo).toBeFocused()

  await expect(pagina.getByText('Formulario de inscripción')).toHaveCount(0)

  const radicado = (await pagina.locator('#radicado').textContent())?.trim() ?? ''
  expect(radicado).toMatch(/^RAD-\d{4}-\d{4,}$/)
  radicados.push(radicado)

  const filas = await sql<
    { id: string; radicado: string; documento: string; autorizacion: boolean; version: string }[]
  >`
    SELECT id::text AS id,
           radicado,
           datos_formulario->>'numeroDocumento' AS documento,
           autorizacion_datos AS autorizacion,
           autorizacion_version AS version
    FROM aspirante
    WHERE radicado = ${radicado}
  `
  expect(filas).toHaveLength(1)
  const [fila] = filas
  expect(fila).toMatchObject({
    radicado,
    documento,
    autorizacion: true,
    version: POLITICA_DATOS.version,
  })
  expect(fila!.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)

  await contexto.close()
})

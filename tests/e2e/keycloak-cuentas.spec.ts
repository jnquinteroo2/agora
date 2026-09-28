import { test, expect, type Page } from '@playwright/test'
import { exigirStackLocal, urlBase } from './stack-local'
import {
  keycloakHabilitado,
  urlKeycloak,
  sufijo,
  contrasenaNueva,
  documentoNuevo,
  sesionSuperadminLocal,
  enlaceDeInvitacion,
  definirContrasena,
  configurarTotp,
  ingresarConKeycloak,
  usuariosKeycloak,
  sesionesKeycloak,
  invitacion,
  accionesRequeridasKeycloak,
  tokenServicio,
  nuevoContexto,
  urlAdminKeycloak,
} from './keycloak-apoyo'

exigirStackLocal()

test.describe.configure({ mode: 'serial' })
test.skip(!keycloakHabilitado, 'Requiere AUTH_KEYCLOAK_HABILITADO=true en .env y en el contenedor web')

async function crearCuentaDesdePanel(
  pagina: Page,
  datos: { nombre: string; apellido: string; perfil: string; correo?: string; sinCorreo?: boolean; documento?: string }
) {
  await pagina.goto('/panel/admin/cuentas')
  const formulario = pagina.locator('form').filter({ has: pagina.getByRole('button', { name: 'Crear cuenta' }) })
  await formulario.getByLabel('Número de documento').fill(datos.documento ?? documentoNuevo())
  await formulario.getByLabel('Primer nombre').fill(datos.nombre)
  await formulario.getByLabel('Primer apellido').fill(datos.apellido)
  await formulario.getByLabel('Perfil').selectOption({ label: datos.perfil })
  if (datos.sinCorreo) {
    await formulario.getByLabel('El estudiante no tiene correo propio (excepción)').check()
  } else {
    await formulario.getByLabel('Correo de acceso').fill(datos.correo!)
  }
  await formulario.getByRole('button', { name: 'Crear cuenta' }).click()
}

async function filaDe(pagina: Page, texto: string) {
  await pagina.goto('/panel/admin/cuentas')
  return pagina.getByRole('row').filter({ hasText: texto }).first()
}

test('Profesor: invitación, contraseña propia, su panel, baja, alta y cambio de correo', async ({
  browser,
}) => {
  const id = sufijo()
  const correo = `docente.${id}@example.com`
  const correoNuevo = `docente.nuevo.${id}@example.com`
  const contrasena = contrasenaNueva()

  const admin = await nuevoContexto(browser, urlBase)
  await sesionSuperadminLocal(admin, urlBase)
  const panel = await admin.newPage()

  const desde = new Date()
  await crearCuentaDesdePanel(panel, { nombre: 'Docente', apellido: `E2e ${id}`, perfil: 'Profesor', correo })
  await expect(panel.getByText('Se envió la invitación al correo de acceso.')).toBeVisible({ timeout: 20_000 })

  const [enKeycloak] = await usuariosKeycloak({ email: correo, exact: 'true' })
  expect(enKeycloak?.enabled).toBe(true)

  const enlace = await enlaceDeInvitacion(correo, desde)
  const persona = await nuevoContexto(browser, urlBase)
  const pagina = await persona.newPage()
  const violacionesCsp: string[] = []
  pagina.on('console', (mensaje) => {
    if (mensaje.type() === 'error' && /Content Security Policy/i.test(mensaje.text())) {
      violacionesCsp.push(`${pagina.url()}: ${mensaje.text()}`)
    }
  })
  await pagina.goto(enlace)
  const continuar = pagina.getByRole('link', { name: /Haga clic aquí|Continuar/ })
  if (await continuar.count()) await continuar.first().click()
  await definirContrasena(pagina, contrasena)
  await expect(pagina.getByText('Su cuenta quedó actualizada.')).toBeVisible({ timeout: 20_000 })

  await ingresarConKeycloak(pagina, correo, contrasena)
  await pagina.waitForURL(/\/panel\/docente/, { timeout: 20_000 })
  expect(violacionesCsp).toEqual([])

  expect(await sesionesKeycloak(enKeycloak!.id)).toBeGreaterThan(0)
  const fila = await filaDe(panel, correo)
  await fila.getByRole('button', { name: 'Desactivar' }).click()
  await expect(fila.getByText('Cuenta desactivada.')).toBeVisible({ timeout: 20_000 })
  const [desactivado] = await usuariosKeycloak({ email: correo, exact: 'true' })
  expect(desactivado?.enabled).toBe(false)
  expect(await sesionesKeycloak(enKeycloak!.id)).toBe(0)

  await pagina.goto('/panel/docente')
  await expect(pagina).toHaveURL(/\/login/)
  await pagina.getByRole('button', { name: 'Ingresar de forma segura' }).click()
  await pagina.waitForURL((url) => url.href.startsWith(urlKeycloak), { timeout: 20_000 })
  await expect(pagina.locator('#username')).toBeVisible()
  await pagina.locator('#username').fill(correo)
  await pagina.locator('#password').fill(contrasena)
  await pagina.locator('#kc-login').click()
  await expect(pagina).toHaveURL(new RegExp(`^${urlKeycloak}`))
  await expect(pagina.locator('#agora-error-credenciales, .agora-aviso').first()).toBeVisible()

  const filaInactiva = await filaDe(panel, correo)
  await filaInactiva.getByRole('button', { name: 'Activar' }).click()
  await expect(filaInactiva.getByText('Cuenta activada.')).toBeVisible({ timeout: 20_000 })

  const filaCorreo = await filaDe(panel, correo)
  await filaCorreo.getByRole('button', { name: 'Cambiar correo' }).click()
  const formularioCorreo = panel.locator('form').filter({ has: panel.getByRole('button', { name: 'Guardar correo' }) })
  await formularioCorreo.getByLabel('Correo nuevo').fill(correoNuevo)
  await formularioCorreo.getByRole('button', { name: 'Guardar correo' }).click()
  await expect(panel.getByRole('row').filter({ hasText: correoNuevo })).toBeVisible({ timeout: 20_000 })
  expect(await usuariosKeycloak({ email: correoNuevo, exact: 'true' })).toHaveLength(1)

  const otra = await nuevoContexto(browser, urlBase)
  const paginaNueva = await otra.newPage()
  await ingresarConKeycloak(paginaNueva, correoNuevo, contrasena)
  await paginaNueva.waitForURL(/\/panel\/docente/, { timeout: 20_000 })

  await admin.close()
  await persona.close()
  await otra.close()
})

test('Superadministrador nuevo: la invitación exige contraseña y TOTP', async ({ browser }) => {
  const id = sufijo()
  const correo = `super.${id}@example.com`
  const contrasena = contrasenaNueva()

  const admin = await nuevoContexto(browser, urlBase)
  await sesionSuperadminLocal(admin, urlBase)
  const panel = await admin.newPage()
  const desde = new Date()
  await crearCuentaDesdePanel(panel, {
    nombre: 'Super',
    apellido: `E2e ${id}`,
    perfil: 'Superadministrador',
    correo,
  })
  await expect(panel.getByText('Se envió la invitación al correo de acceso.')).toBeVisible({ timeout: 20_000 })

  const correoRecibido = await invitacion(correo, desde)
  expect(correoRecibido.texto).toContain(
    'definir su contraseña y configurar la verificación en dos pasos con una aplicación de autenticación'
  )
  const enlace = correoRecibido.enlace
  const persona = await nuevoContexto(browser, urlBase)
  const pagina = await persona.newPage()
  await pagina.goto(enlace)
  const continuar = pagina.getByRole('link', { name: /Haga clic aquí|Continuar/ })
  if (await continuar.count()) await continuar.first().click()
  let secreto = ''
  for (let paso = 0; paso < 2; paso++) {
    if (await pagina.locator('#password-new').isVisible().catch(() => false)) {
      await definirContrasena(pagina, contrasena)
    } else {
      secreto = await configurarTotp(pagina)
    }
    await pagina.waitForLoadState('networkidle')
  }
  expect(secreto).not.toBe('')

  const otra = await nuevoContexto(browser, urlBase)
  const ingreso = await otra.newPage()
  await new Promise((listo) => setTimeout(listo, 31_000))
  await ingresarConKeycloak(ingreso, correo, contrasena, secreto)
  await ingreso.waitForURL(/\/panel\/admin/, { timeout: 20_000 })

  const fila = await filaDe(panel, correo)
  await fila.getByRole('button', { name: 'Desactivar' }).click()
  await expect(fila.getByText('Cuenta desactivada.')).toBeVisible({ timeout: 20_000 })

  await admin.close()
  await persona.close()
  await otra.close()
})

test('Estudiante sin correo: credencial temporal y cambio obligatorio en el primer ingreso', async ({
  browser,
}) => {
  const id = sufijo()
  const admin = await nuevoContexto(browser, urlBase)
  await sesionSuperadminLocal(admin, urlBase)
  const panel = await admin.newPage()
  await crearCuentaDesdePanel(panel, {
    nombre: 'Estudiante',
    apellido: `E2e ${id}`,
    perfil: 'Estudiante',
    sinCorreo: true,
  })
  const credencial = panel.locator('dl').filter({ hasText: 'Contraseña temporal' })
  await expect(credencial).toBeVisible({ timeout: 20_000 })
  const valores = await credencial.locator('dd').allInnerTexts()
  const [usuario, temporal] = valores.map((v) => v.trim())
  expect(usuario).toMatch(/^est-[a-z2-9]{8}$/)

  const persona = await nuevoContexto(browser, urlBase)
  const pagina = await persona.newPage()
  await ingresarConKeycloak(pagina, usuario!, temporal!)
  await definirContrasena(pagina, contrasenaNueva())
  await pagina.waitForURL(/\/panel\/estudiante/, { timeout: 20_000 })

  await admin.close()
  await persona.close()
})

test('Si la base falla después de crear en Keycloak, el usuario de Keycloak se borra', async ({
  browser,
}) => {
  const id = sufijo()
  const documento = documentoNuevo()
  const admin = await nuevoContexto(browser, urlBase)
  await sesionSuperadminLocal(admin, urlBase)
  const panel = await admin.newPage()

  await crearCuentaDesdePanel(panel, {
    nombre: 'Uno',
    apellido: `E2e ${id}`,
    perfil: 'Profesor',
    correo: `uno.${id}@example.com`,
    documento,
  })
  await expect(panel.getByText('Cuenta creada.')).toBeVisible({ timeout: 20_000 })

  const correoFallido = `dos.${id}@example.com`
  await crearCuentaDesdePanel(panel, {
    nombre: 'Dos',
    apellido: `E2e ${id}`,
    perfil: 'Profesor',
    correo: correoFallido,
    documento,
  })
  await expect(panel.getByText('Ya existe una persona registrada con ese tipo y número de documento.')).toBeVisible({
    timeout: 20_000,
  })
  expect(await usuariosKeycloak({ email: correoFallido, exact: 'true' })).toHaveLength(0)

  await admin.close()
})

test('La consola de cuenta está deshabilitada; la persona no puede ver ni editar agora_usuario_id', async ({
  browser,
}) => {
  const id = sufijo()
  const correo = `consola.${id}@example.com`
  const contrasena = contrasenaNueva()
  const admin = await nuevoContexto(browser, urlBase)
  await sesionSuperadminLocal(admin, urlBase)
  const panel = await admin.newPage()
  const desde = new Date()
  await crearCuentaDesdePanel(panel, { nombre: 'Consola', apellido: `E2e ${id}`, perfil: 'Profesor', correo })
  await expect(panel.getByText('Se envió la invitación al correo de acceso.')).toBeVisible({ timeout: 20_000 })
  const enlace = await enlaceDeInvitacion(correo, desde)

  const persona = await nuevoContexto(browser, urlBase)
  const pagina = await persona.newPage()
  await pagina.goto(enlace)
  const continuar = pagina.getByRole('link', { name: /Haga clic aquí|Continuar/ })
  if (await continuar.count()) await continuar.first().click()
  await definirContrasena(pagina, contrasena)
  await expect(pagina.getByText('Su cuenta quedó actualizada.')).toBeVisible({ timeout: 20_000 })

  await ingresarConKeycloak(pagina, correo, contrasena)
  await pagina.waitForURL(/\/panel\/docente/, { timeout: 20_000 })

  const consola = await pagina.goto(`${urlKeycloak}/account/`)
  expect(consola?.status()).toBe(404)
  await pagina.goto(
    `${urlKeycloak}/protocol/openid-connect/auth?${new URLSearchParams({
      client_id: 'account-console',
      response_type: 'code',
      redirect_uri: `${urlKeycloak}/account/`,
      code_challenge: 'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopq',
      code_challenge_method: 'S256',
    })}`
  )
  await expect(pagina.getByRole('heading', { name: 'No fue posible continuar' })).toBeVisible()

  const [usuarioKc] = await usuariosKeycloak({ email: correo, exact: 'true' })
  expect(usuarioKc!.attributes?.['agora_usuario_id']?.[0]).toMatch(/^[0-9a-f-]{36}$/)
  const token = await tokenServicio()
  const perfil = (await (
    await fetch(urlAdminKeycloak('/users/profile'), { headers: { Authorization: `Bearer ${token}` } })
  ).json()) as { attributes: Array<{ name: string; permissions: { view: string[]; edit: string[] } }> }
  expect(perfil.attributes.find((a) => a.name === 'agora_usuario_id')?.permissions).toEqual({
    view: ['admin'],
    edit: ['admin'],
  })

  await admin.close()
  await persona.close()
})

test('Subir a un perfil con TOTP obligatorio o pedirlo desde el panel agrega CONFIGURE_TOTP en Keycloak', async ({
  browser,
}) => {
  const id = sufijo()
  const admin = await nuevoContexto(browser, urlBase)
  await sesionSuperadminLocal(admin, urlBase)
  const panel = await admin.newPage()

  const correoAscenso = `ascenso.${id}@example.com`
  await crearCuentaDesdePanel(panel, { nombre: 'Ascenso', apellido: `E2e ${id}`, perfil: 'Profesor', correo: correoAscenso })
  await expect(panel.getByText('Cuenta creada.')).toBeVisible({ timeout: 20_000 })
  const [cuentaAscenso] = await usuariosKeycloak({ email: correoAscenso, exact: 'true' })
  expect(await accionesRequeridasKeycloak(cuentaAscenso!.id)).not.toContain('CONFIGURE_TOTP')

  const fila = await filaDe(panel, correoAscenso)
  await fila.getByRole('button', { name: 'Cambiar perfil' }).click()
  const formulario = panel.locator('form').filter({ has: panel.getByRole('button', { name: 'Guardar perfil' }) })
  await formulario.getByLabel('Perfil nuevo').selectOption({ label: 'Secretaría' })
  await formulario.getByRole('button', { name: 'Guardar perfil' }).click()
  await expect(panel.getByRole('row').filter({ hasText: correoAscenso }).getByText('Secretaría')).toBeVisible({
    timeout: 20_000,
  })
  expect(await accionesRequeridasKeycloak(cuentaAscenso!.id)).toContain('CONFIGURE_TOTP')

  const correoOpcional = `opcional.${id}@example.com`
  await crearCuentaDesdePanel(panel, { nombre: 'Opcional', apellido: `E2e ${id}`, perfil: 'Profesor', correo: correoOpcional })
  await expect(panel.getByText('Cuenta creada.')).toBeVisible({ timeout: 20_000 })
  const [cuentaOpcional] = await usuariosKeycloak({ email: correoOpcional, exact: 'true' })
  const filaOpcional = await filaDe(panel, correoOpcional)
  await filaOpcional.getByRole('button', { name: 'Pedir verificación en dos pasos' }).click()
  await expect(filaOpcional.getByText('En su próximo ingreso se le pedirá configurar la verificación en dos pasos.')).toBeVisible({
    timeout: 20_000,
  })
  expect(await accionesRequeridasKeycloak(cuentaOpcional!.id)).toContain('CONFIGURE_TOTP')

  await admin.close()
})

test('Sin consola de cuenta, la persona cambia su contraseña con "¿Olvidó su contraseña?"', async ({ browser }) => {
  const id = sufijo()
  const correo = `olvido.${id}@example.com`
  const primera = contrasenaNueva()
  const segunda = contrasenaNueva()
  const admin = await nuevoContexto(browser, urlBase)
  await sesionSuperadminLocal(admin, urlBase)
  const panel = await admin.newPage()
  let desde = new Date()
  await crearCuentaDesdePanel(panel, { nombre: 'Olvido', apellido: `E2e ${id}`, perfil: 'Profesor', correo })
  await expect(panel.getByText('Se envió la invitación al correo de acceso.')).toBeVisible({ timeout: 20_000 })

  const persona = await nuevoContexto(browser, urlBase)
  const pagina = await persona.newPage()
  await pagina.goto(await enlaceDeInvitacion(correo, desde))
  const continuar = pagina.getByRole('link', { name: /Haga clic aquí|Continuar/ })
  if (await continuar.count()) await continuar.first().click()
  await definirContrasena(pagina, primera)
  await expect(pagina.getByText('Su cuenta quedó actualizada.')).toBeVisible({ timeout: 20_000 })

  const otra = await nuevoContexto(browser, urlBase)
  const ingreso = await otra.newPage()
  await ingreso.goto('/login')
  await ingreso.getByRole('button', { name: 'Ingresar de forma segura' }).click()
  await ingreso.waitForURL((url) => url.href.startsWith(urlKeycloak), { timeout: 20_000 })
  desde = new Date()
  await ingreso.getByRole('link', { name: '¿Olvidó su contraseña?' }).click()
  await ingreso.locator('#username').fill(correo)
  await ingreso.locator('[type="submit"]').first().click()
  const correoRestablecer = await (async () => {
    const limite = Date.now() + 30_000
    while (Date.now() < limite) {
      const r = await fetch(`http://localhost:8025/api/v1/search?query=${encodeURIComponent(`to:"${correo}" subject:"Restablecer"`)}`)
      const { messages } = (await r.json()) as { messages: Array<{ ID: string; Created: string }> }
      const m = messages.find((x) => new Date(x.Created).getTime() >= desde.getTime() - 1_000)
      if (m) return ((await (await fetch(`http://localhost:8025/api/v1/message/${m.ID}`)).json()) as { Text: string }).Text
      await new Promise((listo) => setTimeout(listo, 1_000))
    }
    throw new Error('No llegó el correo de restablecimiento')
  })()
  const enlace = correoRestablecer.match(/https?:\/\/\S+action-token\S+/)?.[0]
  expect(enlace).toBeTruthy()
  await ingreso.goto(enlace!)
  await definirContrasena(ingreso, segunda)
  await ingreso.waitForURL(/\/panel\/docente|action-token|login-actions/, { timeout: 20_000 })

  const final = await nuevoContexto(browser, urlBase)
  const comprobacion = await final.newPage()
  await ingresarConKeycloak(comprobacion, correo, segunda)
  await comprobacion.waitForURL(/\/panel\/docente/, { timeout: 20_000 })

  await admin.close()
  await persona.close()
  await otra.close()
  await final.close()
})

import { createHmac, randomBytes } from 'crypto'
import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test'

export const keycloakHabilitado = process.env.AUTH_KEYCLOAK_HABILITADO === 'true'

export const urlKeycloak = (process.env.KEYCLOAK_EMISOR ?? 'http://localhost:8082/realms/agora').replace(
  /\/$/,
  ''
)
export const urlMailpit = process.env.E2E_MAILPIT_URL ?? 'http://localhost:8025'

const correoSuperadmin = process.env.SUPERADMIN_EMAIL ?? ''
const contrasenaSuperadmin = process.env.SUPERADMIN_CONTRASENA_INICIAL ?? ''

export function sufijo(): string {
  return `${Date.now().toString(36)}${randomBytes(2).toString('hex')}`
}

export function contrasenaNueva(): string {
  return `Agora-${randomBytes(9).toString('base64url')}-7q`
}

export function documentoNuevo(): string {
  return String(80_000_000 + Math.floor(Math.random() * 9_999_999))
}

export async function sesionSuperadminLocal(contexto: BrowserContext, urlBase: string) {
  const respuesta = await contexto.request.post(`${urlBase}/api/auth/sign-in/email`, {
    data: { email: correoSuperadmin, password: contrasenaSuperadmin },
    headers: { Origin: urlBase, 'x-forwarded-for': ipDePrueba() },
  })
  expect(respuesta.status(), 'inicio de sesión local del superadministrador').toBe(200)
}

interface MensajeMailpit {
  ID: string
  Created: string
}

export async function invitacion(correo: string, desde: Date): Promise<{ enlace: string; texto: string }> {
  const limite = Date.now() + 30_000
  while (Date.now() < limite) {
    const busqueda = await fetch(
      `${urlMailpit}/api/v1/search?query=${encodeURIComponent(`to:"${correo}"`)}`
    )
    const { messages } = (await busqueda.json()) as { messages: MensajeMailpit[] }
    const reciente = messages
      .filter((m) => new Date(m.Created).getTime() >= desde.getTime() - 1_000)
      .sort((a, b) => b.Created.localeCompare(a.Created))[0]
    if (reciente) {
      const detalle = (await (await fetch(`${urlMailpit}/api/v1/message/${reciente.ID}`)).json()) as {
        Text: string
        HTML: string
        Subject: string
      }
      expect(detalle.Subject).toContain('Colegio Ágora')
      const enlace = detalle.Text.match(/https?:\/\/\S+action-token\S+/)?.[0]
      if (enlace) return { enlace, texto: `${detalle.Text}\n${detalle.HTML}` }
    }
    await new Promise((listo) => setTimeout(listo, 1_000))
  }
  throw new Error(`No llegó la invitación a ${correo}`)
}

export async function enlaceDeInvitacion(correo: string, desde: Date): Promise<string> {
  return (await invitacion(correo, desde)).enlace
}

export async function accionesRequeridasKeycloak(idUsuario: string): Promise<string[]> {
  const token = await tokenServicio()
  const respuesta = await fetch(urlAdminKeycloak(`/users/${idUsuario}`), {
    headers: { Authorization: `Bearer ${token}` },
  })
  return ((await respuesta.json()) as { requiredActions?: string[] }).requiredActions ?? []
}

function base32ABytes(texto: string): Buffer {
  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const limpio = texto.replace(/[\s=]/g, '').toUpperCase()
  let bits = ''
  for (const c of limpio) bits += alfabeto.indexOf(c).toString(2).padStart(5, '0')
  const bytes: number[] = []
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2))
  return Buffer.from(bytes)
}

export function codigoTotp(secreto: string, momento = Date.now()): string {
  const contador = Buffer.alloc(8)
  contador.writeBigUInt64BE(BigInt(Math.floor(momento / 1000 / 30)))
  const hmac = createHmac('sha1', base32ABytes(secreto)).update(contador).digest()
  const desplazamiento = hmac[hmac.length - 1]! & 0x0f
  const valor = (hmac.readUInt32BE(desplazamiento) & 0x7fffffff) % 1_000_000
  return String(valor).padStart(6, '0')
}

export async function definirContrasena(pagina: Page, contrasena: string) {
  await expect(pagina.locator('#password-new')).toBeVisible({ timeout: 20_000 })
  await pagina.locator('#password-new').fill(contrasena)
  await pagina.locator('#password-confirm').fill(contrasena)
  await pagina.locator('#kc-passwd-update-form [type="submit"]').first().click()
}

export async function configurarTotp(pagina: Page): Promise<string> {
  await expect(pagina.locator('#totp')).toBeVisible({ timeout: 20_000 })
  const modoManual = pagina.locator('a[href*="mode=manual"]')
  if (await modoManual.count()) await modoManual.first().click()
  const secreto = (await pagina.locator('#kc-totp-secret-key').innerText()).replace(/\s/g, '')
  await pagina.locator('#totp').fill(codigoTotp(secreto))
  const nombre = pagina.locator('#userLabel')
  if (await nombre.count()) await nombre.fill('Prueba e2e')
  await pagina.locator('#saveTOTPBtn, [type="submit"]').first().click()
  return secreto
}

export async function ingresarConKeycloak(
  pagina: Page,
  usuario: string,
  contrasena: string,
  totp?: string
) {
  await pagina.goto('/login')
  await pagina.getByRole('button', { name: 'Ingresar de forma segura' }).click()
  await pagina.waitForURL((url) => url.href.startsWith(urlKeycloak) || url.pathname.startsWith('/panel'), {
    timeout: 20_000,
  })
  if (pagina.url().startsWith(urlKeycloak)) {
    await pagina.locator('#username').fill(usuario)
    await pagina.locator('#password').fill(contrasena)
    await pagina.locator('#kc-login').click()
    if (totp) {
      await expect(pagina.locator('#otp')).toBeVisible({ timeout: 20_000 })
      await pagina.locator('#otp').fill(codigoTotp(totp))
      await pagina.locator('#kc-login, [type="submit"]').first().click()
    }
  }
}

export async function tokenServicio(): Promise<string> {
  const respuesta = await fetch(`${urlKeycloak}/protocol/openid-connect/token`, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.KEYCLOAK_ADMIN_CLIENTE_ID ?? 'plataforma-admin',
      client_secret: process.env.KEYCLOAK_ADMIN_CLIENTE_SECRETO ?? '',
    }),
  })
  expect(respuesta.status).toBe(200)
  return ((await respuesta.json()) as { access_token: string }).access_token
}

export function urlAdminKeycloak(ruta: string): string {
  const realm = new URL(urlKeycloak)
  return `${realm.origin}/admin${realm.pathname}${ruta}`
}

export async function usuariosKeycloak(filtro: Record<string, string>) {
  const token = await tokenServicio()
  const respuesta = await fetch(`${urlAdminKeycloak('/users')}?${new URLSearchParams(filtro)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return (await respuesta.json()) as Array<{
    id: string
    username: string
    email?: string
    enabled: boolean
    attributes?: Record<string, string[]>
  }>
}

export async function sesionesKeycloak(idUsuario: string): Promise<number> {
  const token = await tokenServicio()
  const respuesta = await fetch(urlAdminKeycloak(`/users/${idUsuario}/sessions`), {
    headers: { Authorization: `Bearer ${token}` },
  })
  return ((await respuesta.json()) as unknown[]).length
}

export function ipDePrueba(): string {
  return `198.51.100.${1 + Math.floor(Math.random() * 250)}`
}

export function nuevoContexto(browser: Browser, baseURL: string): Promise<BrowserContext> {
  return browser.newContext({ baseURL, extraHTTPHeaders: { 'x-forwarded-for': ipDePrueba() } })
}

const HOSTS_LOCALES = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

export const urlBase = process.env.E2E_BASE_URL ?? 'http://localhost:3001'

export const urlSuperusuario =
  process.env.E2E_DATABASE_URL_SUPERUSUARIO ??
  `postgres://postgres:${encodeURIComponent(process.env.POSTGRES_PASSWORD ?? '')}@localhost:5433/agora`

function exigirLocal(nombre: string, url: string) {
  let host: string
  try {
    host = new URL(url).hostname
  } catch {
    throw new Error(
      `${nombre} no es una URL válida. Estas pruebas solo corren contra el stack local.`
    )
  }
  if (!HOSTS_LOCALES.has(host)) {
    throw new Error(
      `${nombre} apunta a "${host}". Estas pruebas escriben en la base, inician sesión y consumen radicados reales: solo se ejecutan contra localhost.`
    )
  }
}

export function exigirStackLocal() {
  exigirLocal('E2E_BASE_URL', urlBase)
  exigirLocal('La URL de la base de datos', urlSuperusuario)
}

import { describe, it, expect, vi, afterEach } from 'vitest'
import { createHash } from 'crypto'
import { contraseñaComprometida } from '../../src/auth/hibp'

const fetchOriginal = global.fetch

afterEach(() => {
  global.fetch = fetchOriginal
  vi.restoreAllMocks()
})

function sufijoDe(password: string): string {
  return createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase().slice(5)
}

describe('contraseñaComprometida', () => {
  it('detecta una contraseña cuyo sufijo aparece en la respuesta de HIBP', async () => {
    const password = 'password123'
    const sufijo = sufijoDe(password)

    global.fetch = vi.fn(async () => ({
      ok: true,
      text: async () => `AAAA1:10\n${sufijo}:5000\nBBBB2:3`,
    })) as unknown as typeof fetch

    expect(await contraseñaComprometida(password)).toBe(true)
  })

  it('no marca como comprometida una contraseña cuyo sufijo no aparece', async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      text: async () => `AAAA1:10\nBBBB2:3`,
    })) as unknown as typeof fetch

    expect(await contraseñaComprometida('una-contraseña-muy-improbable-9F3x')).toBe(false)
  })

  it('falla abierto (permite la contraseña) si el servicio responde con error', async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 503, text: async () => '' })) as unknown as typeof fetch

    expect(await contraseñaComprometida('cualquiera')).toBe(false)
  })

  it('falla abierto si la solicitud lanza una excepción (red caída)', async () => {
    global.fetch = vi.fn(async () => {
      throw new Error('red no disponible')
    }) as unknown as typeof fetch

    expect(await contraseñaComprometida('cualquiera')).toBe(false)
  })

  it('nunca envía la contraseña completa ni su hash completo al servicio', async () => {
    let urlSolicitada = ''
    global.fetch = vi.fn(async (url: unknown) => {
      urlSolicitada = String(url)
      return { ok: true, text: async () => '' }
    }) as unknown as typeof fetch

    await contraseñaComprometida('super-secreta-123')

    expect(urlSolicitada).not.toContain('super-secreta-123')
    const prefijoEsperado = createHash('sha1').update('super-secreta-123', 'utf8').digest('hex').toUpperCase().slice(0, 5)
    expect(urlSolicitada).toContain(prefijoEsperado)
    expect(urlSolicitada).not.toContain(
      createHash('sha1').update('super-secreta-123', 'utf8').digest('hex').toUpperCase()
    )
  })
})

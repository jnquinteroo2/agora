import { describe, it, expect, afterEach } from 'vitest'
import { ocultarContenidoDePrueba, esContenidoDePrueba } from '../../src/seo/metadatos'

describe('contenido de prueba', () => {
  const original = process.env['AGORA_SIEMBRA_DEMO']

  afterEach(() => {
    if (original === undefined) delete process.env['AGORA_SIEMBRA_DEMO']
    else process.env['AGORA_SIEMBRA_DEMO'] = original
  })

  it('el álbum de prueba se oculta si no está AGORA_SIEMBRA_DEMO=true', () => {
    delete process.env['AGORA_SIEMBRA_DEMO']
    expect(esContenidoDePrueba('album-de-prueba')).toBe(true)
    expect(ocultarContenidoDePrueba('album-de-prueba')).toBe(true)
    process.env['AGORA_SIEMBRA_DEMO'] = 'false'
    expect(ocultarContenidoDePrueba('album-de-prueba')).toBe(true)
  })

  it('en desarrollo, con AGORA_SIEMBRA_DEMO=true, se ve', () => {
    process.env['AGORA_SIEMBRA_DEMO'] = 'true'
    expect(ocultarContenidoDePrueba('album-de-prueba')).toBe(false)
  })

  it('el contenido real nunca se oculta', () => {
    delete process.env['AGORA_SIEMBRA_DEMO']
    expect(ocultarContenidoDePrueba('bienvenida')).toBe(false)
  })
})

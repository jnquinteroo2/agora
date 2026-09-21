import { describe, expect, it } from 'vitest'
import { clasificarRuta } from '../../src/seguridad/rutas'

describe('clasificarRuta', () => {
  it('protege todo el panel', () => {
    expect(clasificarRuta('/panel')).toBe('protegida')
    expect(clasificarRuta('/panel/admin/finanzas')).toBe('protegida')
  })

  it('protege toda la API salvo la lista explícita de API públicas', () => {
    expect(clasificarRuta('/api/archivos')).toBe('protegida')
    expect(clasificarRuta('/api/documentos/abc')).toBe('protegida')
    expect(clasificarRuta('/api')).toBe('protegida')
    expect(clasificarRuta('/api/health')).toBe('publica')
    expect(clasificarRuta('/api/verificar/abc')).toBe('publica')
    expect(clasificarRuta('/api/auth/get-session')).toBe('publica')
    expect(clasificarRuta('/api/pdf/render/boletin/abc')).toBe('publica')
    expect(clasificarRuta('/api/galeria/imagen/abc')).toBe('publica')
  })

  it('no confunde rutas que solo empiezan igual que una API pública', () => {
    expect(clasificarRuta('/api/healthz')).toBe('protegida')
    expect(clasificarRuta('/api/health/interno')).toBe('protegida')
    expect(clasificarRuta('/api/verificar/abc/datos')).toBe('protegida')
    expect(clasificarRuta('/api/galeria/imagen/abc/original')).toBe('protegida')
    expect(clasificarRuta('/panelx')).toBe('publica')
  })

  it('deja pasar el sitio, los archivos de sistema y las URL inexistentes', () => {
    for (const ruta of [
      '/inicio',
      '/sitemap.xml',
      '/robots.txt',
      '/manifest.webmanifest',
      '/opengraph-image',
      '/no-existe',
    ]) {
      expect(clasificarRuta(ruta)).toBe('publica')
    }
  })

  it('marca las rutas que solo tienen sentido sin sesión', () => {
    expect(clasificarRuta('/login')).toBe('solo-sin-sesion')
  })
})

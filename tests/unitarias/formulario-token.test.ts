import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { crearTokenFormulario, validarTokenFormulario } from '../../src/datos/formulario-token'

const T0 = new Date('2026-09-01T12:00:00.000Z')
const T4s = new Date('2026-09-01T12:00:04.000Z')
const T1s = new Date('2026-09-01T12:00:01.000Z')
const T2h1m = new Date('2026-09-01T14:01:00.000Z')

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

describe('validarTokenFormulario()', () => {

  it('acepta token válido con tiempo suficiente', () => {
    vi.setSystemTime(T0)
    const token = crearTokenFormulario()

    vi.setSystemTime(T4s)
    expect(() => validarTokenFormulario(token)).not.toThrow()
  })

  it('rechaza envío en menos de 3 segundos', () => {
    vi.setSystemTime(T0)
    const token = crearTokenFormulario()

    vi.setSystemTime(T1s)
    expect(() => validarTokenFormulario(token)).toThrow('demasiado rápido')
  })

  it('rechaza token con firma alterada', () => {
    vi.setSystemTime(T0)
    const token = crearTokenFormulario()
    const alterado = token.slice(0, -4) + '0000'

    vi.setSystemTime(T4s)
    expect(() => validarTokenFormulario(alterado)).toThrow('inválido')
  })

  it('rechaza token sin separador', () => {
    expect(() => validarTokenFormulario('sin-separador')).toThrow('inválido')
  })

  it('rechaza token expirado (más de 2 horas)', () => {
    vi.setSystemTime(T0)
    const token = crearTokenFormulario()

    vi.setSystemTime(T2h1m)
    expect(() => validarTokenFormulario(token)).toThrow('expiró')
  })

})

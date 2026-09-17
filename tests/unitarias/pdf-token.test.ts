import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { crearTokenRenderPDF, validarTokenRenderPDF, type DatosTokenPDF } from '../../src/datos/pdf-token'

const T0 = new Date('2026-09-01T12:00:00.000Z')
const T4m = new Date('2026-09-01T12:04:00.000Z')
const T6m = new Date('2026-09-01T12:06:00.000Z')

const SOLICITANTE_DOCENTE = { id: 'docente-uuid-1', rol: 'docente' as const }
const SOLICITANTE_SUPERADMIN = { id: 'superadmin-uuid-1', rol: 'superadmin' as const }

const BASE: DatosTokenPDF = {
  tipo: 'boletin',
  entidadId: '01234567-89ab-cdef-0123-456789abcdef',
  periodoId: '11111111-1111-1111-1111-111111111111',
  solicitante: SOLICITANTE_DOCENTE,
}

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

describe('validarTokenRenderPDF()', () => {

  it('acepta un token válido dentro de la vigencia y devuelve la identidad firmada del solicitante', () => {
    vi.setSystemTime(T0)
    const token = crearTokenRenderPDF(BASE)

    vi.setSystemTime(T4m)
    const solicitante = validarTokenRenderPDF(token, { tipo: BASE.tipo, entidadId: BASE.entidadId, periodoId: BASE.periodoId })
    expect(solicitante).toEqual(SOLICITANTE_DOCENTE)
  })

  it('acepta un token sin periodo (documento que no lo requiere) cuando se valida igual sin periodo', () => {
    vi.setSystemTime(T0)
    const token = crearTokenRenderPDF({ tipo: 'recibo_caja', entidadId: BASE.entidadId, solicitante: SOLICITANTE_SUPERADMIN })

    vi.setSystemTime(T4m)
    const solicitante = validarTokenRenderPDF(token, { tipo: 'recibo_caja', entidadId: BASE.entidadId })
    expect(solicitante).toEqual(SOLICITANTE_SUPERADMIN)
  })

  it('rechaza el token si expiró (más de 5 minutos)', () => {
    vi.setSystemTime(T0)
    const token = crearTokenRenderPDF(BASE)

    vi.setSystemTime(T6m)
    expect(() => validarTokenRenderPDF(token, { tipo: BASE.tipo, entidadId: BASE.entidadId, periodoId: BASE.periodoId })).toThrow('expiró')
  })

  it('rechaza un token emitido para otra entidad, aunque no haya expirado', () => {
    vi.setSystemTime(T0)
    const token = crearTokenRenderPDF(BASE)

    vi.setSystemTime(T4m)
    expect(() =>
      validarTokenRenderPDF(token, { tipo: BASE.tipo, entidadId: 'fedcba98-7654-3210-fedc-ba9876543210', periodoId: BASE.periodoId })
    ).toThrow('no corresponde a este documento')
  })

  it('rechaza un token emitido para otro tipo de documento', () => {
    vi.setSystemTime(T0)
    const token = crearTokenRenderPDF({ tipo: 'recibo_caja', entidadId: BASE.entidadId, solicitante: SOLICITANTE_SUPERADMIN })

    vi.setSystemTime(T4m)
    expect(() => validarTokenRenderPDF(token, { tipo: BASE.tipo, entidadId: BASE.entidadId })).toThrow('no corresponde a este documento')
  })

  it('rechaza un token emitido para otro periodo del mismo estudiante', () => {
    vi.setSystemTime(T0)
    const token = crearTokenRenderPDF(BASE)

    vi.setSystemTime(T4m)
    expect(() =>
      validarTokenRenderPDF(token, { tipo: BASE.tipo, entidadId: BASE.entidadId, periodoId: '22222222-2222-2222-2222-222222222222' })
    ).toThrow('no corresponde a este periodo')
  })

  it('rechaza un token con la firma alterada', () => {
    vi.setSystemTime(T0)
    const token = crearTokenRenderPDF(BASE)
    const alterado = token.slice(0, -4) + '0000'

    vi.setSystemTime(T4m)
    expect(() =>
      validarTokenRenderPDF(alterado, { tipo: BASE.tipo, entidadId: BASE.entidadId, periodoId: BASE.periodoId })
    ).toThrow('inválido')
  })

  it('rechaza un token sin separador', () => {
    expect(() => validarTokenRenderPDF('sin-separador', { tipo: BASE.tipo, entidadId: BASE.entidadId })).toThrow('inválido')
  })

  it('rechaza un token con un rol de solicitante desconocido (payload manipulado)', () => {
    vi.setSystemTime(T0)
    const token = crearTokenRenderPDF(BASE)
    const partes = token.split('|')[0]!.split(':')
    partes[4] = 'root'
    const payloadFalso = partes.join(':')
    const tokenFalso = `${payloadFalso}|${token.split('|')[1]}`

    vi.setSystemTime(T4m)
    expect(() =>
      validarTokenRenderPDF(tokenFalso, { tipo: BASE.tipo, entidadId: BASE.entidadId, periodoId: BASE.periodoId })
    ).toThrow('inválido')
  })

})

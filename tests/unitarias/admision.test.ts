import { describe, it, expect } from 'vitest'
import {
  esMenorDeEdad,
  fechaDeHoyEnBogota,
  problemasDeContacto,
  requiereAcudiente,
  requiereTelefonoDelAspirante,
} from '../../src/dominio/admision'
import { validarFormulario } from '../../app/(publico)/admisiones/validacion'
import { esqFormularioAspirante } from '../../src/acciones/admisiones/esquema-aspirante'

const AHORA = new Date('2026-09-25T15:00:00-05:00')

function desplazarAnios(fecha: string, anios: number, dias = 0): string {
  const [a, m, d] = fecha.split('-').map(Number)
  const resultado = new Date(Date.UTC(a! + anios, m! - 1, d! + dias))
  return resultado.toISOString().slice(0, 10)
}

const BASE = {
  primerNombre: 'Laura',
  primerApellido: 'Rincón',
  tipoDocumento: 'CC',
  numeroDocumento: '1023456789',
  cicloId: '0192f4a0-0000-7000-8000-000000000001',
  jornadaId: '0192f4a0-0000-7000-8000-000000000002',
  autorizacionDatos: true,
}

describe('mayoría de edad en la hora de Bogotá', () => {
  it('quien cumple 18 hoy ya es mayor de edad', () => {
    expect(esMenorDeEdad('2008-09-25', AHORA)).toBe(false)
    expect(requiereAcudiente('2008-09-25', AHORA)).toBe(false)
    expect(requiereTelefonoDelAspirante('2008-09-25', AHORA)).toBe(true)
  })

  it('quien cumple 18 mañana todavía es menor de edad', () => {
    expect(esMenorDeEdad('2008-09-26', AHORA)).toBe(true)
    expect(requiereAcudiente('2008-09-26', AHORA)).toBe(true)
    expect(requiereTelefonoDelAspirante('2008-09-26', AHORA)).toBe(false)
  })

  it('una fecha futura no define la edad y exige acudiente', () => {
    expect(esMenorDeEdad('2026-09-26', AHORA)).toBeNull()
    expect(requiereAcudiente('2026-09-26', AHORA)).toBe(true)
    expect(requiereTelefonoDelAspirante('2026-09-26', AHORA)).toBe(false)
  })

  it('una fecha vacía o inválida no define la edad y exige acudiente', () => {
    expect(esMenorDeEdad('', AHORA)).toBeNull()
    expect(esMenorDeEdad('2008-02-30', AHORA)).toBeNull()
    expect(requiereAcudiente('', AHORA)).toBe(true)
  })

  it('usa el día de Bogotá aunque en UTC ya sea el día siguiente', () => {
    const nocheEnBogota = new Date('2026-09-26T03:30:00Z')
    expect(fechaDeHoyEnBogota(nocheEnBogota)).toBe('2026-09-25')
    expect(esMenorDeEdad('2008-09-26', nocheEnBogota)).toBe(true)
  })

  it('quien nació un 29 de febrero cumple 18 el 1 de marzo en años no bisiestos', () => {
    expect(esMenorDeEdad('2008-02-29', new Date('2026-02-28T12:00:00-05:00'))).toBe(true)
    expect(esMenorDeEdad('2008-02-29', new Date('2026-03-01T12:00:00-05:00'))).toBe(false)
  })
})

describe('contactos obligatorios', () => {
  it('menor de edad sin acudiente: pide nombre y teléfono del acudiente', () => {
    const campos = problemasDeContacto({ fechaNacimiento: '2010-05-01' }, AHORA).map((p) => p.campo)
    expect(campos).toEqual(['nombreAcudiente', 'telefonoAcudiente'])
  })

  it('mayor de edad sin teléfono propio: pide el teléfono del aspirante y no el acudiente', () => {
    const campos = problemasDeContacto({ fechaNacimiento: '1990-05-01' }, AHORA).map((p) => p.campo)
    expect(campos).toEqual(['telefonoAspirante'])
  })

  it('mayor de edad con teléfono propio: no pide nada más', () => {
    expect(
      problemasDeContacto({ fechaNacimiento: '1990-05-01', telefonoAspirante: '3001234567' }, AHORA)
    ).toEqual([])
  })
})

describe('validación del formulario en el cliente', () => {
  const hoy = fechaDeHoyEnBogota()

  it('cumple 18 hoy: acepta sin acudiente si trae teléfono propio', () => {
    const errores = validarFormulario({
      ...BASE,
      fechaNacimiento: desplazarAnios(hoy, -18),
      telefonoAspirante: '3001234567',
    })
    expect(errores).toEqual({})
  })

  it('cumple 18 mañana: exige el acudiente', () => {
    const errores = validarFormulario({
      ...BASE,
      fechaNacimiento: desplazarAnios(hoy, -18, 1),
      telefonoAspirante: '3001234567',
    })
    expect(Object.keys(errores).sort()).toEqual(['nombreAcudiente', 'telefonoAcudiente'])
  })

  it('fecha futura: marca la fecha y exige el acudiente', () => {
    const errores = validarFormulario({ ...BASE, fechaNacimiento: desplazarAnios(hoy, 0, 1) })
    expect(errores.fechaNacimiento).toBe('La fecha de nacimiento no puede ser posterior a hoy.')
    expect(errores.nombreAcudiente).toBeDefined()
  })

  it('fecha vacía: marca la fecha y exige el acudiente', () => {
    const errores = validarFormulario({ ...BASE, fechaNacimiento: '' })
    expect(errores.fechaNacimiento).toBe('Indique la fecha de nacimiento.')
    expect(errores.nombreAcudiente).toBeDefined()
    expect(errores.telefonoAspirante).toBeUndefined()
  })
})

describe('validación del servidor', () => {
  const hoy = fechaDeHoyEnBogota()
  const solicitud = {
    ...BASE,
    tipoDocumento: 'CC' as const,
    autorizacionDatos: true as const,
    formularioServido: 'ficha',
  }

  it('cumple 18 hoy: acepta sin acudiente si trae teléfono propio', () => {
    const r = esqFormularioAspirante.safeParse({
      ...solicitud,
      fechaNacimiento: desplazarAnios(hoy, -18),
      telefonoAspirante: '3001234567',
    })
    expect(r.success).toBe(true)
  })

  it('cumple 18 mañana: rechaza la solicitud sin acudiente', () => {
    const r = esqFormularioAspirante.safeParse({
      ...solicitud,
      fechaNacimiento: desplazarAnios(hoy, -18, 1),
      telefonoAspirante: '3001234567',
    })
    expect(r.success).toBe(false)
    expect(r.error?.issues.map((i) => i.path[0]).sort()).toEqual([
      'nombreAcudiente',
      'telefonoAcudiente',
    ])
  })

  it('mayor de edad sin teléfono propio: rechaza la solicitud', () => {
    const r = esqFormularioAspirante.safeParse({ ...solicitud, fechaNacimiento: '1990-05-01' })
    expect(r.success).toBe(false)
    expect(r.error?.issues.map((i) => i.path[0])).toEqual(['telefonoAspirante'])
  })

  it('fecha futura: rechaza la solicitud', () => {
    const r = esqFormularioAspirante.safeParse({
      ...solicitud,
      fechaNacimiento: desplazarAnios(hoy, 0, 1),
      nombreAcudiente: 'Marta Rincón',
      telefonoAcudiente: '3001234567',
    })
    expect(r.success).toBe(false)
    expect(r.error?.issues.map((i) => i.path[0])).toContain('fechaNacimiento')
  })

  it('fecha vacía: rechaza la solicitud', () => {
    const r = esqFormularioAspirante.safeParse({
      ...solicitud,
      fechaNacimiento: '',
      nombreAcudiente: 'Marta Rincón',
      telefonoAcudiente: '3001234567',
    })
    expect(r.success).toBe(false)
    expect(r.error?.issues.map((i) => i.path[0])).toContain('fechaNacimiento')
  })
})

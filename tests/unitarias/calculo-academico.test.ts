import { describe, it, expect } from 'vitest'
import {
  redondearNota,
  obtenerNivelDesempeno,
  calcularPromedio,
  calcularDefinitivaAsignatura,
  evaluarAprobacion,
  type BandaEscala,
} from '../../src/dominio/calculo-academico'

const ESCALA: BandaEscala[] = [
  { nivel: 'Bajo', desde: 1.0, hasta: 2.9, orden: 1 },
  { nivel: 'Básico', desde: 3.0, hasta: 3.9, orden: 2 },
  { nivel: 'Alto', desde: 4.0, hasta: 4.5, orden: 3 },
  { nivel: 'Superior', desde: 4.6, hasta: 5.0, orden: 4 },
]

describe('redondearNota()', () => {
  it('redondea el punto medio hacia arriba (3.75 -> 3.8)', () => {
    expect(redondearNota(3.75)).toBe(3.8)
  })

  it('no altera un valor ya redondeado a un decimal', () => {
    expect(redondearNota(4.0)).toBe(4.0)
    expect(redondearNota(3.1)).toBe(3.1)
  })

  it('redondea hacia abajo cuando corresponde', () => {
    expect(redondearNota(3.24)).toBe(3.2)
  })

  it('funciona con el caso clásico de imprecisión de punto flotante (1.005)', () => {
    expect(redondearNota(1.05)).toBe(1.1)
  })
})

describe('obtenerNivelDesempeno()', () => {
  it('clasifica correctamente cada banda, incluidos los límites', () => {
    expect(obtenerNivelDesempeno(1.0, ESCALA)).toBe('Bajo')
    expect(obtenerNivelDesempeno(2.9, ESCALA)).toBe('Bajo')
    expect(obtenerNivelDesempeno(3.0, ESCALA)).toBe('Básico')
    expect(obtenerNivelDesempeno(3.9, ESCALA)).toBe('Básico')
    expect(obtenerNivelDesempeno(4.0, ESCALA)).toBe('Alto')
    expect(obtenerNivelDesempeno(4.5, ESCALA)).toBe('Alto')
    expect(obtenerNivelDesempeno(4.6, ESCALA)).toBe('Superior')
    expect(obtenerNivelDesempeno(5.0, ESCALA)).toBe('Superior')
  })

  it('devuelve null si la nota es null o undefined (asignatura sin calificar)', () => {
    expect(obtenerNivelDesempeno(null, ESCALA)).toBeNull()
    expect(obtenerNivelDesempeno(undefined, ESCALA)).toBeNull()
  })

  it('devuelve null si ninguna banda cubre el valor, en vez de lanzar', () => {
    expect(obtenerNivelDesempeno(0.5, ESCALA)).toBeNull()
    expect(obtenerNivelDesempeno(6.0, ESCALA)).toBeNull()
  })
})

describe('calcularPromedio()', () => {
  it('promedia solo las notas presentes, ignorando null/undefined', () => {
    expect(calcularPromedio([3.0, 4.0, null, 5.0, undefined])).toBe(4.0)
  })

  it('devuelve null cuando no hay ninguna nota', () => {
    expect(calcularPromedio([null, undefined])).toBeNull()
    expect(calcularPromedio([])).toBeNull()
  })

  it('redondea el resultado a un decimal', () => {
    expect(calcularPromedio([3.0, 3.5, 4.0])).toBe(3.5)
    expect(calcularPromedio([3.0, 3.4, 4.0])).toBe(3.5)
  })
})

describe('calcularDefinitivaAsignatura()', () => {
  it('promedia los cuatro periodos cuando todos están calificados', () => {
    expect(calcularDefinitivaAsignatura([3.0, 3.5, 4.0, 4.5])).toBe(3.8)
  })

  it('devuelve null si falta cualquier periodo, sin importar cuántos ya haya', () => {
    expect(calcularDefinitivaAsignatura([3.0, 3.5, null, 4.5])).toBeNull()
    expect(calcularDefinitivaAsignatura([3.0])).toBe(3.0)
    expect(calcularDefinitivaAsignatura([])).toBeNull()
  })
})

describe('evaluarAprobacion()', () => {
  it('aprueba cuando todas las definitivas superan el umbral', () => {
    const r = evaluarAprobacion({ Matemáticas: 3.5, Español: 4.0 })
    expect(r.aprobado).toBe(true)
    expect(r.asignaturasReprobadas).toEqual([])
    expect(r.asignaturasPendientes).toEqual([])
  })

  it('reprueba e identifica las asignaturas por debajo del umbral', () => {
    const r = evaluarAprobacion({ Matemáticas: 2.5, Español: 4.0, Física: 2.9 })
    expect(r.aprobado).toBe(false)
    expect(r.asignaturasReprobadas).toEqual(['Matemáticas', 'Física'])
    expect(r.asignaturasPendientes).toEqual([])
  })

  it('no reprueba ni aprueba una asignatura pendiente: queda marcada aparte', () => {
    const r = evaluarAprobacion({ Matemáticas: 4.0, Español: null })
    expect(r.aprobado).toBe(false)
    expect(r.asignaturasReprobadas).toEqual([])
    expect(r.asignaturasPendientes).toEqual(['Español'])
  })

  it('respeta un umbral de aprobación distinto al de por defecto', () => {
    const r = evaluarAprobacion({ Matemáticas: 3.2 }, 3.5)
    expect(r.aprobado).toBe(false)
    expect(r.asignaturasReprobadas).toEqual(['Matemáticas'])
  })
})

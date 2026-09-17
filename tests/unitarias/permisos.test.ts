import { describe, it, expect } from 'vitest'
import { puede, puedeOLanzar } from '../../src/auth/permisos'

describe('puede()', () => {
  it('superadmin puede todo', () => {
    expect(puede('superadmin', 'leer',    'finanzas')).toBe(true)
    expect(puede('superadmin', 'eliminar','usuarios')).toBe(true)
    expect(puede('superadmin', 'editar', 'auditoria')).toBe(false)
  })

  it('docente puede leer/crear/editar calificaciones', () => {
    expect(puede('docente', 'leer',   'calificaciones')).toBe(true)
    expect(puede('docente', 'crear',  'calificaciones')).toBe(true)
    expect(puede('docente', 'editar', 'calificaciones')).toBe(true)
    expect(puede('docente', 'eliminar','calificaciones')).toBe(false)
  })

  it('docente NO puede acceder a finanzas', () => {
    expect(puede('docente', 'leer', 'finanzas')).toBe(false)
  })

  it('docente NO puede crear usuarios', () => {
    expect(puede('docente', 'crear', 'usuarios')).toBe(false)
  })

  it('estudiante solo puede leer sus propios recursos', () => {
    expect(puede('estudiante', 'leer',  'calificaciones')).toBe(true)
    expect(puede('estudiante', 'crear', 'calificaciones')).toBe(false)
    expect(puede('estudiante', 'leer',  'finanzas')).toBe(true)
    expect(puede('estudiante', 'editar','finanzas')).toBe(false)
    expect(puede('estudiante', 'leer',  'configuracion')).toBe(false)
    expect(puede('estudiante', 'leer',  'cms')).toBe(false)
    expect(puede('estudiante', 'leer',  'admisiones')).toBe(false)
    expect(puede('estudiante', 'leer',  'auditoria')).toBe(false)
  })

  it('estudiante NO puede modificar el observador', () => {
    expect(puede('estudiante', 'crear', 'observador')).toBe(false)
  })
})

describe('puedeOLanzar()', () => {
  it('lanza cuando el rol no tiene permiso', () => {
    expect(() => puedeOLanzar('estudiante', 'eliminar', 'calificaciones')).toThrow(
      "El rol 'estudiante' no puede 'eliminar' en 'calificaciones'"
    )
  })

  it('no lanza cuando el rol tiene permiso', () => {
    expect(() => puedeOLanzar('superadmin', 'eliminar', 'calificaciones')).not.toThrow()
  })
})

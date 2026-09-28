import { describe, it, expect } from 'vitest'
import {
  ROLES,
  puedeAsignarRol,
  puedeGestionarCuenta,
  rolesAsignablesPor,
  rolesParaRuta,
} from '../../src/auth/roles'
import { puede } from '../../src/auth/permisos'
import { PERFILES } from '../../src/ui/perfiles'

describe('siete perfiles', () => {
  it('coinciden con los perfiles visibles del diseño', () => {
    expect([...ROLES].sort()).toEqual(PERFILES.map((p) => p.clave).sort())
  })

  it('cada ruta de perfil exige su rol, sin confundir /panel/admin con /panel/administrador', () => {
    for (const perfil of PERFILES) {
      expect(rolesParaRuta(perfil.ruta)).toEqual([perfil.clave])
      expect(rolesParaRuta(`${perfil.ruta}/algo`)).toEqual([perfil.clave])
    }
    expect(rolesParaRuta('/panel/administrador/cuentas')).toEqual(['admin'])
    expect(rolesParaRuta('/panel/admin/cuentas')).toEqual(['superadmin'])
    expect(rolesParaRuta('/panel/adminx')).toBeNull()
    expect(rolesParaRuta('/panel')).toBeNull()
  })
})

describe('quién asigna qué perfil', () => {
  it('el Superadministrador asigna los siete', () => {
    expect([...rolesAsignablesPor('superadmin')].sort()).toEqual([...ROLES].sort())
  })

  it('el Administrador asigna cinco y nunca Administrador ni Superadministrador', () => {
    expect([...rolesAsignablesPor('admin')].sort()).toEqual(
      ['acudiente', 'contador', 'docente', 'estudiante', 'secretaria']
    )
    expect(puedeAsignarRol('admin', 'admin')).toBe(false)
    expect(puedeAsignarRol('admin', 'superadmin')).toBe(false)
    expect(puedeGestionarCuenta('admin', 'admin')).toBe(false)
    expect(puedeGestionarCuenta('admin', 'superadmin')).toBe(false)
  })

  it('los demás perfiles no asignan ninguno', () => {
    for (const rol of ['secretaria', 'contador', 'docente', 'estudiante', 'acudiente', 'desconocido']) {
      expect(rolesAsignablesPor(rol)).toEqual([])
    }
  })

  it('los perfiles nuevos arrancan con permisos mínimos', () => {
    expect(puede('admin', 'crear', 'usuarios')).toBe(true)
    expect(puede('admin', 'leer', 'finanzas')).toBe(false)
    for (const rol of ['secretaria', 'contador', 'acudiente'] as const) {
      expect(puede(rol, 'leer', 'calificaciones')).toBe(false)
      expect(puede(rol, 'leer', 'finanzas')).toBe(false)
    }
  })
})

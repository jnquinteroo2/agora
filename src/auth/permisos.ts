export type Rol = 'superadmin' | 'docente' | 'estudiante'
export type Accion = 'leer' | 'crear' | 'editar' | 'eliminar'
export type Recurso =
  | 'calificaciones'
  | 'finanzas'
  | 'usuarios'
  | 'configuracion'
  | 'cms'
  | 'expediente'
  | 'admisiones'
  | 'auditoria'
  | 'observador'

type Matriz = Partial<Record<Recurso, Accion[]>>

const PERMISOS: Record<Rol, Matriz> = {
  superadmin: {
    calificaciones: ['leer', 'crear', 'editar', 'eliminar'],
    finanzas: ['leer', 'crear', 'editar', 'eliminar'],
    usuarios: ['leer', 'crear', 'editar', 'eliminar'],
    configuracion: ['leer', 'crear', 'editar', 'eliminar'],
    cms: ['leer', 'crear', 'editar', 'eliminar'],
    expediente: ['leer', 'crear', 'editar', 'eliminar'],
    admisiones: ['leer', 'crear', 'editar', 'eliminar'],
    auditoria: ['leer'],
    observador: ['leer', 'crear', 'editar', 'eliminar'],
  },
  docente: {
    calificaciones: ['leer', 'crear', 'editar'],
    expediente: ['leer'],
    observador: ['leer', 'crear', 'editar'],
  },
  estudiante: {
    calificaciones: ['leer'],
    finanzas: ['leer'],
    expediente: ['leer'],
  },
}

export function puede(rol: Rol, accion: Accion, recurso: Recurso): boolean {
  return PERMISOS[rol][recurso]?.includes(accion) ?? false
}

export function puedeOLanzar(rol: Rol, accion: Accion, recurso: Recurso): void {
  if (!puede(rol, accion, recurso)) {
    throw new Error(`El rol '${rol}' no puede '${accion}' en '${recurso}'`)
  }
}

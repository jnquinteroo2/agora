export const ROLES = [
  'superadmin',
  'admin',
  'secretaria',
  'contador',
  'docente',
  'estudiante',
  'acudiente',
] as const

export type Rol = (typeof ROLES)[number]

export const ROLES_PRIVILEGIADOS: readonly Rol[] = ['superadmin', 'admin']

export const ROLES_GESTORES_DE_CUENTAS: readonly Rol[] = ['superadmin', 'admin']

const ASIGNABLES: Record<Rol, readonly Rol[]> = {
  superadmin: ROLES,
  admin: ['docente', 'estudiante', 'acudiente', 'secretaria', 'contador'],
  secretaria: [],
  contador: [],
  docente: [],
  estudiante: [],
  acudiente: [],
}

export function esRol(valor: string): valor is Rol {
  return (ROLES as readonly string[]).includes(valor)
}

export function rolesAsignablesPor(actor: string): readonly Rol[] {
  return esRol(actor) ? ASIGNABLES[actor] : []
}

export function puedeAsignarRol(actor: string, rol: string): boolean {
  return rolesAsignablesPor(actor).includes(rol as Rol)
}

export function puedeGestionarCuenta(actor: string, rolDeLaCuenta: string): boolean {
  return puedeAsignarRol(actor, rolDeLaCuenta)
}

export const PREFIJOS_ROL: ReadonlyArray<readonly [string, readonly Rol[]]> = [
  ['/panel/administrador', ['admin']],
  ['/panel/admin', ['superadmin']],
  ['/panel/secretaria', ['secretaria']],
  ['/panel/contador', ['contador']],
  ['/panel/docente', ['docente']],
  ['/panel/estudiante', ['estudiante']],
  ['/panel/acudiente', ['acudiente']],
]

export function rolesParaRuta(pathname: string): readonly Rol[] | null {
  const coincidencia = PREFIJOS_ROL.find(
    ([prefijo]) => pathname === prefijo || pathname.startsWith(`${prefijo}/`)
  )
  return coincidencia ? coincidencia[1] : null
}

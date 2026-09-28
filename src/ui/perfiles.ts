import {
  Building2,
  Calculator,
  ClipboardList,
  GraduationCap,
  HeartHandshake,
  Presentation,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'

export type ClavePerfil =
  'docente' | 'estudiante' | 'acudiente' | 'secretaria' | 'admin' | 'superadmin' | 'contador'

export interface Perfil {
  clave: ClavePerfil
  nombre: string
  ruta: string
  icono: LucideIcon
  descripcion: string
}

export const PERFILES: Perfil[] = [
  {
    clave: 'docente',
    nombre: 'Profesor',
    ruta: '/panel/docente',
    icono: Presentation,
    descripcion: 'Sus asignaciones, la planilla de notas y el observador.',
  },
  {
    clave: 'estudiante',
    nombre: 'Estudiante',
    ruta: '/panel/estudiante',
    icono: GraduationCap,
    descripcion: 'Sus calificaciones y el avance en cada periodo.',
  },
  {
    clave: 'acudiente',
    nombre: 'Acudiente',
    ruta: '/panel/acudiente',
    icono: HeartHandshake,
    descripcion: 'El seguimiento académico de la persona a su cargo.',
  },
  {
    clave: 'secretaria',
    nombre: 'Secretaría',
    ruta: '/panel/secretaria',
    icono: ClipboardList,
    descripcion: 'Admisiones, matrículas y certificados.',
  },
  {
    clave: 'admin',
    nombre: 'Administrador',
    ruta: '/panel/administrador',
    icono: Building2,
    descripcion: 'La gestión académica y administrativa del colegio.',
  },
  {
    clave: 'superadmin',
    nombre: 'Superadministrador',
    ruta: '/panel/admin',
    icono: ShieldCheck,
    descripcion: 'Usuarios, configuración y todos los módulos.',
  },
  {
    clave: 'contador',
    nombre: 'Contador',
    ruta: '/panel/contador',
    icono: Calculator,
    descripcion: 'Recibos, egresos y reportes financieros.',
  },
]

export function perfilPorClave(clave: string): Perfil | undefined {
  return PERFILES.find((perfil) => perfil.clave === clave)
}

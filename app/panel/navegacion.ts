import {
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardList,
  FileText,
  GraduationCap,
  Inbox,
  UsersRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { ClavePerfil } from '@/src/ui/perfiles'
import type { EnlaceDePerfil } from '@/src/ui/nav-perfil'

export interface Acceso {
  href?: string
  titulo: string
  descripcion: string
  icono: LucideIcon
}

export const NAV_POR_ROL: Record<ClavePerfil, EnlaceDePerfil[]> = {
  superadmin: [
    { href: '/panel/admin', etiqueta: 'Inicio', icono: 'inicio' },
    { href: '/panel/admin/cuentas', etiqueta: 'Cuentas', icono: 'cuentas' },
    { href: '/panel/admin/estudiantes', etiqueta: 'Estudiantes', icono: 'estudiantes' },
    { href: '/panel/admin/profesores', etiqueta: 'Profesores', icono: 'profesores' },
    { href: '/panel/admin/materias', etiqueta: 'Materias', icono: 'materias' },
    { href: '/panel/admin/boletines', etiqueta: 'Boletines', icono: 'documentos' },
    { href: '/panel/admin/finanzas', etiqueta: 'Finanzas', icono: 'finanzas' },
    { href: '/panel/admin/configuracion', etiqueta: 'Configuración', icono: 'configuracion' },
    { href: '/panel/admin/contenido', etiqueta: 'Contenido', icono: 'contenido' },
  ],
  docente: [{ href: '/panel/docente', etiqueta: 'Mis asignaciones', icono: 'inicio' }],
  estudiante: [
    { href: '/panel/estudiante', etiqueta: 'Inicio', icono: 'inicio' },
    { href: '/panel/estudiante/calificaciones', etiqueta: 'Mis calificaciones', icono: 'materias' },
  ],
  acudiente: [{ href: '/panel/acudiente', etiqueta: 'Inicio', icono: 'inicio' }],
  secretaria: [{ href: '/panel/secretaria', etiqueta: 'Inicio', icono: 'inicio' }],
  admin: [
    { href: '/panel/administrador', etiqueta: 'Inicio', icono: 'inicio' },
    { href: '/panel/administrador/cuentas', etiqueta: 'Cuentas', icono: 'cuentas' },
  ],
  contador: [{ href: '/panel/contador', etiqueta: 'Inicio', icono: 'inicio' }],
}

export const ACCESOS_PROXIMOS: Record<'acudiente' | 'secretaria' | 'admin' | 'contador', Acceso[]> =
  {
    acudiente: [
      {
        titulo: 'Calificaciones',
        descripcion: 'Las notas de la persona a su cargo en cada periodo.',
        icono: BookOpen,
      },
      {
        titulo: 'Observador',
        descripcion: 'Las anotaciones de convivencia y seguimiento.',
        icono: ClipboardList,
      },
      {
        titulo: 'Pagos',
        descripcion: 'Los recibos y el estado de cuenta.',
        icono: Wallet,
      },
    ],
    secretaria: [
      {
        titulo: 'Solicitudes de admisión',
        descripcion: 'Las inscripciones recibidas por el formulario en línea.',
        icono: Inbox,
      },
      {
        titulo: 'Matrículas',
        descripcion: 'Registrar y actualizar las matrículas del año activo.',
        icono: GraduationCap,
      },
      {
        titulo: 'Certificados',
        descripcion: 'Constancias y certificados de estudios.',
        icono: FileText,
      },
    ],
    admin: [
      {
        titulo: 'Gestión académica',
        descripcion: 'Cursos, docentes y plan de estudios.',
        icono: BookOpen,
      },
      {
        titulo: 'Comunidad',
        descripcion: 'Estudiantes, acudientes y profesores.',
        icono: UsersRound,
      },
      {
        titulo: 'Calendario',
        descripcion: 'Periodos y fechas del año lectivo.',
        icono: CalendarDays,
      },
      {
        titulo: 'Institución',
        descripcion: 'Datos institucionales y configuración.',
        icono: Building2,
      },
    ],
    contador: [
      {
        titulo: 'Recibos de caja',
        descripcion: 'Los ingresos registrados por concepto.',
        icono: Wallet,
      },
      {
        titulo: 'Egresos',
        descripcion: 'Los pagos registrados por categoría.',
        icono: FileText,
      },
      {
        titulo: 'Reportes',
        descripcion: 'Resúmenes financieros por periodo.',
        icono: CalendarDays,
      },
    ],
  }

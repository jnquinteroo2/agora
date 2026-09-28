import { eq } from 'drizzle-orm'
import {
  BookOpen,
  FileText,
  GraduationCap,
  Newspaper,
  Presentation,
  Settings,
  Wallet,
} from 'lucide-react'
import { db } from '@/src/datos/cliente'
import { anioLectivo } from '@/src/datos/esquema'
import { EncabezadoDeInicio, AccesosRapidos } from '@/src/ui/inicio-panel'
import { Insignia } from '@/src/ui/insignia'

const ACCESOS_RAPIDOS = [
  {
    href: '/panel/admin/estudiantes',
    titulo: 'Estudiantes',
    descripcion: 'Registrar, matricular y dar acceso.',
    icono: GraduationCap,
  },
  {
    href: '/panel/admin/profesores',
    titulo: 'Profesores',
    descripcion: 'Registrar docentes y asignar materias.',
    icono: Presentation,
  },
  {
    href: '/panel/admin/materias',
    titulo: 'Materias',
    descripcion: 'Año lectivo, cursos y plan de estudios.',
    icono: BookOpen,
  },
  {
    href: '/panel/admin/boletines',
    titulo: 'Boletines',
    descripcion: 'Generar boletines individuales o por curso.',
    icono: FileText,
  },
  {
    href: '/panel/admin/finanzas',
    titulo: 'Finanzas',
    descripcion: 'Recibos de caja y egresos.',
    icono: Wallet,
  },
  {
    href: '/panel/admin/configuracion',
    titulo: 'Configuración',
    descripcion: 'Datos institucionales y catálogos.',
    icono: Settings,
  },
  {
    href: '/panel/admin/contenido',
    titulo: 'Contenido',
    descripcion: 'Noticias, álbumes y páginas del sitio.',
    icono: Newspaper,
  },
]

export default async function InicioAdmin() {
  const [anioActivo] = await db
    .select()
    .from(anioLectivo)
    .where(eq(anioLectivo.activo, true))
    .limit(1)

  return (
    <div className="flex flex-col gap-10">
      <EncabezadoDeInicio
        perfil="Superadministrador"
        descripcion={
          anioActivo
            ? 'Todos los módulos de la plataforma, en un solo lugar.'
            : 'Active un año lectivo en Materias para empezar a matricular estudiantes y asignar docentes.'
        }
        extra={
          <p className="flex items-center gap-2 text-nota text-texto-secundario">
            Año lectivo activo:
            {anioActivo ? (
              <Insignia tono="exito">
                <span className="font-mono font-tnum">{anioActivo.nombre}</span>
              </Insignia>
            ) : (
              <Insignia tono="alerta">Ninguno configurado</Insignia>
            )}
          </p>
        }
      />
      <AccesosRapidos accesos={ACCESOS_RAPIDOS} />
    </div>
  )
}

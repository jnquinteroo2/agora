import { eq } from 'drizzle-orm'
import type { Route } from 'next'
import Link from 'next/link'
import { db } from '@/src/datos/cliente'
import { anioLectivo } from '@/src/datos/esquema'
import { tarjeta } from '@/src/ui/estilos'

const ACCESOS_RAPIDOS: Array<{ href: string; etiqueta: string; detalle: string }> = [
  { href: '/panel/admin/estudiantes', etiqueta: 'Estudiantes', detalle: 'Registrar y matricular' },
  { href: '/panel/admin/profesores', etiqueta: 'Profesores', detalle: 'Registrar y asignar materias' },
  { href: '/panel/admin/materias', etiqueta: 'Materias', detalle: 'Año lectivo, cursos, plan de estudios' },
  { href: '/panel/admin/boletines', etiqueta: 'Boletines', detalle: 'Individual o por curso' },
  { href: '/panel/admin/finanzas', etiqueta: 'Finanzas', detalle: 'Recibos e ingresos/egresos' },
  { href: '/panel/admin/configuracion', etiqueta: 'Configuración', detalle: 'Institución y catálogos' },
]

export default async function InicioAdmin() {
  const [anioActivo] = await db.select().from(anioLectivo).where(eq(anioLectivo.activo, true)).limit(1)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl">Panel de administración</h1>
        <p className="text-panel-secundario">
          Año lectivo activo: {anioActivo ? anioActivo.nombre : 'ninguno configurado'}
        </p>
      </div>

      {!anioActivo && (
        <p className="text-sm text-panel-secundario">
          Active un año lectivo en Materias para empezar a matricular estudiantes y asignar docentes.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ACCESOS_RAPIDOS.map((a) => (
          <Link key={a.href} href={a.href as Route} className={`${tarjeta} block hover:border-panel-secundario`}>
            <p className="font-display text-lg">{a.etiqueta}</p>
            <p className="text-sm text-panel-secundario">{a.detalle}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

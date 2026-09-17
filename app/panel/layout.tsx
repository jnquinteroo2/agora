import { redirect } from 'next/navigation'
import type { Route } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { obtenerUsuarioActual } from '@/src/auth/sesion'
import { CerrarSesionBoton } from './cerrar-sesion-boton'

const NAV_POR_ROL: Record<string, Array<{ href: string; etiqueta: string }>> = {
  superadmin: [
    { href: '/panel/admin', etiqueta: 'Inicio' },
    { href: '/panel/admin/estudiantes', etiqueta: 'Estudiantes' },
    { href: '/panel/admin/profesores', etiqueta: 'Profesores' },
    { href: '/panel/admin/materias', etiqueta: 'Materias' },
    { href: '/panel/admin/boletines', etiqueta: 'Boletines' },
    { href: '/panel/admin/finanzas', etiqueta: 'Finanzas' },
    { href: '/panel/admin/configuracion', etiqueta: 'Configuración' },
    { href: '/panel/admin/contenido', etiqueta: 'Contenido' },
  ],
  docente: [
    { href: '/panel/docente', etiqueta: 'Inicio' },
    { href: '/panel/docente/planilla', etiqueta: 'Planilla de notas' },
  ],
  estudiante: [
    { href: '/panel/estudiante', etiqueta: 'Inicio' },
    { href: '/panel/estudiante/calificaciones', etiqueta: 'Mis calificaciones' },
  ],
}

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const usuario = await obtenerUsuarioActual()
  if (!usuario || !usuario.activo) {
    redirect('/login')
  }

  const nav = NAV_POR_ROL[usuario.rol] ?? []

  return (
    <div className="min-h-screen bg-panel-fondo text-panel-texto">
      <header className="flex items-center justify-between border-b border-panel-borde px-6 py-3">
        <div className="flex items-center gap-3">
          <Image src="/marca/favicon-32.png" alt="" width={28} height={28} />
          <span className="font-display text-lg">Colegio Ágora</span>
        </div>
        <nav className="flex items-center gap-5 text-sm">
          {nav.map((item) => (
            <Link key={item.href} href={item.href as Route} className="text-panel-secundario hover:text-panel-texto">
              {item.etiqueta}
            </Link>
          ))}
          <span className="text-panel-secundario">{usuario.correo}</span>
          <CerrarSesionBoton />
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  )
}

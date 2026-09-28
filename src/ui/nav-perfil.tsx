'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { usePathname } from 'next/navigation'
import {
  BookOpen,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Newspaper,
  Presentation,
  Settings,
  UserCog,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { cn } from './cn'

const ICONOS = {
  inicio: LayoutDashboard,
  estudiantes: GraduationCap,
  profesores: Presentation,
  materias: BookOpen,
  documentos: FileText,
  finanzas: Wallet,
  configuracion: Settings,
  contenido: Newspaper,
  cuentas: UserCog,
} satisfies Record<string, LucideIcon>

export type NombreIcono = keyof typeof ICONOS

export interface EnlaceDePerfil {
  href: string
  etiqueta: string
  icono?: NombreIcono
}

function estaActivo(rutaActual: string, href: string, esInicio: boolean): boolean {
  if (esInicio) return rutaActual === href
  return rutaActual === href || rutaActual.startsWith(`${href}/`)
}

export function NavPerfil({
  enlaces,
  etiqueta,
  alNavegar,
  className,
}: {
  enlaces: EnlaceDePerfil[]
  etiqueta: string
  alNavegar?: () => void
  className?: string
}) {
  const rutaActual = usePathname()

  return (
    <nav aria-label={etiqueta} className={className}>
      <ul className="flex flex-col gap-0.5">
        {enlaces.map((enlace, indice) => {
          const activo = estaActivo(rutaActual, enlace.href, indice === 0)
          const Icono = enlace.icono ? ICONOS[enlace.icono] : null
          return (
            <li key={enlace.href}>
              <Link
                href={enlace.href as Route}
                onClick={alNavegar}
                aria-current={activo ? 'page' : undefined}
                className={cn(
                  'transicion-ui flex min-h-11 items-center gap-3 rounded-control border px-3 text-nota',
                  activo
                    ? 'border-borde font-semibold text-texto shadow-sutil'
                    : 'border-transparent text-texto-secundario hover:border-borde hover:text-texto'
                )}
              >
                {Icono ? (
                  <Icono
                    aria-hidden="true"
                    className={cn('size-[1.125rem] shrink-0', activo ? 'text-acento-texto' : '')}
                    strokeWidth={1.75}
                  />
                ) : null}
                <span>{enlace.etiqueta}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

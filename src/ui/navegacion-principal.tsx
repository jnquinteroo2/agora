'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { usePathname } from 'next/navigation'
import type { EnlaceSitio } from './navegacion'
import { cn } from './cn'

export function NavegacionPrincipal({
  enlaces,
  className,
}: {
  enlaces: EnlaceSitio[]
  className?: string
}) {
  const rutaActual = usePathname()

  return (
    <nav aria-label="Navegación principal" className={className}>
      <ul className="flex items-center gap-1">
        {enlaces.map((enlace) => {
          const activo = rutaActual === enlace.href || rutaActual.startsWith(`${enlace.href}/`)
          return (
            <li key={enlace.href}>
              <Link
                href={enlace.href as Route}
                aria-current={activo ? 'page' : undefined}
                className={cn(
                  'transicion-ui inline-flex h-9 items-center rounded-control px-2.5 text-nota underline-offset-[6px]',
                  activo
                    ? 'font-semibold text-texto underline decoration-acento-texto decoration-2'
                    : 'text-texto-secundario hover:text-texto hover:underline hover:decoration-borde-control'
                )}
              >
                {enlace.etiqueta}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

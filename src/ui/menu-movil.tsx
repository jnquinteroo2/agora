'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Route } from 'next'
import { usePathname } from 'next/navigation'
import * as Dialogo from '@radix-ui/react-dialog'
import { Menu, X } from 'lucide-react'
import { Greca } from './greca'
import { cn } from './cn'

export interface EnlaceNavegacion {
  href: string
  etiqueta: string
}

export function MenuMovil({
  enlaces,
  nombreColegio,
}: {
  enlaces: EnlaceNavegacion[]
  nombreColegio: string
}) {
  const [abierto, setAbierto] = useState(false)
  const rutaActual = usePathname()

  useEffect(() => {
    setAbierto(false)
  }, [rutaActual])

  return (
    <Dialogo.Root open={abierto} onOpenChange={setAbierto}>
      <Dialogo.Trigger
        className="transicion-ui -mr-2 inline-flex h-11 w-11 items-center justify-center rounded-sm text-tinta active:scale-[0.96] lg:hidden"
        aria-label="Abrir el menú de navegación"
      >
        <Menu aria-hidden="true" size={22} strokeWidth={1.5} />
      </Dialogo.Trigger>

      <Dialogo.Portal>
        <Dialogo.Overlay className="velo fixed inset-0 z-[var(--capa-velo)] bg-tinta/40 lg:hidden" />
        <Dialogo.Content
          className={cn(
            'panel-lateral fixed inset-y-0 right-0 z-[var(--capa-dialogo)] flex w-full flex-col bg-hueso sm:max-w-sm lg:hidden'
          )}
        >
          <Dialogo.Title className="sr-only">Navegación de {nombreColegio}</Dialogo.Title>
          <Dialogo.Description className="sr-only">
            Secciones del sitio público y acceso al panel institucional.
          </Dialogo.Description>

          <div className="flex items-center justify-between border-b border-niebla px-margen py-4">
            <span className="versalitas text-menudo text-piedra">Navegación</span>
            <Dialogo.Close
              className="transicion-ui -mr-2 inline-flex h-11 w-11 items-center justify-center rounded-sm text-tinta active:scale-[0.96]"
              aria-label="Cerrar el menú"
            >
              <X aria-hidden="true" size={22} strokeWidth={1.5} />
            </Dialogo.Close>
          </div>

          <nav
            aria-label="Navegación principal"
            className="flex-1 overflow-y-auto overscroll-contain px-margen py-6"
          >
            <ul className="flex flex-col">
              {enlaces.map((enlace) => {
                const activo = rutaActual === enlace.href
                return (
                  <li key={enlace.href} className="border-b border-niebla/70">
                    <Link
                      href={enlace.href as Route}
                      aria-current={activo ? 'page' : undefined}
                      className={cn(
                        'transicion-ui block py-3 font-display text-rubro',
                        activo ? 'text-carmin' : 'text-tinta'
                      )}
                    >
                      {enlace.etiqueta}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          <div className="flex flex-col gap-4 border-t border-niebla px-margen py-6">
            <Greca extension="sello" tono="laurel" />
            <Link
              href="/login"
              className="transicion-ui inline-flex h-11 items-center justify-center rounded-sm border border-tinta px-5 text-nota font-medium text-tinta active:scale-[0.98]"
            >
              Ingresar al panel
            </Link>
          </div>
        </Dialogo.Content>
      </Dialogo.Portal>
    </Dialogo.Root>
  )
}

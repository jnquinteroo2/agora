'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Route } from 'next'
import { usePathname } from 'next/navigation'
import * as Dialogo from '@radix-ui/react-dialog'
import { ArrowRight, Menu, X } from 'lucide-react'
import { estiloBoton } from './boton'
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

  return (
    <Dialogo.Root open={abierto} onOpenChange={setAbierto}>
      <Dialogo.Trigger
        className="presionable -mr-2 inline-flex size-11 items-center justify-center rounded-control border border-transparent text-texto hover:border-borde xl:hidden"
        aria-label="Abrir el menú de navegación"
      >
        <Menu aria-hidden="true" className="size-[1.375rem]" strokeWidth={1.75} />
      </Dialogo.Trigger>

      <Dialogo.Portal>
        <Dialogo.Overlay className="velo fixed inset-0 z-[var(--capa-velo)] bg-velo xl:hidden" />
        <Dialogo.Content className="cajon-derecho fixed inset-y-0 right-0 z-[var(--capa-dialogo)] flex w-full flex-col border-l border-borde bg-superficie text-texto shadow-flotante sm:max-w-sm xl:hidden">
          <Dialogo.Title className="sr-only">Navegación de {nombreColegio}</Dialogo.Title>
          <Dialogo.Description className="sr-only">
            Secciones del sitio público y acceso a la plataforma.
          </Dialogo.Description>

          <div className="flex h-16 items-center justify-between border-b border-borde px-margen">
            <span className="text-nota font-medium text-texto-secundario">Menú</span>
            <Dialogo.Close
              className="presionable -mr-2 inline-flex size-11 items-center justify-center rounded-control border border-transparent text-texto hover:border-borde"
              aria-label="Cerrar el menú"
            >
              <X aria-hidden="true" className="size-[1.375rem]" strokeWidth={1.75} />
            </Dialogo.Close>
          </div>

          <nav
            aria-label="Navegación principal"
            className="flex-1 overflow-y-auto overscroll-contain px-margen py-4"
          >
            <ul className="flex flex-col gap-0.5">
              {enlaces.map((enlace) => {
                const activo =
                  rutaActual === enlace.href || rutaActual.startsWith(`${enlace.href}/`)
                return (
                  <li key={enlace.href}>
                    <Link
                      href={enlace.href as Route}
                      aria-current={activo ? 'page' : undefined}
                      onClick={() => setAbierto(false)}
                      className={cn(
                        'transicion-ui flex min-h-12 items-center rounded-control border-l-2 px-3 font-titulo text-rubro',
                        activo
                          ? 'border-acento-texto font-medium text-texto'
                          : 'border-transparent text-texto hover:border-borde-control'
                      )}
                    >
                      {enlace.etiqueta}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          <div className="border-t border-borde px-margen py-5">
            <Link
              href="/login"
              onClick={() => setAbierto(false)}
              className={cn(estiloBoton({ tono: 'secundario', talla: 'lg' }), 'w-full')}
            >
              Ingresar a la plataforma
              <ArrowRight aria-hidden="true" strokeWidth={1.75} />
            </Link>
          </div>
        </Dialogo.Content>
      </Dialogo.Portal>
    </Dialogo.Root>
  )
}

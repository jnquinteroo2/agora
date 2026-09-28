'use client'

import { useState } from 'react'
import * as Dialogo from '@radix-ui/react-dialog'
import { Menu, X } from 'lucide-react'
import { NavPerfil, type EnlaceDePerfil } from './nav-perfil'

export function CajonPanel({
  enlaces,
  nombrePerfil,
  pie,
}: {
  enlaces: EnlaceDePerfil[]
  nombrePerfil: string
  pie: React.ReactNode
}) {
  const [abierto, setAbierto] = useState(false)

  return (
    <Dialogo.Root open={abierto} onOpenChange={setAbierto}>
      <Dialogo.Trigger
        className="presionable -ml-2 inline-flex size-11 items-center justify-center rounded-control border border-transparent text-texto hover:border-borde lg:hidden"
        aria-label="Abrir el menú del panel"
      >
        <Menu aria-hidden="true" className="size-[1.375rem]" strokeWidth={1.75} />
      </Dialogo.Trigger>
      <Dialogo.Portal>
        <Dialogo.Overlay className="velo fixed inset-0 z-[var(--capa-velo)] bg-velo lg:hidden" />
        <Dialogo.Content className="cajon-izquierdo fixed inset-y-0 left-0 z-[var(--capa-dialogo)] flex w-[min(20rem,86vw)] flex-col border-r border-borde bg-superficie text-texto shadow-flotante lg:hidden">
          <Dialogo.Title className="sr-only">Menú del panel</Dialogo.Title>
          <Dialogo.Description className="sr-only">
            Secciones disponibles para el perfil {nombrePerfil}.
          </Dialogo.Description>
          <div className="flex h-16 items-center justify-between border-b border-borde px-4">
            <span className="text-nota font-semibold text-texto">{nombrePerfil}</span>
            <Dialogo.Close
              className="presionable -mr-2 inline-flex size-11 items-center justify-center rounded-control border border-transparent text-texto hover:border-borde"
              aria-label="Cerrar el menú"
            >
              <X aria-hidden="true" className="size-[1.375rem]" strokeWidth={1.75} />
            </Dialogo.Close>
          </div>
          <NavPerfil
            enlaces={enlaces}
            etiqueta="Secciones del panel"
            alNavegar={() => setAbierto(false)}
            className="flex-1 overflow-y-auto overscroll-contain p-3"
          />
          <div className="border-t border-borde p-4">{pie}</div>
        </Dialogo.Content>
      </Dialogo.Portal>
    </Dialogo.Root>
  )
}

'use client'

import * as Primitivo from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from './cn'

export const Dialogo = Primitivo.Root
export const AbrirDialogo = Primitivo.Trigger
export const CerrarDialogo = Primitivo.Close

export function ContenidoDeDialogo({
  titulo,
  descripcion,
  className,
  children,
  ...resto
}: React.ComponentPropsWithoutRef<typeof Primitivo.Content> & {
  titulo: React.ReactNode
  descripcion?: React.ReactNode
}) {
  return (
    <Primitivo.Portal>
      <Primitivo.Overlay className="velo fixed inset-0 z-[var(--capa-velo)] bg-velo" />
      <Primitivo.Content
        className={cn(
          'dialogo fixed inset-0 z-[var(--capa-dialogo)] m-auto flex h-fit max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg flex-col gap-5 overflow-y-auto rounded-tarjeta border border-borde bg-superficie-elevada p-6 text-texto shadow-flotante',
          className
        )}
        {...(descripcion ? {} : { 'aria-describedby': undefined })}
        {...resto}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <Primitivo.Title className="font-titulo text-rubro font-medium text-texto">
              {titulo}
            </Primitivo.Title>
            {descripcion ? (
              <Primitivo.Description className="text-nota text-texto-secundario">
                {descripcion}
              </Primitivo.Description>
            ) : null}
          </div>
          <Primitivo.Close
            aria-label="Cerrar"
            className="presionable -mt-1 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-control text-texto-secundario border border-transparent hover:border-borde hover:text-texto"
          >
            <X aria-hidden="true" className="size-5" strokeWidth={1.75} />
          </Primitivo.Close>
        </div>
        {children}
      </Primitivo.Content>
    </Primitivo.Portal>
  )
}

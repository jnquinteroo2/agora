'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import * as Dialogo from '@radix-ui/react-dialog'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

export interface FotoVisor {
  id: string
  archivoId: string
  alt: string
}

const botonVisor =
  'transicion-ui inline-flex h-11 w-11 items-center justify-center rounded-sm border border-hueso/30 text-hueso hover:border-hueso hover:bg-hueso hover:text-tinta active:scale-[0.96] disabled:pointer-events-none disabled:opacity-30'

export function VisorGaleria({ titulo, fotos }: { titulo: string; fotos: FotoVisor[] }) {
  const [abierta, setAbierta] = useState<number | null>(null)
  const miniaturas = useRef<(HTMLButtonElement | null)[]>([])
  const ultimaVista = useRef(0)
  const total = fotos.length
  const actual = abierta === null ? null : fotos[abierta]

  useEffect(() => {
    if (abierta !== null) ultimaVista.current = abierta
  }, [abierta])

  function mover(paso: number) {
    setAbierta((indice) => (indice === null ? indice : (indice + paso + total) % total))
  }

  return (
    <>
      <ul className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3">
        {fotos.map((foto, indice) => (
          <li key={foto.id}>
            <button
              type="button"
              ref={(el) => {
                miniaturas.current[indice] = el
              }}
              onClick={() => setAbierta(indice)}
              aria-haspopup="dialog"
              aria-label={`Ampliar fotografía ${indice + 1} de ${total}: ${foto.alt}`}
              className="group relative block aspect-[3/2] w-full cursor-zoom-in overflow-hidden bg-niebla"
            >
              <Image
                src={`/api/galeria/imagen/${foto.archivoId}`}
                alt=""
                fill
                sizes="(max-width: 768px) 50vw, 28rem"
                className="object-cover transition-transform duration-[var(--duration-slow)] ease-[var(--ease-out)] group-hover:scale-[1.02] motion-reduce:transition-none"
              />
            </button>
          </li>
        ))}
      </ul>

      <Dialogo.Root open={abierta !== null} onOpenChange={(abrir) => !abrir && setAbierta(null)}>
        <Dialogo.Portal>
          <Dialogo.Overlay className="velo fixed inset-0 z-[var(--capa-velo)] bg-tinta/95" />
          <Dialogo.Content
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') {
                e.preventDefault()
                mover(1)
              }
              if (e.key === 'ArrowLeft') {
                e.preventDefault()
                mover(-1)
              }
            }}
            onCloseAutoFocus={(e) => {
              e.preventDefault()
              miniaturas.current[ultimaVista.current]?.focus()
            }}
            className="velo fixed inset-0 z-[var(--capa-dialogo)] flex flex-col text-hueso"
          >
            <div className="flex items-center justify-between gap-4 px-margen py-3">
              <div className="flex min-w-0 flex-col">
                <Dialogo.Title className="truncate font-display text-rubro">{titulo}</Dialogo.Title>
                <p className="font-mono font-tnum text-menudo text-niebla" aria-live="polite">
                  Fotografía {abierta === null ? 0 : abierta + 1} de {total}
                </p>
              </div>
              <Dialogo.Close className={botonVisor} aria-label="Cerrar el visor">
                <X aria-hidden="true" size={20} strokeWidth={1.5} />
              </Dialogo.Close>
            </div>

            <div className="relative min-h-0 flex-1">
              {actual ? (
                <Image
                  key={actual.id}
                  src={`/api/galeria/imagen/${actual.archivoId}`}
                  alt={actual.alt}
                  fill
                  sizes="100vw"
                  className="aparece object-contain"
                />
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-4 px-margen py-4">
              <button
                type="button"
                className={botonVisor}
                onClick={() => mover(-1)}
                disabled={total < 2}
                aria-label="Fotografía anterior"
              >
                <ChevronLeft aria-hidden="true" size={20} strokeWidth={1.5} />
              </button>
              <Dialogo.Description className="prosa max-w-medida text-center text-nota text-niebla">
                {actual?.alt}
              </Dialogo.Description>
              <button
                type="button"
                className={botonVisor}
                onClick={() => mover(1)}
                disabled={total < 2}
                aria-label="Fotografía siguiente"
              >
                <ChevronRight aria-hidden="true" size={20} strokeWidth={1.5} />
              </button>
            </div>
          </Dialogo.Content>
        </Dialogo.Portal>
      </Dialogo.Root>
    </>
  )
}

'use client'

import { RotateCcw, TriangleAlert } from 'lucide-react'
import { Contenedor } from '@/src/ui/contenedor'
import { Boton, EnlaceSubrayado } from '@/src/ui/boton'

export default function PaginaDeError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-superficie text-texto">
      <main id="contenido" className="flex flex-1 items-center py-aire">
        <Contenedor ancho="amplio" className="flex max-w-3xl flex-col items-start gap-6">
          <span
            aria-hidden="true"
            className="inline-flex size-12 items-center justify-center rounded-control border border-borde text-alerta"
          >
            <TriangleAlert className="size-6" strokeWidth={1.75} />
          </span>
          <h1 className="equilibrado font-titulo text-portada font-medium text-texto">
            No se pudo cargar esta página
          </h1>
          <p className="prosa max-w-medida text-guia text-texto-secundario">
            Ocurrió un problema al preparar la página. Puede intentarlo de nuevo en unos segundos.
            Si el problema continúa, vuelva más tarde.
          </p>
          {error.digest ? (
            <p className="text-nota text-texto-secundario">
              Código de referencia:{' '}
              <span className="font-mono font-tnum text-texto">{error.digest}</span>
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-6 pt-2">
            <Boton type="button" tono="primario" talla="lg" onClick={() => reset()}>
              <RotateCcw aria-hidden="true" strokeWidth={1.75} />
              Intentar de nuevo
            </Boton>
            <EnlaceSubrayado href="/inicio" className="text-nota">
              Ir al inicio
            </EnlaceSubrayado>
          </div>
        </Contenedor>
      </main>
    </div>
  )
}
